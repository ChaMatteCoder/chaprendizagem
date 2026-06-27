import * as tf from '@tensorflow/tfjs';
import { irisClasses } from '../data/irisDataset.js';
import { buildIrisConfusionMatrix } from './buildIrisConfusionMatrix.js';
import { calculateIrisMetrics } from './calculateIrisMetrics.js';
import { createIrisMlpModel } from './createIrisMlpModel.js';
import { calculateFeatureStats, normalizeIrisDataset } from './normalizeIrisData.js';

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function shuffleDeterministic(items, seed = 42) {
  const random = seededRandom(seed);
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function classIndex(species) {
  return irisClasses.indexOf(species);
}

export function splitIrisDataset(dataset, testRatio = 0.2, seed = 42) {
  const train = [];
  const test = [];

  irisClasses.forEach((species, speciesIndex) => {
    const rows = shuffleDeterministic(
      dataset.filter((row) => row.species === species),
      seed + speciesIndex * 11,
    );
    const testCount = Math.round(rows.length * testRatio);
    test.push(...rows.slice(0, testCount));
    train.push(...rows.slice(testCount));
  });

  return {
    train: shuffleDeterministic(train, seed + 101),
    test: shuffleDeterministic(test, seed + 202),
  };
}

export function countByClass(dataset) {
  return irisClasses.map((species) => ({
    label: species,
    count: dataset.filter((row) => row.species === species).length,
  }));
}

export async function trainIrisModel(dataset, config = {}) {
  const {
    epochs = 90,
    hiddenUnits1 = 8,
    hiddenUnits2 = 6,
    learningRate = 0.03,
    testRatio = 0.2,
    seed = 42,
    onEpochEnd,
  } = config;

  const stats = calculateFeatureStats(dataset);
  const normalized = normalizeIrisDataset(dataset, stats);
  const split = splitIrisDataset(normalized, testRatio, seed);
  const model = createIrisMlpModel({ hiddenUnits1, hiddenUnits2, learningRate });

  const trainXs = tf.tensor2d(
    split.train.map((row) => row.input),
    [split.train.length, 4],
  );
  const trainLabelTensor = tf.tensor1d(split.train.map((row) => classIndex(row.species)), 'int32');
  const trainYs = tf.oneHot(trainLabelTensor, irisClasses.length);
  const testXs = tf.tensor2d(
    split.test.map((row) => row.input),
    [split.test.length, 4],
  );
  const testLabelTensor = tf.tensor1d(split.test.map((row) => classIndex(row.species)), 'int32');
  const testYs = tf.oneHot(testLabelTensor, irisClasses.length);

  const history = [];

  try {
    await model.fit(trainXs, trainYs, {
      epochs,
      batchSize: 16,
      shuffle: true,
      validationData: [testXs, testYs],
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          const item = {
            epoch: epoch + 1,
            loss: logs.loss ?? 0,
            accuracy: logs.acc ?? logs.accuracy ?? 0,
            valLoss: logs.val_loss ?? 0,
            valAccuracy: logs.val_acc ?? logs.val_accuracy ?? 0,
          };
          history.push(item);
          onEpochEnd?.(item, [...history]);
          await tf.nextFrame();
        },
      },
    });

    const predictions = tf.tidy(() => Array.from(model.predict(testXs).argMax(-1).dataSync()));
    const actual = split.test.map((row) => classIndex(row.species));
    const confusionMatrix = buildIrisConfusionMatrix(actual, predictions, irisClasses.length);
    const metrics = calculateIrisMetrics(confusionMatrix);
    const last = history.at(-1) ?? {};

    return {
      model,
      stats,
      split,
      history,
      confusionMatrix,
      metrics,
      summary: {
        trainAccuracy: last.accuracy ?? 0,
        testAccuracy: metrics.accuracy,
        finalLoss: last.loss ?? 0,
        finalValidationLoss: last.valLoss ?? 0,
        epochs,
        trainSamples: split.train.length,
        testSamples: split.test.length,
      },
    };
  } catch (error) {
    model.dispose();
    throw error;
  } finally {
    trainXs.dispose();
    trainLabelTensor.dispose();
    trainYs.dispose();
    testXs.dispose();
    testLabelTensor.dispose();
    testYs.dispose();
  }
}
