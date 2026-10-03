import { sonarLabelIndex } from '../../data/sonarSchema.js';
import { toSonarFeatureMatrix, validateSonarSamples } from '../data/sonarDataset.js';
import { validateProbabilities } from '../model/predictSonar.js';

export function classificationMetrics(actual, predicted) {
  if (!Array.isArray(actual) || !Array.isArray(predicted) || actual.length !== predicted.length ||
      [...actual, ...predicted].some(value => value !== 0 && value !== 1)) throw new Error('Classes esperadas: índices 0/1 em vetores de mesmo tamanho.');
  const confusionMatrix = [[0, 0], [0, 0]];
  actual.forEach((value, index) => confusionMatrix[value][predicted[index]]++);
  const perClass = [0, 1].map(index => {
    const tp = confusionMatrix[index][index];
    const support = confusionMatrix[index][0] + confusionMatrix[index][1];
    const predictedCount = confusionMatrix[0][index] + confusionMatrix[1][index];
    const precision = predictedCount ? tp / predictedCount : 0;
    const recall = support ? tp / support : 0;
    return { index, label: ['R', 'M'][index], support, precision, recall,
      f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0,
      zeroDenominators: [!predictedCount && 'precision', !support && 'recall', !(precision + recall) && 'f1'].filter(Boolean) };
  });
  const correct = confusionMatrix[0][0] + confusionMatrix[1][1];
  return { classOrder: ['R', 'M'], confusionMatrix, orientation: 'rows=true; columns=predicted',
    total: actual.length, correct, accuracy: actual.length ? correct / actual.length : 0,
    perClass, macroF1: (perClass[0].f1 + perClass[1].f1) / 2,
    zeroDenominatorPolicy: 'return 0 and flag affected metric' };
}

export async function evaluateSonarModel(tf, model, samples) {
  validateSonarSamples(samples);
  let output, loss;
  try {
    ({ output, loss } = tf.tidy(() => {
      const xs = tf.tensor2d(toSonarFeatureMatrix(samples), [samples.length, 60]);
      const ys = tf.oneHot(tf.tensor1d(samples.map(sample => sonarLabelIndex(sample.label)), 'int32'), 2);
      const probabilities = model.predict(xs);
      return { output: probabilities, loss: tf.metrics.categoricalCrossentropy(ys, probabilities).mean() };
    }));
    const probabilities = await output.array();
    const crossEntropy = (await loss.data())[0];
    if (!Number.isFinite(crossEntropy)) throw new Error('Cross-entropy não finita.');
    const records = samples.map((sample, index) => ({ id: sample.id, label: sample.label,
      probabilities: probabilities[index], predictedIndex: validateProbabilities(probabilities[index]) }));
    return { metrics: { ...classificationMetrics(samples.map(sample => sonarLabelIndex(sample.label)), records.map(row => row.predictedIndex)),
      crossEntropy, lossImplementation: 'tf.metrics.categoricalCrossentropy; float32; library clipping' }, records };
  } finally { tf.dispose(output); tf.dispose(loss); }
}

export function meanAndSampleDeviation(values) {
  if (!values.length || values.some(value => !Number.isFinite(value))) throw new Error('Valores inválidos para resumo.');
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { mean, sampleStandardDeviation: values.length > 1 ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)) : 0 };
}

export function selectOfficialCandidate(candidates, { eligibleRole, tieTolerance }) {
  const eligible = candidates.filter(candidate => candidate.role === eligibleRole);
  if (!eligible.length || !Number.isFinite(tieTolerance) || tieTolerance < 0 ||
      candidates.some(candidate => !Number.isFinite(candidate.macroF1?.mean))) throw new Error('Comparação incompleta.');
  const highest = Math.max(...eligible.map(candidate => candidate.macroF1.mean));
  return eligible.filter(candidate => highest - candidate.macroF1.mean <= tieTolerance)
    .sort((a, b) => a.parameters - b.parameters || candidates.indexOf(a) - candidates.indexOf(b))[0];
}
