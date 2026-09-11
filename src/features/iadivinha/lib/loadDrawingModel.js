import { loadClasses } from './loadClasses.js';
import { createDrawingClassifier } from './predictDrawing.js';

export function validateModelContract(model, classes, preprocessing, metrics) {
  if (JSON.stringify(model.inputs?.[0]?.shape) !== '[null,28,28,1]' ||
      JSON.stringify(model.outputs?.[0]?.shape) !== JSON.stringify([null, classes.length]) || model.inputs.length !== 1 || model.outputs.length !== 1 ||
      preprocessing?.version !== 'quickdraw-bitmap-v1' || JSON.stringify(preprocessing.shape) !== '[28,28,1]' ||
      preprocessing.dtype !== 'float32' || preprocessing.background !== 0 || preprocessing.ink !== 1 ||
      JSON.stringify(preprocessing.range) !== '[0,1]' || metrics?.smoke !== false ||
      JSON.stringify(metrics.classes) !== JSON.stringify(classes)) {
    throw new Error('Os arquivos do modelo são incompatíveis.');
  }
}

export async function loadDrawingModel(signal) {
  async function json(name) {
    const response = await fetch(`/models/iadivinha/${name}.json`, { signal });
    if (!response.ok) throw new Error('Não foi possível baixar os arquivos da IA.');
    return response.json();
  }
  const [tf, classes, preprocessing, metrics] = await Promise.all([
    import('@tensorflow/tfjs'), loadClasses(signal), json('preprocessing'), json('metrics'),
  ]);
  if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
  await tf.ready(); // Keep the shared runtime's selected backend; do not reconfigure other labs.
  let model;
  try {
    model = await tf.loadLayersModel(tf.io.browserHTTPRequest('/models/iadivinha/model.json', { requestInit: { signal } }));
    validateModelContract(model, classes, preprocessing, metrics);
    const warmup = tf.tidy(() => model.predict(tf.zeros([1, 28, 28, 1])));
    try { await warmup.data(); } finally { warmup.dispose(); }
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
    return createDrawingClassifier(tf, model, classes);
  } catch (error) {
    model?.dispose();
    throw error;
  }
}
