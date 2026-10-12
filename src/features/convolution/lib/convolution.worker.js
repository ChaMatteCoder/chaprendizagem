import { convolveImage, toGrayscale } from './convolution.js';

self.onmessage = ({ data: { image, options } }) => {
  try {
    const started = performance.now();
    const grayInput = toGrayscale(image);
    const color = convolveImage(image, options);
    const gray = convolveImage(grayInput, options, { grayscale: true });
    self.postMessage({ color, gray, grayInput, duration: performance.now() - started }, [color.data.buffer, gray.data.buffer, grayInput.data.buffer]);
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
