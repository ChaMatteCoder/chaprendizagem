import { euclideanDistance, runKMeans } from './kmeans.js';

export function computeAverageSilhouette(points, labels, k) {
  if (k <= 1 || points.length <= 1) return null;

  const clusters = Array.from({ length: k }, () => []);
  labels.forEach((cluster, index) => clusters[cluster].push(index));

  const silhouettes = points.map((point, pointIndex) => {
    const ownCluster = labels[pointIndex];
    const ownMembers = clusters[ownCluster].filter((index) => index !== pointIndex);
    if (ownMembers.length === 0) return 0;

    const a = ownMembers.reduce((sum, index) => sum + euclideanDistance(point, points[index]), 0) / ownMembers.length;
    const otherAverages = clusters
      .map((members, cluster) => {
        if (cluster === ownCluster || members.length === 0) return Number.POSITIVE_INFINITY;
        return members.reduce((sum, index) => sum + euclideanDistance(point, points[index]), 0) / members.length;
      });
    const b = Math.min(...otherAverages);
    const denominator = Math.max(a, b);
    return denominator === 0 ? 0 : (b - a) / denominator;
  });

  return silhouettes.reduce((sum, value) => sum + value, 0) / silhouettes.length;
}

export function evaluateKRange(points, options = {}) {
  const requestedMax = Math.max(1, Math.trunc(Number(options.maxK ?? 8)));
  const maxK = Math.min(requestedMax, points.length);
  const seeds = options.seeds ?? [42, 73, 104];

  return Array.from({ length: maxK }, (_, index) => index + 1).map((k) => {
    const candidates = [
      runKMeans(points, { ...options, k, initialization: 'didactic', seed: seeds[0] }),
      ...seeds.map((seed) => runKMeans(points, { ...options, k, initialization: 'kmeans++', seed })),
    ];
    const best = candidates.reduce((winner, candidate) =>
      candidate.totalSquaredError < winner.totalSquaredError ? candidate : winner,
    );

    return {
      k,
      totalSquaredError: best.totalSquaredError,
      silhouette: computeAverageSilhouette(points, best.labels, k),
    };
  });
}

export function computeErrorReduction(errorHistory) {
  if (!errorHistory.length) return 0;
  const initial = errorHistory[0].totalSquaredError;
  const final = errorHistory[errorHistory.length - 1].totalSquaredError;
  return initial === 0 ? 0 : ((initial - final) / initial) * 100;
}
