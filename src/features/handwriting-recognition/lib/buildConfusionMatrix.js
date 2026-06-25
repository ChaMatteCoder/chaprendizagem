import { createDemoDataset } from '../data/demoSamples.js';
import { predictCharacter } from './predictCharacter.js';

export function buildConfusionMatrix(model, modeConfig) {
  if (!model) {
    return null;
  }

  const labels = modeConfig.classes;
  const matrix = labels.map(() => labels.map(() => 0));
  const samples = createDemoDataset(modeConfig, 1);

  samples.forEach((sample) => {
    const prediction = predictCharacter(model, sample.input, labels);
    const actualIndex = labels.indexOf(sample.label);
    const predictedIndex = labels.indexOf(prediction.label);
    if (actualIndex >= 0 && predictedIndex >= 0) {
      matrix[actualIndex][predictedIndex] += 1;
    }
  });

  return matrix;
}
