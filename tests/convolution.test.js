import assert from 'node:assert/strict';
import test from 'node:test';
import { borderCoordinate, convolveImage, inspectPixel, toGrayscale, validateOptions } from '../src/features/convolution/lib/convolution.js';
import { kernelPresets, optionsFromPreset } from '../src/features/convolution/data/kernels.js';
import { fitImageDimensions, loadUploadedImage } from '../src/features/convolution/lib/imageIO.js';
import { createConvolutionProcessor } from '../src/features/convolution/lib/convolutionProcessor.js';
import { createImageFrame, imageFrameMessage } from '../src/features/convolution/lib/imageFrame.js';

function grayscaleImage(rows) {
  return { width: rows[0].length, height: rows.length, data: new Uint8ClampedArray(rows.flatMap(row => row.flatMap(value => [value, value, value, 255]))) };
}
function redValues(image) { return Array.from(image.data).filter((_, index) => index % 4 === 0); }
function preset(id) { return optionsFromPreset(kernelPresets.find(item => item.id === id)); }

test('frames preservam pixels e metadados sem expor o buffer à enumeração de props', () => {
  const image = { ...grayscaleImage([[10, 30], [80, 90]]), name: 'Exemplo', originalWidth: 2, originalHeight: 2 };
  const frame = createImageFrame(image);
  assert.equal(frame.data, image.data);
  assert.equal(createImageFrame(frame), frame);
  assert.equal(frame.name, 'Exemplo');
  assert.equal(frame.originalWidth, 2);
  assert.equal(Object.keys(frame).includes('data'), false);
  assert.equal(JSON.stringify(frame).includes('data'), false);
  assert.deepEqual([...convolveImage(frame, preset('identity')).data], [...image.data]);
  assert.equal(inspectPixel(frame, preset('identity'), 1, 1).value, 90);
});

test('mensagem de um frame inclui os pixels no structured clone sem copiá-los na interface', () => {
  const image = grayscaleImage([[15, 60]]);
  const frame = createImageFrame(image);
  const message = imageFrameMessage(frame);
  assert.equal(message.data, frame.data);
  assert.deepEqual([...structuredClone(message).data], [...image.data]);
  assert.equal(imageFrameMessage(image), image);
  assert.equal(imageFrameMessage(undefined), undefined);
});

test('processor envia frames RGB e cinza completos somente na primeira aplicação', async () => {
  const { create, workers } = workerFactory();
  const processor = createConvolutionProcessor(create);
  const image = createImageFrame(grayscaleImage([[80]]));
  const gray = createImageFrame(toGrayscale(image));
  const pending = processor.run(image, gray, preset('identity'));
  const payload = structuredClone(workers[0].messages[0]);
  assert.deepEqual([...payload.image.data], [80, 80, 80, 255]);
  assert.deepEqual([...payload.grayInput.data], [80, 80, 80, 255]);
  workers[0].respond({ duration: 1 });
  await pending;
  const next = processor.run(image, gray, preset('mean'));
  assert.equal(workers[0].messages[1].image, undefined);
  workers[0].respond({ duration: 1 });
  await next;
  processor.dispose();
});

test('convolução assimétrica reproduz o exemplo numérico do SciPy, com preenchimento zero', () => {
  // Fixture publicada em scipy.ndimage.convolve: evita confundir convolução com correlação.
  const image = grayscaleImage([[1, 2, 0, 0], [5, 3, 0, 4], [0, 0, 0, 7], [9, 3, 0, 0]]);
  const options = { ...preset('identity'), kernel: [[1, 1, 1], [1, 1, 0], [1, 0, 0]], border: 'zero' };
  const result = convolveImage(image, options);
  assert.deepEqual(redValues(result), [11, 10, 7, 4, 10, 3, 11, 11, 15, 12, 14, 7, 12, 3, 7, 0]);
});

test('kernel direcional gira 180°; módulo e deslocamento vêm antes da exibição', () => {
  const image = grayscaleImage([[0, 10, 20]]);
  const options = { ...preset('identity'), kernel: [[0, 0, 0], [-1, 0, 1], [0, 0, 0]] };
  const trace = inspectPixel(image, options, 1, 0);
  assert.equal(trace.sum, -20);
  assert.equal(trace.value, 0);
  assert.equal(inspectPixel(image, { ...options, absolute: true }, 1, 0).value, 20);
  assert.equal(inspectPixel(image, { ...options, absolute: true, divisor: 2, bias: 128 }, 1, 0).value, 138);
});

test('identidade preserva dimensões, canais RGB e alfa, sem modificar a entrada', () => {
  const image = { width: 2, height: 1, data: new Uint8ClampedArray([7, 90, 205, 37, 250, 120, 19, 255]) };
  const before = [...image.data];
  const result = convolveImage(image, preset('identity'));
  assert.deepEqual([...result.data], before);
  assert.deepEqual([...image.data], before);
  assert.equal(result.width, 2); assert.equal(result.height, 1);
  assert.equal(result.stats.changed, 0); assert.equal(result.stats.clipped, 0);
});

test('RGB é filtrado por canal e estatísticas contam saturação anterior ao arredondamento', () => {
  const image = { width: 1, height: 1, data: new Uint8ClampedArray([30, 200, 10, 128]) };
  const options = { ...preset('identity'), kernel: [[0, 0, 0], [0, 2, 0], [0, 0, 0]] };
  const result = convolveImage(image, options);
  assert.deepEqual([...result.data], [60, 255, 20, 128]);
  assert.deepEqual(result.stats, { min: 20, max: 400, clipped: 1, channelCount: 3, changed: 1, pixelCount: 1 });
});

test('cinza usa pesos de luminância e mantém um único canal lógico', () => {
  const image = { width: 3, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 200, 0, 0, 255, 127]) };
  const gray = toGrayscale(image);
  assert.deepEqual([...gray.data], [54, 54, 54, 255, 182, 182, 182, 200, 18, 18, 18, 127]);
  const result = convolveImage(gray, preset('identity'), { grayscale: true });
  assert.deepEqual([...result.data], [...gray.data]);
  assert.equal(result.stats.channelCount, 3);
});

test('refletir, repetir e zero diferem em janelas 5 × 5 sobre imagens pequenas', () => {
  const image = grayscaleImage([[10, 40]]);
  const base = { ...preset('identity'), kernel: Array.from({ length: 5 }, () => Array(5).fill(1)), divisor: 25 };
  assert.deepEqual(redValues(convolveImage(image, { ...base, border: 'reflect' })), [28, 22]);
  assert.deepEqual(redValues(convolveImage(image, { ...base, border: 'replicate' })), [22, 28]);
  assert.deepEqual(redValues(convolveImage(image, { ...base, border: 'zero' })), [2, 2]);
  assert.equal(borderCoordinate(-1, 4, 'reflect'), 0);
  assert.equal(borderCoordinate(-2, 4, 'reflect'), 1);
  assert.equal(borderCoordinate(4, 4, 'reflect'), 3);
  assert.equal(borderCoordinate(-8, 1, 'reflect'), 0);
});

test('média e gaussiano normalizados preservam uma imagem constante em bordas refletidas', () => {
  const image = grayscaleImage([[97, 97], [97, 97]]);
  for (const id of ['mean', 'gaussian']) {
    assert.deepEqual([...convolveImage(image, preset(id)).data], [...image.data]);
  }
});

test('inspeção coincide com cada pixel da saída nos presets, bordas e canais', () => {
  const image = { width: 3, height: 2, data: new Uint8ClampedArray([10, 20, 30, 255, 80, 50, 25, 255, 70, 190, 23, 255, 250, 40, 120, 255, 110, 60, 80, 255, 220, 200, 90, 255]) };
  for (const item of kernelPresets) {
    for (const border of ['reflect', 'replicate', 'zero']) {
      const options = { ...optionsFromPreset(item), border };
      const output = convolveImage(image, options);
      for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) for (let channel = 0; channel < 3; channel += 1) {
        const trace = inspectPixel(image, options, x, y, channel);
        assert.equal(trace.value, output.data[(y * image.width + x) * 4 + channel]);
        assert.equal(trace.sum, trace.terms.reduce((sum, term) => sum + term.product, 0));
      }
    }
  }
});

test('opções incompletas, divisor zero e coordenadas inválidas são rejeitados', () => {
  for (const options of [{ ...preset('mean'), divisor: 0 }, { ...preset('mean'), divisor: NaN }, { ...preset('mean'), bias: 256 }, { ...preset('mean'), kernel: [[1, 1], [1, 1]] }, { ...preset('mean'), kernel: [[1, NaN, 1], [1, 1, 1], [1, 1, 1]] }, { ...preset('mean'), border: 'invalid' }]) assert.throws(() => validateOptions(options));
  assert.throws(() => convolveImage({ width: 0, height: 1, data: [] }, preset('mean')));
  assert.throws(() => inspectPixel(grayscaleImage([[2]]), preset('mean'), 1, 0));
});

test('redimensionamento limita o maior lado e uploads inválidos falham antes da decodificação', async () => {
  assert.deepEqual(fitImageDimensions(1600, 1000), { width: 640, height: 400 });
  assert.deepEqual(fitImageDimensions(1, 10000), { width: 1, height: 640 });
  assert.deepEqual(fitImageDimensions(200, 100), { width: 200, height: 100 });
  await assert.rejects(loadUploadedImage({ type: 'text/plain', size: 10 }), /PNG/);
  await assert.rejects(loadUploadedImage({ type: 'image/png', size: 21 * 1024 * 1024 }), /20 MB/);
});

test('kernel 5 × 5 com pesos fracionários mantém a inspeção e estatísticas nos dois modos', () => {
  const image = { width: 4, height: 3, data: Uint8ClampedArray.from({ length: 48 }, (_, index) => (index * 37) % 256) };
  for (const border of ['reflect', 'replicate', 'zero']) {
    for (const grayscale of [false, true]) {
      const input = grayscale ? toGrayscale(image) : image;
      const options = { kernel: Array.from({ length: 5 }, (_, y) => Array.from({ length: 5 }, (_, x) => (y + x) % 3 === 0 ? 0 : (y - x) / 7)), border, divisor: -1.7, bias: 23.5, absolute: true };
      const output = convolveImage(input, options, { grayscale });
      let min = Infinity; let max = -Infinity; let clipped = 0; let changed = 0;
      for (let y = 0; y < input.height; y++) for (let x = 0; x < input.width; x++) {
        let pixelChanged = false;
        for (let channel = 0; channel < (grayscale ? 1 : 3); channel++) {
          const trace = inspectPixel(input, options, x, y, channel);
          assert.equal(output.data[(y * input.width + x) * 4 + channel], trace.value);
          min = Math.min(min, trace.adjusted); max = Math.max(max, trace.adjusted);
          if (trace.adjusted < 0 || trace.adjusted > 255) clipped++;
          if (trace.value !== input.data[(y * input.width + x) * 4 + channel]) pixelChanged = true;
        }
        if (pixelChanged) changed++;
      }
      assert.deepEqual(output.stats, { min, max, clipped, changed, channelCount: input.width * input.height * (grayscale ? 1 : 3), pixelCount: input.width * input.height });
    }
  }
});

test('worker reutiliza a entrada entre filtros e substitui o cache ao trocar a imagem', async () => {
  const { readFile } = await import('node:fs/promises');
  const { runInNewContext } = await import('node:vm');
  const source = await readFile(new URL('../src/features/convolution/lib/convolution.worker.js', import.meta.url), 'utf8');
  const messages = [];
  const self = { postMessage: (message, transfer) => messages.push(structuredClone(message, { transfer })) };
  runInNewContext(source.replace(/^import[^\n]+\n/, ''), { self, convolveImage, performance });
  const first = grayscaleImage([[10, 80], [30, 90]]);
  const second = grayscaleImage([[150, 220, 70]]);
  const runs = [
    { image: first, grayInput: toGrayscale(first), options: preset('sharpen') },
    { options: preset('mean') },
    { image: second, grayInput: toGrayscale(second), options: preset('sobel-x') },
    { options: preset('identity') },
  ];
  for (const [index, data] of runs.entries()) {
    self.onmessage({ data });
    const input = index < 2 ? first : second;
    assert.deepEqual(messages[index].color, convolveImage(input, data.options));
    assert.deepEqual(messages[index].gray, convolveImage(toGrayscale(input), data.options, { grayscale: true }));
  }
  assert.equal(messages.length, 4);
  assert.equal(first.data.length, 16);
  assert.equal(second.data.length, 12);
});

function workerFactory() {
  const workers = [];
  const create = () => {
    const worker = {
      messages: [], terminated: false,
      postMessage(message) { this.messages.push(message); },
      terminate() { this.terminated = true; },
      respond(data) { this.onmessage({ data }); },
    };
    workers.push(worker);
    return worker;
  };
  return { create, workers };
}

test('trocas consecutivas reutilizam um worker e enviam a imagem somente uma vez', async () => {
  const { create, workers } = workerFactory();
  const processor = createConvolutionProcessor(create);
  const image = grayscaleImage([[10, 80], [30, 90]]);
  const grayInput = toGrayscale(image);
  for (let index = 0; index < 50; index++) {
    const options = optionsFromPreset(kernelPresets[index % kernelPresets.length]);
    const pending = processor.run(image, grayInput, options);
    assert.equal(workers.length, 1);
    const worker = workers[0];
    assert.equal(worker.messages[index].image, index === 0 ? image : undefined);
    assert.equal(worker.messages[index].grayInput, index === 0 ? grayInput : undefined);
    const output = { color: convolveImage(image, options), gray: convolveImage(grayInput, options, { grayscale: true }) };
    worker.respond(output);
    assert.equal(await pending, output);
    assert.equal(worker.onmessage, null);
    assert.equal(worker.onerror, null);
    assert.equal(worker.onmessageerror, null);
    processor.cancel();
    assert.equal(worker.terminated, false);
  }
  processor.dispose();
  assert.equal(workers[0].terminated, true);
});

test('cancelamento interrompe o worker ativo e ignora mensagens antigas', async () => {
  const { create, workers } = workerFactory();
  const processor = createConvolutionProcessor(create);
  const image = grayscaleImage([[80]]);
  const grayInput = toGrayscale(image);
  const first = processor.run(image, grayInput, preset('mean'));
  const rejected = assert.rejects(first, { name: 'AbortError' });
  const staleMessage = workers[0].onmessage;
  processor.cancel();
  await rejected;
  assert.equal(workers[0].terminated, true);
  const second = processor.run(image, grayInput, preset('identity'));
  staleMessage({ data: { error: 'Resultado antigo' } });
  workers[1].respond({ duration: 1 });
  assert.deepEqual(await second, { duration: 1 });
  assert.equal(workers[1].messages[0].image, image);
  processor.dispose();
});

test('trocar imagem e sair da página liberam também o worker ocioso', async () => {
  const { create, workers } = workerFactory();
  const processor = createConvolutionProcessor(create);
  const first = grayscaleImage([[80]]);
  const second = grayscaleImage([[10, 20]]);
  const pending = processor.run(first, toGrayscale(first), preset('identity'));
  workers[0].respond({ duration: 1 });
  await pending;
  processor.cancel({ releaseInput: true });
  assert.equal(workers[0].terminated, true);
  const next = processor.run(second, toGrayscale(second), preset('mean'));
  assert.equal(workers[1].messages[0].image, second);
  const rejected = assert.rejects(next, { name: 'AbortError' });
  processor.dispose();
  await rejected;
  assert.equal(workers[1].terminated, true);
});

test('falhas de execução e de mensagens permitem aplicar novamente em um worker novo', async () => {
  for (const event of ['onerror', 'onmessageerror', 'error-result', 'postMessage']) {
    const { create, workers } = workerFactory();
    const processor = createConvolutionProcessor(() => {
      const worker = create();
      if (event === 'postMessage' && workers.length === 1) worker.postMessage = () => { throw new Error('Falha ao enviar'); };
      return worker;
    });
    const image = grayscaleImage([[80]]);
    const pending = processor.run(image, image, preset('identity'));
    const rejected = assert.rejects(pending);
    if (event === 'error-result') workers[0].respond({ error: 'Falha no cálculo' });
    else if (event !== 'postMessage') workers[0][event]();
    await rejected;
    assert.equal(workers[0].terminated, true);
    const retry = processor.run(image, image, preset('identity'));
    workers[1].respond({ duration: 1 });
    assert.deepEqual(await retry, { duration: 1 });
    processor.dispose();
  }
});

test('worker sem resposta expira e a aplicação seguinte recupera o processamento', async () => {
  const { create, workers } = workerFactory();
  const processor = createConvolutionProcessor(create, 10);
  const image = grayscaleImage([[80]]);
  await assert.rejects(processor.run(image, image, preset('identity')), /demorou demais/);
  assert.equal(workers[0].terminated, true);
  const retry = processor.run(image, image, preset('identity'));
  workers[1].respond({ duration: 1 });
  assert.deepEqual(await retry, { duration: 1 });
  processor.dispose();
});

test('dimensões excessivas em PNG, JPEG e variantes WebP são rejeitadas antes de decodificar', async () => {
  const png = Buffer.alloc(24);
  png.write('PNG', 1); png.write('IHDR', 12);
  png.writeUInt32BE(10000, 16); png.writeUInt32BE(10000, 20);
  const jpeg = Buffer.from([255, 216, 255, 192, 0, 8, 8, 39, 16, 39, 16, 0]);
  const webp = kind => {
    const data = Buffer.alloc(30);
    data.write('RIFF', 0); data.write('WEBP', 8); data.write(kind, 12);
    return data;
  };
  const vp8 = webp('VP8 ');
  vp8.set([157, 1, 42], 23);
  vp8.writeUInt16LE(10000, 26); vp8.writeUInt16LE(10000, 28);
  const vp8x = webp('VP8X');
  vp8x.writeUIntLE(9999, 24, 3); vp8x.writeUIntLE(9999, 27, 3);
  const vp8l = webp('VP8L');
  vp8l[20] = 47; vp8l.writeUInt32LE(9999 | (9999 << 14), 21);
  for (const [type, data] of [['image/png', png], ['image/jpeg', jpeg], ['image/webp', vp8], ['image/webp', vp8x], ['image/webp', vp8l]]) {
    await assert.rejects(loadUploadedImage(new Blob([data], { type })), /40 megapixels/);
  }
  await assert.rejects(loadUploadedImage(new Blob(['arquivo inválido'], { type: 'image/png' })), /Não foi possível ler/);
});

test('leitura cancelada e dimensões inválidas não iniciam decodificação', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loadUploadedImage(new Blob([], { type: 'image/png' }), { signal: controller.signal }), { name: 'AbortError' });
  for (const [width, height] of [[0, 20], [NaN, 20], [20, Infinity], [-1, 30]]) assert.throws(() => fitImageDimensions(width, height));
});
