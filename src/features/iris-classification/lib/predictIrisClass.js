import * as tf from '@tensorflow/tfjs';

export function predictIrisClass(model, normalizedInput, classes) {
  if (!model || !normalizedInput?.length) {
    return null;
  }

  const probabilities = tf.tidy(() => {
    const input = tf.tensor2d([normalizedInput], [1, 4]);
    const output = model.predict(input);
    return Array.from(output.dataSync());
  });

  const ranked = probabilities
    .map((probability, index) => ({ label: classes[index], probability, index }))
    .sort((a, b) => b.probability - a.probability);

  return {
    predictedIndex: ranked[0]?.index ?? 0,
    predictedClass: ranked[0]?.label ?? classes[0],
    confidence: ranked[0]?.probability ?? 0,
    probabilities,
    ranked,
  };
}
