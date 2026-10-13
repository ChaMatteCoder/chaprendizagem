import { convolveImage } from './convolution.js';

let input = null;
let grayscaleInput = null;

self.onmessage = ({ data: { image, grayInput, options } }) => {
  try {
    const started = performance.now();
    if (image) { input = image; grayscaleInput = grayInput; }
    const color = convolveImage(input, options);
    const gray = convolveImage(grayscaleInput, options, { grayscale: true });
    // Só as saídas são transferidas; as entradas permanecem disponíveis no worker.
    self.postMessage({ color, gray, duration: performance.now() - started }, [color.data.buffer, gray.data.buffer]);
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
