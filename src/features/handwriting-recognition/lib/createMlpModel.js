import * as tf from '@tensorflow/tfjs';

export function createMlpModel({ outputNeurons }) {
  const model = tf.sequential();

  model.add(tf.layers.dense({ inputShape: [784], units: 128, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: outputNeurons, activation: 'softmax' }));

  model.compile({
    optimizer: tf.train.adam(0.012),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
}
