import {
  assignPointsToCentroids,
  computeTotalSquaredError,
  createSeededRandom,
  squaredDistance,
  traceKMeansPlusPlusInitialization,
} from './kmeans.js';

const MAX_SYNTHETIC_POINTS = 100000;
const MAX_MINIBATCH_ITERATIONS = 10000;
const INITIALIZATIONS = new Set(['didactic', 'random', 'kmeans++']);

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveInteger(value, fallback, label, maximum = Number.MAX_SAFE_INTEGER) {
  const number = Math.trunc(finiteNumber(value, fallback));
  if (number < 1 || number > maximum) {
    throw new RangeError(`${label} deve estar entre 1 e ${maximum}.`);
  }
  return number;
}

function cloneCentroids(centroids) {
  return centroids.map(({ x, y }) => ({ x, y }));
}

function validatePoints(points) {
  if (!Array.isArray(points) || points.length === 0) {
    throw new RangeError('O MiniBatchKMeans precisa de pelo menos um ponto.');
  }

  points.forEach((point, index) => {
    if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) {
      throw new TypeError(`O ponto ${index + 1} deve possuir coordenadas x e y numéricas.`);
    }
  });
}

function createGaussianRandom(random) {
  let spare = null;

  return function gaussian() {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }

    let first = random();
    let second = random();
    if (first <= Number.EPSILON) first = Number.EPSILON;
    if (second <= Number.EPSILON) second = Number.EPSILON;

    const magnitude = Math.sqrt(-2 * Math.log(first));
    const angle = 2 * Math.PI * second;
    spare = magnitude * Math.sin(angle);
    return magnitude * Math.cos(angle);
  };
}

function sampleIndicesWithoutReplacement(pointCount, sampleSize, random) {
  if (sampleSize >= pointCount) {
    return Array.from({ length: pointCount }, (_, index) => index);
  }

  const selected = new Set();
  for (let index = pointCount - sampleSize; index < pointCount; index += 1) {
    const candidate = Math.floor(random() * (index + 1));
    selected.add(selected.has(candidate) ? index : candidate);
  }

  return [...selected].sort((a, b) => a - b);
}

function initializeCentroids(points, k, initialization, seed) {
  if (initialization === 'kmeans++') {
    return traceKMeansPlusPlusInitialization(points, { k, seed }).centroids;
  }

  if (initialization === 'didactic') {
    return Array.from({ length: k }, (_, index) => {
      const point = points[Math.min(points.length - 1, Math.floor((index * points.length) / k))];
      return { x: Number(point.x), y: Number(point.y) };
    });
  }

  const random = createSeededRandom(seed);
  const indices = points.map((_, index) => index);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [indices[index], indices[swapWith]] = [indices[swapWith], indices[index]];
  }
  return indices.slice(0, k).map((index) => ({
    x: Number(points[index].x),
    y: Number(points[index].y),
  }));
}

function summarizeClusters(points, labels, centroids) {
  const summaries = centroids.map((centroid, cluster) => ({
    cluster,
    centroid: { ...centroid },
    count: 0,
    totalSquaredError: 0,
    meanDistance: 0,
    maxDistance: 0,
  }));

  points.forEach((point, index) => {
    const summary = summaries[labels[index]];
    const distanceSquared = squaredDistance(point, summary.centroid);
    const distance = Math.sqrt(distanceSquared);
    summary.count += 1;
    summary.totalSquaredError += distanceSquared;
    summary.meanDistance += distance;
    summary.maxDistance = Math.max(summary.maxDistance, distance);
  });

  summaries.forEach((summary) => {
    summary.meanDistance = summary.count === 0 ? 0 : summary.meanDistance / summary.count;
  });

  return summaries;
}

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

export function generateSyntheticClusterDataset(options = {}) {
  const pointCount = positiveInteger(
    options.pointCount ?? options.count,
    5000,
    'A quantidade de pontos',
    MAX_SYNTHETIC_POINTS,
  );
  const k = positiveInteger(options.k ?? options.clusterCount, 4, 'K', pointCount);
  const spread = finiteNumber(options.spread ?? options.dispersion, 0.85);
  const separation = finiteNumber(options.separation, 8);
  const seed = finiteNumber(options.seed, 42);

  if (spread < 0) throw new RangeError('A dispersão deve ser maior ou igual a zero.');
  if (separation < 0) throw new RangeError('A separação deve ser maior ou igual a zero.');

  const random = createSeededRandom(seed);
  const gaussian = createGaussianRandom(random);
  const rotation = random() * Math.PI * 2;
  const centers = Array.from({ length: k }, (_, cluster) => {
    if (k === 1) return { cluster, x: 0, y: 0 };
    const angle = rotation + (cluster / k) * Math.PI * 2;
    const radius = separation * (0.9 + random() * 0.2);
    return {
      cluster,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });

  const points = Array.from({ length: pointCount }, (_, index) => {
    const sourceCluster = index < k ? index : Math.floor(random() * k);
    const center = centers[sourceCluster];
    return {
      id: index + 1,
      x: center.x + gaussian() * spread,
      y: center.y + gaussian() * spread,
      sourceCluster,
    };
  });

  return {
    pointCount,
    k,
    spread,
    separation,
    seed,
    centers: centers.map((center) => ({ ...center })),
    points,
  };
}

export function runMiniBatchKMeans(points, options = {}) {
  validatePoints(points);
  const startedAt = now();
  const k = positiveInteger(options.k, 4, 'K', points.length);
  const maxIterations = positiveInteger(
    options.maxIterations,
    100,
    'O máximo de iterações',
    MAX_MINIBATCH_ITERATIONS,
  );
  const batchSize = Math.min(
    points.length,
    positiveInteger(options.batchSize, 128, 'O tamanho do mini-batch', points.length),
  );
  const evaluationInterval = positiveInteger(
    options.evaluationInterval,
    Math.min(10, maxIterations),
    'O intervalo de avaliação',
    maxIterations,
  );
  const stableIterationsRequired = positiveInteger(
    options.stableIterations,
    Math.min(3, maxIterations),
    'A quantidade de iterações estáveis',
    maxIterations,
  );
  const requestedSampleSize = Math.max(0, Math.trunc(finiteNumber(options.sampleSize, 800)));
  const sampleSize = Math.min(points.length, requestedSampleSize);
  const tolerance = finiteNumber(options.tolerance, 0.0001);
  const seed = finiteNumber(options.seed, 42);
  const initialization = options.initialization ?? 'kmeans++';

  if (tolerance < 0) throw new RangeError('A tolerância deve ser maior ou igual a zero.');
  if (!INITIALIZATIONS.has(initialization)) {
    throw new RangeError('A inicialização deve ser "didactic", "random" ou "kmeans++".');
  }

  let centroids = initializeCentroids(points, k, initialization, seed);
  const initialCentroids = cloneCentroids(centroids);
  const initialLabels = assignPointsToCentroids(points, centroids);
  const initialTotalSquaredError = computeTotalSquaredError(points, initialLabels, centroids);
  const centroidUpdateCounts = Array(k).fill(0);
  const batchRandom = createSeededRandom(seed + 104729);
  const history = [
    {
      iteration: 0,
      centroidMovement: 0,
      batchSquaredError: null,
      estimatedTotalSquaredError: initialTotalSquaredError,
      totalSquaredError: initialTotalSquaredError,
      evaluated: true,
      centroids: cloneCentroids(centroids),
    },
  ];
  let consecutiveStableIterations = 0;
  let converged = false;
  let iterations = 0;
  let processedPointCount = 0;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const batchIndices = sampleIndicesWithoutReplacement(points.length, batchSize, batchRandom);
    const batchPoints = batchIndices.map((index) => points[index]);
    const batchLabels = assignPointsToCentroids(batchPoints, centroids);
    const batchTotals = Array.from({ length: k }, () => ({ x: 0, y: 0, count: 0 }));

    batchPoints.forEach((point, index) => {
      const cluster = batchLabels[index];
      batchTotals[cluster].x += Number(point.x);
      batchTotals[cluster].y += Number(point.y);
      batchTotals[cluster].count += 1;
    });

    const previousCentroids = cloneCentroids(centroids);
    centroids = centroids.map((centroid, cluster) => {
      const batchTotal = batchTotals[cluster];
      if (batchTotal.count === 0) return { ...centroid };

      const previousCount = centroidUpdateCounts[cluster];
      const nextCount = previousCount + batchTotal.count;
      centroidUpdateCounts[cluster] = nextCount;
      return {
        x: (centroid.x * previousCount + batchTotal.x) / nextCount,
        y: (centroid.y * previousCount + batchTotal.y) / nextCount,
      };
    });

    const centroidMovement = Math.max(
      ...centroids.map((centroid, cluster) =>
        Math.sqrt(squaredDistance(previousCentroids[cluster], centroid)),
      ),
    );
    const updatedBatchLabels = assignPointsToCentroids(batchPoints, centroids);
    const batchSquaredError = computeTotalSquaredError(batchPoints, updatedBatchLabels, centroids);
    const estimatedTotalSquaredError = (batchSquaredError / batchPoints.length) * points.length;

    consecutiveStableIterations = centroidMovement <= tolerance
      ? consecutiveStableIterations + 1
      : 0;
    const reachedStableState = consecutiveStableIterations >= stableIterationsRequired;
    const shouldEvaluate = iteration % evaluationInterval === 0
      || iteration === maxIterations
      || reachedStableState;
    let totalSquaredError = null;

    if (shouldEvaluate) {
      const fullLabels = assignPointsToCentroids(points, centroids);
      totalSquaredError = computeTotalSquaredError(points, fullLabels, centroids);
    }

    history.push({
      iteration,
      centroidMovement,
      batchSquaredError,
      estimatedTotalSquaredError,
      totalSquaredError,
      evaluated: shouldEvaluate,
      centroids: cloneCentroids(centroids),
    });
    processedPointCount += batchPoints.length;
    iterations = iteration;

    if (reachedStableState) {
      converged = true;
      break;
    }
  }

  const labels = assignPointsToCentroids(points, centroids);
  const totalSquaredError = computeTotalSquaredError(points, labels, centroids);
  const lastHistoryIndex = history.length - 1;
  history[lastHistoryIndex] = {
    ...history[lastHistoryIndex],
    totalSquaredError,
    evaluated: true,
    centroids: cloneCentroids(centroids),
  };

  const clusterSummaries = summarizeClusters(points, labels, centroids);
  const sampleRandom = createSeededRandom(seed + 200003);
  const sampleIndices = sampleIndicesWithoutReplacement(points.length, sampleSize, sampleRandom);
  const sample = sampleIndices.map((pointIndex) => {
    const point = points[pointIndex];
    const cluster = labels[pointIndex];
    return {
      ...point,
      pointIndex,
      cluster,
      distance: Math.sqrt(squaredDistance(point, centroids[cluster])),
    };
  });
  const durationMs = now() - startedAt;

  return {
    k,
    batchSize,
    maxIterations,
    evaluationInterval,
    stableIterationsRequired,
    tolerance,
    seed,
    initialization,
    initialCentroids,
    finalCentroids: cloneCentroids(centroids),
    labels: [...labels],
    history,
    errorHistory: history
      .filter(({ totalSquaredError: error }) => Number.isFinite(error))
      .map(({ iteration, totalSquaredError: error }) => ({ iteration, totalSquaredError: error })),
    clusterSummaries,
    summaries: clusterSummaries,
    centroidUpdateCounts: [...centroidUpdateCounts],
    converged,
    iterations,
    processedPointCount,
    initialTotalSquaredError,
    totalSquaredError,
    sample,
    sampleIndices,
    durationMs,
  };
}
