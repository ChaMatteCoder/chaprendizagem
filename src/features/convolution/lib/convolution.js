export function validateImage(image) {
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 || image.data?.length !== image.width * image.height * 4) {
    throw new Error('A imagem precisa ter dimensões válidas e quatro canais RGBA por pixel.');
  }
}

export function validateOptions(options) {
  const size = options?.kernel?.length;
  if (![3, 5].includes(size) || !options.kernel.every(row => row.length === size && row.every(value => Number.isFinite(value) && Math.abs(value) <= 100))) {
    throw new Error('Preencha o kernel 3 × 3 ou 5 × 5 com valores de −100 a 100.');
  }
  if (!Number.isFinite(options.divisor) || Math.abs(options.divisor) < 0.000001) throw new Error('O divisor deve ser um número diferente de zero (módulo mínimo de 0,000001).');
  if (!Number.isFinite(options.bias) || Math.abs(options.bias) > 255) throw new Error('O deslocamento deve estar entre −255 e 255.');
  if (!['reflect', 'replicate', 'zero'].includes(options.border)) throw new Error('Escolha um tratamento de borda válido.');
}

export function borderCoordinate(coordinate, length, border) {
  if (coordinate >= 0 && coordinate < length) return coordinate;
  if (border === 'zero') return -1;
  if (border === 'replicate') return Math.max(0, Math.min(length - 1, coordinate));
  const period = length * 2;
  const position = ((coordinate % period) + period) % period;
  return position < length ? position : period - 1 - position;
}

function readChannel(image, x, y, channel, border) {
  const px = borderCoordinate(x, image.width, border);
  const py = borderCoordinate(y, image.height, border);
  return px < 0 || py < 0 ? 0 : image.data[(py * image.width + px) * 4 + channel];
}

export function displayResponse(sum, options) {
  const scaled = sum / options.divisor;
  const adjusted = (options.absolute ? Math.abs(scaled) : scaled) + options.bias;
  return { scaled, adjusted, value: Math.round(Math.max(0, Math.min(255, adjusted))) };
}

export function toGrayscale(image) {
  validateImage(image);
  const data = new Uint8ClampedArray(image.data.length);
  for (let index = 0; index < data.length; index += 4) {
    // Luminância didática sobre os canais sRGB de 8 bits (sem linearização).
    const gray = Math.round(0.2126 * image.data[index] + 0.7152 * image.data[index + 1] + 0.0722 * image.data[index + 2]);
    data[index] = gray; data[index + 1] = gray; data[index + 2] = gray; data[index + 3] = image.data[index + 3];
  }
  return { width: image.width, height: image.height, data };
}

export function convolveImage(image, options, { grayscale = false } = {}) {
  validateImage(image); validateOptions(options);
  const { width, height } = image;
  const size = options.kernel.length;
  const radius = Math.floor(size / 2);
  const data = new Uint8ClampedArray(image.data.length);
  const weights = options.kernel.flat().reverse(); // Convolução: kernel girado 180°.
  // Coordenadas de borda e pesos são invariantes entre os canais e as linhas.
  const columns = Array.from({ length: size }, (_, kx) =>
    Int32Array.from({ length: width }, (_, x) => borderCoordinate(x + kx - radius, width, options.border)));
  const rows = Array.from({ length: size }, (_, ky) =>
    Int32Array.from({ length: height }, (_, y) => borderCoordinate(y + ky - radius, height, options.border)));
  const terms = weights.flatMap((weight, index) => weight === 0 ? [] : [{
    weight, columns: columns[index % size], rows: rows[Math.floor(index / size)],
  }]);
  const channels = grayscale ? 1 : 3;
  const input = image.data;
  const { divisor, absolute, bias } = options;
  let min = Infinity; let max = -Infinity; let clipped = 0; let changed = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      let red = 0; let green = 0; let blue = 0;
      for (let index = 0; index < terms.length; index += 1) {
        const term = terms[index];
        const px = term.columns[x]; const py = term.rows[y];
        if (px < 0 || py < 0) continue;
        const source = (py * width + px) * 4;
        red += input[source] * term.weight;
        if (!grayscale) {
          green += input[source + 1] * term.weight;
          blue += input[source + 2] * term.weight;
        }
      }
      let pixelChanged = false;
      for (let channel = 0; channel < channels; channel += 1) {
        const scaled = (channel === 0 ? red : channel === 1 ? green : blue) / divisor;
        const adjusted = (absolute ? Math.abs(scaled) : scaled) + bias;
        min = Math.min(min, adjusted); max = Math.max(max, adjusted);
        if (adjusted < 0 || adjusted > 255) clipped += 1;
        const value = Math.round(Math.max(0, Math.min(255, adjusted)));
        data[offset + channel] = value;
        if (value !== input[offset + channel]) pixelChanged = true;
      }
      if (grayscale) { data[offset + 1] = data[offset]; data[offset + 2] = data[offset]; }
      data[offset + 3] = input[offset + 3];
      if (pixelChanged) changed += 1;
    }
  }
  return { width, height, data, stats: { min, max, clipped, channelCount: width * height * (grayscale ? 1 : 3), changed, pixelCount: width * height } };
}

export function inspectPixel(image, options, x, y, channel = 0) {
  validateImage(image); validateOptions(options);
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= image.width || y >= image.height || ![0, 1, 2].includes(channel)) throw new Error('Selecione um pixel e um canal válidos.');
  const size = options.kernel.length;
  const radius = Math.floor(size / 2);
  const terms = [];
  let sum = 0;
  for (let ky = 0; ky < size; ky += 1) {
    for (let kx = 0; kx < size; kx += 1) {
      const sourceX = x + kx - radius; const sourceY = y + ky - radius;
      const value = readChannel(image, sourceX, sourceY, channel, options.border);
      const weight = options.kernel[size - 1 - ky][size - 1 - kx];
      terms.push({ value, weight, product: value * weight, sourceX, sourceY, padded: sourceX < 0 || sourceY < 0 || sourceX >= image.width || sourceY >= image.height });
      sum += value * weight;
    }
  }
  return { terms, sum, ...displayResponse(sum, options) };
}
