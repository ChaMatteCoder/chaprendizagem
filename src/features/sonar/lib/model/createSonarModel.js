const optimizers = new WeakMap();
const disposed = new WeakSet();

export function validateTrainingConfig(config) {
  const { hiddenUnits, epochs, batchSize, learningRate, seed } = config;
  if (!Array.isArray(hiddenUnits) || hiddenUnits.length > 2 ||
      Array.from(hiddenUnits).some(units => !Number.isInteger(units) || units < 1 || units > 64)) {
    throw new Error('Use até duas camadas ocultas de 1 a 64 neurônios.');
  }
  if (!Number.isInteger(epochs) || epochs < 1 || epochs > 500) throw new Error('Épocas devem estar entre 1 e 500.');
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 64) throw new Error('Batch deve estar entre 1 e 64.');
  if (!Number.isFinite(learningRate) || learningRate < 0.00001 || learningRate > 0.1) throw new Error('Taxa inválida: use 0,00001 a 0,1.');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Seed deve ser um inteiro de 32 bits sem sinal.');
  return { hiddenUnits: [...hiddenUnits], epochs, batchSize, learningRate, seed };
}

export function createSonarModel(tf, config) {
  const validated = validateTrainingConfig(config);
  const model = tf.sequential();
  let optimizer;
  try {
    const units = [...validated.hiddenUnits, 2];
    units.forEach((width, index) => model.add(tf.layers.dense({
      ...(index === 0 ? { inputShape: [60] } : {}),
      units: width,
      activation: index === units.length - 1 ? 'softmax' : 'relu',
      useBias: true,
      kernelInitializer: tf.initializers.glorotUniform({ seed: (validated.seed + 997 * index) >>> 0 }),
      biasInitializer: 'zeros',
      name: `sonar_dense_${index}`,
    })));
    optimizer = tf.train.adam(validated.learningRate, 0.9, 0.999, 1e-7);
    model.compile({ optimizer, loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
    optimizers.set(model, optimizer);
    return model;
  } catch (error) {
    model.dispose();
    optimizer?.dispose();
    throw error;
  }
}

// LayersModel does not own an optimizer passed as an instance to compile().
export function releaseSonarOptimizer(model) {
  const optimizer = optimizers.get(model);
  if (optimizer) { optimizer.dispose(); optimizers.delete(model); }
}

export function disposeSonarModel(model) {
  if (!model || disposed.has(model)) return;
  disposed.add(model);
  try { model.dispose(); } finally { releaseSonarOptimizer(model); }
}
