import { hasDrawingInk } from './drawingImage.js';

// Deliberately NOT a recognizer: hash the image bytes into a repeatable simulated distribution.
// Only image pixels enter this contract. No challenge, round, score or session is available here.
export function simulatePrediction(image, classes) {
  if (!hasDrawingInk(image)) throw new Error('Uma imagem vazia não pode ser classificada.');
  let hash = 2166136261;
  for (const byte of image.data) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
  const winner = hash % classes.length;
  const confidence = (60 + (hash >>> 8) % 32) / 100;
  const remainder = 1 - confidence;
  const probabilities = classes.map((item, index) => ({
    ...item,
    probability: index === winner ? confidence : remainder / (classes.length - 1),
  }));
  return { id: classes[winner].id, label: classes[winner].label, confidence, probabilities, simulated: true };
}

export function createMockDrawingClassifier(classes) {
  return async (image, { signal } = {}) => {
    await new Promise((resolve, reject) => {
      if (signal?.aborted) { reject(new DOMException('Cancelado', 'AbortError')); return; }
      const cancel = () => { clearTimeout(timer); reject(new DOMException('Cancelado', 'AbortError')); };
      const timer = setTimeout(() => { signal?.removeEventListener('abort', cancel); resolve(); }, 450);
      signal?.addEventListener('abort', cancel, { once: true });
    });
    return simulatePrediction(image, classes);
  };
}
