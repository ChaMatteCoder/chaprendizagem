import assert from 'node:assert/strict';
import test from 'node:test';
import { borderCoordinate, convolveImage, inspectPixel, toGrayscale, validateOptions } from '../src/features/convolution/lib/convolution.js';
import { kernelPresets, optionsFromPreset } from '../src/features/convolution/data/kernels.js';
import { fitImageDimensions, loadUploadedImage } from '../src/features/convolution/lib/imageIO.js';

function grayscaleImage(rows) {
  return { width: rows[0].length, height: rows.length, data: new Uint8ClampedArray(rows.flatMap(row => row.flatMap(value => [value, value, value, 255]))) };
}
function redValues(image) { return Array.from(image.data).filter((_, index) => index % 4 === 0); }
function preset(id) { return optionsFromPreset(kernelPresets.find(item => item.id === id)); }

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
