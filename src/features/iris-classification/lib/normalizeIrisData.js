import { irisFeatures } from '../data/irisDataset.js';

export function calculateFeatureStats(dataset) {
  return irisFeatures.reduce((stats, feature) => {
    const values = dataset.map((row) => row[feature.id]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    stats[feature.id] = { min, max, range: max - min || 1 };
    return stats;
  }, {});
}

export function normalizeIrisSample(sample, stats) {
  return irisFeatures.map((feature) => {
    const featureStats = stats[feature.id];
    return (Number(sample[feature.id]) - featureStats.min) / featureStats.range;
  });
}

export function normalizeIrisDataset(dataset, stats = calculateFeatureStats(dataset)) {
  return dataset.map((row) => ({
    ...row,
    input: normalizeIrisSample(row, stats),
  }));
}
