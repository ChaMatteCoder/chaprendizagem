export const MAX_IMAGE_SIDE = 640;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40000000;

// Lê somente o cabeçalho: um arquivo pequeno também pode declarar uma imagem enorme.
async function validateUploadDimensions(file) {
  const buffer = await file.slice(0, 1024 * 1024).arrayBuffer();
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const text = (offset, length) => String.fromCharCode(...bytes.subarray(offset, offset + length));
  let width; let height;
  if (file.type === 'image/png' && bytes.length >= 24 && text(1, 3) === 'PNG' && text(12, 4) === 'IHDR') {
    width = view.getUint32(16); height = view.getUint32(20);
  } else if (file.type === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 218 || marker === 217) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) && length >= 8) {
        height = view.getUint16(offset + 3); width = view.getUint16(offset + 5);
        break;
      }
      offset += length;
    }
  } else if (file.type === 'image/webp' && bytes.length >= 30 && text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
    const kind = text(12, 4);
    if (kind === 'VP8X') {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (kind === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      width = view.getUint16(26, true) & 16383; height = view.getUint16(28, true) & 16383;
    } else if (kind === 'VP8L' && bytes[20] === 47) {
      const bits = view.getUint32(21, true);
      width = (bits & 16383) + 1; height = ((bits >>> 14) & 16383) + 1;
    }
  }
  if (!width || !height) throw new Error('Não foi possível ler as dimensões da imagem.');
  if (width * height > MAX_IMAGE_PIXELS) throw new Error('Use uma imagem com até 40 megapixels.');
}

export function fitImageDimensions(width, height, maxSide = MAX_IMAGE_SIDE) {
  if (![width, height, maxSide].every(value => Number.isFinite(value) && value > 0)) throw new Error('As dimensões da imagem precisam ser positivas.');
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export async function decodeImage(blob, name, { signal } = {}) {
  signal?.throwIfAborted();
  const url = URL.createObjectURL(blob);
  const image = new Image();
  let canvas;
  const abort = () => { image.src = ''; };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    image.src = url;
    await image.decode();
    signal?.throwIfAborted();
    if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) throw new Error('Use uma imagem com até 40 megapixels.');
    const dimensions = fitImageDimensions(image.naturalWidth, image.naturalHeight);
    canvas = document.createElement('canvas');
    canvas.width = dimensions.width; canvas.height = dimensions.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Não foi possível criar a imagem neste navegador. Tente novamente.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { ...dimensions, data: context.getImageData(0, 0, canvas.width, canvas.height).data, name, originalWidth: image.naturalWidth, originalHeight: image.naturalHeight };
  } catch (error) {
    signal?.throwIfAborted();
    throw error;
  } finally {
    signal?.removeEventListener('abort', abort);
    image.src = '';
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    URL.revokeObjectURL(url);
  }
}

export async function loadSampleImage(sample, { signal } = {}) {
  const response = await fetch(sample.url, { signal });
  if (!response.ok) throw new Error('Não foi possível carregar o exemplo. Tente novamente.');
  return decodeImage(await response.blob(), sample.name, { signal });
}

export async function loadUploadedImage(file, { signal } = {}) {
  signal?.throwIfAborted();
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Escolha uma imagem PNG, JPEG ou WebP.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('A imagem deve ter até 20 MB.');
  try {
    await validateUploadDimensions(file);
    return await decodeImage(file, file.name, { signal });
  } catch (error) {
    signal?.throwIfAborted();
    throw new Error(error.message.includes('megapixels') ? error.message : 'Não foi possível ler a imagem. Escolha outro arquivo PNG, JPEG ou WebP.');
  }
}

export function downloadImage(image, filename) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  canvas.getContext('2d').putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
