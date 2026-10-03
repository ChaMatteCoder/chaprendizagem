import { sonarLabelIndex } from '../../data/sonarSchema.js';
import { validateProbabilities } from '../model/predictSonar.js';

export function stableSoftmax(logits) {
  if (!Array.isArray(logits) || logits.length !== 2 || logits.some(value => !Number.isFinite(value))) {
    throw new Error('São necessários dois logits finitos, na ordem R/M.');
  }
  const maximum = Math.max(...logits);
  const exponentials = logits.map(value => Math.exp(value - maximum));
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  return { maximum, exponentials, denominator, probabilities: exponentials.map(value => value / denominator) };
}

export function explainNeuron(layer, index) {
  if (!Number.isInteger(index) || index < 0 || index >= layer.bias.length ||
      layer.kernel.length !== layer.input.length || layer.kernel.some(row => row.length !== layer.bias.length)) {
    throw new Error('Neurônio ou shape inválido.');
  }
  const terms = layer.input.map((input, i) => ({ index: i + 1, input, weight: layer.kernel[i][index], product: input * layer.kernel[i][index] }));
  const sum = terms.reduce((total, term) => total + term.product, 0);
  const result = { terms, sum, bias: layer.bias[index], computedZ: sum + layer.bias[index], observedZ: layer.z[index], output: layer.output[index] };
  if ([result.sum, result.bias, result.computedZ, result.observedZ, result.output].some(value => !Number.isFinite(value))) {
    throw new Error('Cálculo do neurônio não finito.');
  }
  return result;
}

/** Label-dependent mathematics is deliberately separate from prediction. */
export function explainLabeledPrediction(trace, label, { revealed = false } = {}) {
  if (!revealed) throw new Error('Revele o rótulo antes de calcular a perda.');
  const index = sonarLabelIndex(label);
  validateProbabilities(trace.probabilities);
  const softmax = stableSoftmax(trace.logits);
  if (softmax.probabilities.some((value, i) => Math.abs(value - trace.probabilities[i]) > 1e-5)) {
    throw new Error('Logits e probabilidades não correspondem.');
  }
  const oneHot = [index === 0 ? 1 : 0, index === 1 ? 1 : 0];
  // Log-sum-exp avoids ln(0) when Softmax underflows in finite precision.
  const crossEntropy = softmax.maximum - trace.logits[index] + Math.log(softmax.denominator);
  if (!Number.isFinite(crossEntropy)) throw new Error('Perda não finita.');
  return { label, index, oneHot, crossEntropy, gradientLogits: trace.probabilities.map((p, i) => p - oneHot[i]),
    lossMethod: 'log-sum-exp from logits; no clipping' };
}

export function formatSonarNumber(value, digits = 6) {
  if (!Number.isFinite(value)) return 'indisponível';
  if (value !== 0 && Math.abs(value) < 10 ** -digits) return value.toExponential(Math.min(digits, 6)).replace('.', ',');
  return value.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: Math.min(2, digits) });
}
