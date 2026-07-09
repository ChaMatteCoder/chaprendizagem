import assert from 'node:assert/strict';
import test from 'node:test';
import { cloneObservationsClusterDataset } from '../src/features/kmeans/data/observationsClusterDataset.js';
import { runKMeans } from '../src/features/kmeans/lib/kmeans.js';

const defaultDidacticOptions = {
  k: 4,
  maxIterations: 50,
  tolerance: 0.0001,
  initialization: 'didactic',
  seed: 42,
};

const expectedCentroids = [
  { x: 2.05879, y: 1.75523 },
  { x: 8.21073, y: 8.56736 },
  { x: 1.3399, y: 8.74456 },
  { x: 9.01761, y: 2.29572 },
];

function assertNear(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test('K-Means didatico converge na base de observacoes padrao', () => {
  const result = runKMeans(cloneObservationsClusterDataset(), defaultDidacticOptions);

  assert.equal(result.converged, true);
  assert.equal(result.k, 4);
  assert.deepEqual(
    result.clusterSummaries.map((cluster) => cluster.count),
    [10, 10, 10, 10],
  );

  result.finalCentroids.forEach((centroid, index) => {
    assertNear(centroid.x, expectedCentroids[index].x, 0.0001, `centroid ${index + 1} x`);
    assertNear(centroid.y, expectedCentroids[index].y, 0.0001, `centroid ${index + 1} y`);
  });

  assertNear(result.totalSquaredError, 76.2382, 0.0001, 'final EQT');
});
