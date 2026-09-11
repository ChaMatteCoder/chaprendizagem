import { preprocessStrokes } from './preprocessStrokes.js';

// Live canvas paths preserve thin details and normalize width to the training rasterizer.
// RGBA-only inputs retain the legacy area-resize fallback.
// Area integration keeps thin strokes when reducing a large canvas; no browser-specific resize.
export function preprocessDrawing(image) {
  if (image?.strokes !== undefined) return preprocessStrokes(image.strokes);
  const { width, height, data } = image || {};
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      width > 4096 || height > 4096 || data?.length !== width * height * 4) {
    throw new Error('Imagem de desenho inválida.');
  }
  const ink = new Float32Array(width * height);
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const darkness = (255 - (data[offset] + data[offset + 1] + data[offset + 2]) / 3) * data[offset + 3] / 255;
      // Composite transparency over white and map the canvas navy ink to full intensity.
      ink[y * width + x] = Math.min(1, darkness / (255 - (23 + 42 + 45) / 3));
      if (darkness > 24) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left) throw new Error('Uma imagem vazia não pode ser classificada.');
  const cropWidth = right - left + 1, cropHeight = bottom - top + 1;
  const scale = 25 / Math.max(cropWidth, cropHeight);
  const offsetX = (28 - cropWidth * scale) / 2, offsetY = (28 - cropHeight * scale) / 2;
  const pixels = new Float32Array(784);
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const x0 = (x - offsetX) / scale + left, x1 = (x + 1 - offsetX) / scale + left;
      const y0 = (y - offsetY) / scale + top, y1 = (y + 1 - offsetY) / scale + top;
      let sum = 0;
      for (let sy = Math.max(top, Math.floor(y0)); sy < Math.min(bottom + 1, Math.ceil(y1)); sy++) {
        const dy = Math.max(0, Math.min(y1, sy + 1) - Math.max(y0, sy));
        for (let sx = Math.max(left, Math.floor(x0)); sx < Math.min(right + 1, Math.ceil(x1)); sx++) {
          const dx = Math.max(0, Math.min(x1, sx + 1) - Math.max(x0, sx));
          sum += ink[sy * width + sx] * dx * dy;
        }
      }
      // Quantize to the same uint8/255 levels as the training dataset.
      pixels[y * 28 + x] = Math.round(Math.min(1, sum * scale * scale) * 255) / 255;
    }
  }
  return { pixels, shape: [1, 28, 28, 1], bounds: { left, top, width: cropWidth, height: cropHeight } };
}
