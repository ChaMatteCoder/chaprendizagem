import * as tf from '@tensorflow/tfjs';
import { createDemoDataset } from '../data/demoSamples.js';
import { createMlpModel } from './createMlpModel.js';

export async function trainModel(modeConfig, { epochs = 18, variantsPerClass = 3 } = {}, onEpochEnd) {
  const startedAt = performance.now();
  const samples = createDemoDataset(modeConfig, variantsPerClass);
  const labels = modeConfig.classes;
  const xs = tf.tensor2d(samples.map((sample) => sample.input), [samples.length, 784]);
  const ys = tf.tensor2d(
    samples.map((sample) => labels.map((label) => (label === sample.label ? 1 : 0))),
    [samples.length, labels.length],
  );
  const model = createMlpModel({ outputNeurons: labels.length });
  const history = [];

  try {
    await model.fit(xs, ys, {
      batchSize: Math.min(16, samples.length),
      epochs,
      shuffle: true,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          const row = {
            epoch: epoch + 1,
            loss: Number(logs.loss ?? 0),
            accuracy: Number(logs.acc ?? logs.accuracy ?? 0),
          };
          history.push(row);
          onEpochEnd?.(row, [...history]);
          await tf.nextFrame();
        },
      },
    });
  } catch (error) {
    model.dispose();
    throw error;
  } finally {
    xs.dispose();
    ys.dispose();
  }

  return {
    model,
    history,
    sampleCount: samples.length,
    trainTimeMs: performance.now() - startedAt,
  };
}
