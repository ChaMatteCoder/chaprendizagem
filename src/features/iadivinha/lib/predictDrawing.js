import { preprocessDrawing } from './preprocessDrawing.js';

function checkAbort(signal) {
  if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
}

export async function predictDrawing(tf, model, classes, image, { signal } = {}) {
  checkAbort(signal);
  const started = performance.now();
  const prepared = preprocessDrawing(image);
  const inferenceStarted = performance.now();
  let output;
  try {
    output = tf.tidy(() => model.predict(tf.tensor4d(prepared.pixels, prepared.shape)));
    const values = Array.from(await output.data());
    const finished = performance.now();
    checkAbort(signal);
    if (values.length !== classes.length || values.some(value => !Number.isFinite(value) || value < 0 || value > 1) ||
        Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) > 0.001) {
      throw new Error('O modelo retornou probabilidades inválidas.');
    }
    const winner = values.indexOf(Math.max(...values));
    return {
      id: classes[winner].id, label: classes[winner].label, confidence: values[winner],
      probabilities: classes.map((item, index) => ({ ...item, probability: values[index] })),
      simulated: false, backend: tf.getBackend(), inferenceMs: finished - inferenceStarted,
      preprocessingMs: inferenceStarted - started, totalMs: finished - started,
    };
  } finally {
    if (output) tf.dispose(output);
  }
}

// Owns one model. Pending GPU reads finish before disposal on route exit.
export function createDrawingClassifier(tf, model, classes) {
  let closed = false, active = 0, disposed = false;
  function release() {
    if (closed && active === 0 && !disposed) { disposed = true; model.dispose(); }
  }
  return {
    classes,
    async classify(image, options) {
      if (closed) throw new Error('O modelo foi encerrado.');
      active++;
      try { return await predictDrawing(tf, model, classes, image, options); }
      finally { active--; release(); }
    },
    dispose() { closed = true; release(); },
  };
}
