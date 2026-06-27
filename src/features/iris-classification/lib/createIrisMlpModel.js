import * as tf from '@tensorflow/tfjs';

export function createIrisMlpModel({ hiddenUnits1 = 8, hiddenUnits2 = 6, learningRate = 0.03 } = {}) {
  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      inputShape: [4],
      units: hiddenUnits1,
      activation: 'relu',
      name: 'iris_dense_1',
    }),
  );
  model.add(tf.layers.dense({ units: hiddenUnits2, activation: 'relu', name: 'iris_dense_2' }));
  model.add(tf.layers.dense({ units: 3, activation: 'softmax', name: 'iris_softmax' }));

  model.compile({
    optimizer: tf.train.adam(learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
}
