import assert from 'node:assert/strict';
import test from 'node:test';
import { cloneObservationsClusterDataset } from '../src/features/kmeans/data/observationsClusterDataset.js';
import {
  runKMeans,
  squaredDistance,
  traceKMeansPlusPlusInitialization,
} from '../src/features/kmeans/lib/kmeans.js';
import { runKMeansComparison } from '../src/features/kmeans/lib/kmeansComparison.js';
import {
  generateSyntheticClusterDataset,
  runMiniBatchKMeans,
} from '../src/features/kmeans/lib/minibatchKmeans.js';

const tracePoints = [
  { id: 1, x: 0, y: 0 },
  { id: 2, x: 2, y: 0 },
  { id: 3, x: 5, y: 0 },
  { id: 4, x: 0, y: 4 },
  { id: 5, x: 6, y: 5 },
];

function assertNear(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: esperado ${expected}, recebido ${actual}`,
  );
}

function assertNonIncreasing(history, label) {
  for (let index = 1; index < history.length; index += 1) {
    assert.ok(
      history[index].totalSquaredError <= history[index - 1].totalSquaredError + 1e-9,
      `${label}: o EQT subiu na iteração ${index}`,
    );
  }
}

test('trace do K-Means++ é determinístico e preserva a inicialização legada', () => {
  const options = { k: 4, seed: 73 };
  const first = traceKMeansPlusPlusInitialization(tracePoints, options);
  const second = traceKMeansPlusPlusInitialization(tracePoints, options);
  const legacy = runKMeans(tracePoints, {
    ...options,
    initialization: 'kmeans++',
    maxIterations: 5,
  });

  assert.deepEqual(first, second);
  assert.deepEqual(first.centroids, legacy.iterations[0].centroids);
  assert.deepEqual(first.initialCentroids, first.centroids);
  assert.equal(first.steps.length, options.k);
  assert.equal(new Set(first.selectedIndices).size, options.k);
});

test('trace do K-Means++ registra pesos D² e probabilidades normalizadas', () => {
  const trace = traceKMeansPlusPlusInitialization(tracePoints, { k: 4, seed: 19 });

  trace.steps.slice(1).forEach((step, stepIndex) => {
    const previousCentroids = trace.steps[stepIndex].centroids;

    tracePoints.forEach((point, pointIndex) => {
      const expectedDistanceSquared = Math.min(
        ...previousCentroids.map((centroid) => squaredDistance(point, centroid)),
      );
      assertNear(
        step.distancesSquared[pointIndex],
        expectedDistanceSquared,
        1e-12,
        `D² do ponto ${pointIndex + 1}`,
      );

      const candidate = step.candidates[pointIndex];
      const expectedWeight = candidate.isAlreadyChosen ? 0 : expectedDistanceSquared;
      assertNear(step.weights[pointIndex], expectedWeight, 1e-12, `peso do ponto ${pointIndex + 1}`);
    });

    if (step.totalWeight > 0) {
      assertNear(
        step.probabilities.reduce((sum, probability) => sum + probability, 0),
        1,
        1e-12,
        'soma das probabilidades',
      );
      assertNear(
        step.selectionProbability,
        step.weights[step.selectedIndex] / step.totalWeight,
        1e-12,
        'probabilidade do centroide escolhido',
      );
    }
  });
});

test('comparação usa o mesmo Lloyd, mantém EQT monotônico e escolhe vencedor deterministicamente', () => {
  const points = cloneObservationsClusterDataset();
  const options = {
    k: 4,
    maxIterations: 50,
    tolerance: 0.0001,
    seed: 104,
    classicInitialization: 'random',
  };
  const first = runKMeansComparison(points, options);
  const second = runKMeansComparison(points, options);

  assert.deepEqual(first, second);
  assertNonIncreasing(first.classic.errorHistory, 'K-Means clássico');
  assertNonIncreasing(first.plusPlus.errorHistory, 'K-Means++');
  assert.deepEqual(first.initializationTrace.centroids, first.plusPlus.iterations[0].centroids);
  assert.equal(first.metrics.classic.finalEqt, first.classic.totalSquaredError);
  assert.equal(first.metrics.plusPlus.finalEqt, first.plusPlus.totalSquaredError);
  assert.equal(
    first.comparisonHistory.length,
    Math.max(first.classic.errorHistory.length, first.plusPlus.errorHistory.length),
  );

  const difference = first.metrics.finalEqtDifference;
  if (Math.abs(difference) > first.options.winnerTolerance) {
    assert.equal(first.winner.method, difference > 0 ? 'kmeans++' : 'classic');
    assert.equal(first.winner.reason, 'lower-final-eqt');
  } else if (first.metrics.iterationDifference !== 0) {
    assert.equal(first.winner.method, first.metrics.iterationDifference > 0 ? 'kmeans++' : 'classic');
    assert.equal(first.winner.reason, 'fewer-iterations');
  } else {
    assert.equal(first.winner.method, 'tie');
  }
});

test('geração sintética seeded é reproduzível e cobre todos os clusters', () => {
  const options = { pointCount: 2000, k: 5, spread: 0.7, separation: 7, seed: 2026 };
  const first = generateSyntheticClusterDataset(options);
  const second = generateSyntheticClusterDataset(options);
  const otherSeed = generateSyntheticClusterDataset({ ...options, seed: 2027 });

  assert.deepEqual(first, second);
  assert.notDeepEqual(first.points.slice(0, 20), otherSeed.points.slice(0, 20));
  assert.equal(first.points.length, options.pointCount);
  assert.equal(new Set(first.points.map(({ id }) => id)).size, options.pointCount);
  assert.deepEqual(
    [...new Set(first.points.map(({ sourceCluster }) => sourceCluster))].sort((a, b) => a - b),
    [0, 1, 2, 3, 4],
  );
  first.points.forEach((point) => {
    assert.ok(Number.isFinite(point.x));
    assert.ok(Number.isFinite(point.y));
  });
});

test('MiniBatchKMeans é determinístico, incremental e retorna métricas e amostra', () => {
  const { points } = generateSyntheticClusterDataset({
    pointCount: 2000,
    k: 4,
    spread: 0.75,
    seed: 81,
  });
  const options = {
    k: 4,
    batchSize: 128,
    maxIterations: 40,
    tolerance: 0,
    evaluationInterval: 5,
    stableIterations: 3,
    sampleSize: 120,
    seed: 91,
  };
  const first = runMiniBatchKMeans(points, options);
  const second = runMiniBatchKMeans(points, options);
  const { durationMs: firstDuration, ...firstDeterministicResult } = first;
  const { durationMs: secondDuration, ...secondDeterministicResult } = second;

  assert.deepEqual(firstDeterministicResult, secondDeterministicResult);
  assert.ok(firstDuration >= 0);
  assert.ok(secondDuration >= 0);
  assert.equal(first.labels.length, points.length);
  assert.equal(first.sample.length, options.sampleSize);
  assert.equal(first.sampleIndices.length, options.sampleSize);
  assert.equal(first.clusterSummaries.reduce((sum, summary) => sum + summary.count, 0), points.length);
  assert.equal(
    first.centroidUpdateCounts.reduce((sum, count) => sum + count, 0),
    first.processedPointCount,
  );
  assert.equal(first.errorHistory[0].iteration, 0);
  assert.equal(first.errorHistory.at(-1).iteration, first.iterations);
  assert.ok(Number.isFinite(first.totalSquaredError));
  assert.ok(first.totalSquaredError >= 0);
  assert.ok(first.finalCentroids.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
  assert.ok(points.every((point) => !Object.hasOwn(point, 'cluster')));
});

test('MiniBatchKMeans processa 10 mil pontos sem criar uma amostra visual pesada', () => {
  const { points } = generateSyntheticClusterDataset({
    pointCount: 10000,
    k: 6,
    spread: 1.1,
    seed: 314,
  });
  const result = runMiniBatchKMeans(points, {
    k: 6,
    batchSize: 256,
    maxIterations: 8,
    tolerance: 0,
    evaluationInterval: 4,
    stableIterations: 3,
    sampleSize: 250,
    seed: 2718,
  });

  assert.equal(result.labels.length, 10000);
  assert.equal(result.sample.length, 250);
  assert.equal(result.clusterSummaries.reduce((sum, summary) => sum + summary.count, 0), 10000);
  assert.ok(Number.isFinite(result.totalSquaredError));
  assert.equal(result.history.length, result.iterations + 1);
});
