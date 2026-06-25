import * as tf from '@tensorflow/tfjs';

export function predictCharacter(model, vector, labels) {
  if (!model || !vector?.length) return null;

  const probabilities = tf.tidy(() => {
    const input = tf.tensor2d([vector], [1, 784]);
    return Array.from(model.predict(input).dataSync());
  });

  const ranked = probabilities
    .map((probability, index) => ({ label: labels[index], probability }))
    .sort((a, b) => b.probability - a.probability);

  return {
    label: ranked[0]?.label ?? '-',
    confidence: ranked[0]?.probability ?? 0,
    ranked,
    probabilities: labels.map((label, index) => ({ label, probability: probabilities[index] ?? 0 })),
  };
}
