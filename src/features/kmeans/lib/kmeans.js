function assertPoint(point, label) {
  if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) {
    throw new TypeError(`${label} deve possuir coordenadas x e y numéricas.`);
  }
}

function cloneCentroids(centroids) {
  return centroids.map(({ x, y }) => ({ x, y }));
}

export function createSeededRandom(seed = 42) {
  let state = Math.trunc(Math.abs(Number(seed))) % 2147483647;
  if (state === 0) state = 1;

  return function random() {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export function squaredDistance(a, b) {
  assertPoint(a, 'O primeiro ponto');
  assertPoint(b, 'O segundo ponto');
  const dx = Number(a.x) - Number(b.x);
  const dy = Number(a.y) - Number(b.y);
  return dx * dx + dy * dy;
}

export function euclideanDistance(a, b) {
  return Math.sqrt(squaredDistance(a, b));
}

export function assignPointsToCentroids(points, centroids) {
  if (!centroids.length) throw new RangeError('Informe pelo menos um centroide.');

  return points.map((point) => {
    let nearest = 0;
    let nearestDistance = squaredDistance(point, centroids[0]);

    for (let cluster = 1; cluster < centroids.length; cluster += 1) {
      const distance = squaredDistance(point, centroids[cluster]);
      if (distance < nearestDistance) {
        nearest = cluster;
        nearestDistance = distance;
      }
    }

    return nearest;
  });
}

export function recomputeCentroids(points, labels, k, previousCentroids = []) {
  const totals = Array.from({ length: k }, () => ({ x: 0, y: 0, count: 0 }));

  points.forEach((point, index) => {
    const cluster = labels[index];
    if (!Number.isInteger(cluster) || cluster < 0 || cluster >= k) {
      throw new RangeError(`Rótulo inválido na posição ${index}.`);
    }
    totals[cluster].x += Number(point.x);
    totals[cluster].y += Number(point.y);
    totals[cluster].count += 1;
  });

  return totals.map((total, cluster) => {
    if (total.count === 0) {
      const fallback = previousCentroids[cluster] ?? points[cluster % points.length];
      return { x: Number(fallback.x), y: Number(fallback.y) };
    }
    return { x: total.x / total.count, y: total.y / total.count };
  });
}

export function computeTotalSquaredError(points, labels, centroids) {
  return points.reduce((sum, point, index) => sum + squaredDistance(point, centroids[labels[index]]), 0);
}

function initializeDidactic(points, k) {
  return Array.from({ length: k }, (_, index) => {
    const point = points[Math.min(points.length - 1, Math.floor((index * points.length) / k))];
    return { x: Number(point.x), y: Number(point.y) };
  });
}

function initializeRandom(points, k, random) {
  const indices = points.map((_, index) => index);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [indices[index], indices[swapWith]] = [indices[swapWith], indices[index]];
  }
  return indices.slice(0, k).map((index) => ({ x: Number(points[index].x), y: Number(points[index].y) }));
}

function initializeKMeansPlusPlus(points, k, random) {
  const firstIndex = Math.floor(random() * points.length);
  const chosen = new Set([firstIndex]);
  const centroids = [{ x: Number(points[firstIndex].x), y: Number(points[firstIndex].y) }];

  while (centroids.length < k) {
    const weights = points.map((point, index) => {
      if (chosen.has(index)) return 0;
      return Math.min(...centroids.map((centroid) => squaredDistance(point, centroid)));
    });
    const total = weights.reduce((sum, weight) => sum + weight, 0);

    let selectedIndex;
    if (total === 0) {
      selectedIndex = points.findIndex((_, index) => !chosen.has(index));
    } else {
      let target = random() * total;
      selectedIndex = weights.length - 1;
      for (let index = 0; index < weights.length; index += 1) {
        target -= weights[index];
        if (target <= 0 && !chosen.has(index)) {
          selectedIndex = index;
          break;
        }
      }
    }

    chosen.add(selectedIndex);
    centroids.push({ x: Number(points[selectedIndex].x), y: Number(points[selectedIndex].y) });
  }

  return centroids;
}

export function traceKMeansPlusPlusInitialization(points, options = {}) {
  if (!Array.isArray(points) || points.length === 0) {
    throw new RangeError('O K-Means++ precisa de pelo menos um ponto.');
  }
  points.forEach((point, index) => assertPoint(point, `O ponto ${index + 1}`));

  const k = Math.trunc(Number(options.k ?? 4));
  const seed = Number.isFinite(Number(options.seed)) ? Number(options.seed) : 42;

  if (!Number.isInteger(k) || k < 1 || k > points.length) {
    throw new RangeError(`K deve estar entre 1 e ${points.length}.`);
  }

  const random = createSeededRandom(seed);
  const firstRandomValue = random();
  const firstIndex = Math.floor(firstRandomValue * points.length);
  const chosen = new Set([firstIndex]);
  const centroids = [{ x: Number(points[firstIndex].x), y: Number(points[firstIndex].y) }];
  const selectedIndices = [firstIndex];
  const steps = [
    {
      step: 1,
      kind: 'first-centroid',
      selectedIndex: firstIndex,
      selectedPointId: points[firstIndex].id ?? firstIndex + 1,
      selectedCentroid: { ...centroids[0] },
      randomValue: firstRandomValue,
      totalWeight: null,
      selectionProbability: null,
      distancesSquared: null,
      weights: null,
      probabilities: null,
      candidates: points.map((point, index) => ({
        index,
        id: point.id ?? index + 1,
        x: Number(point.x),
        y: Number(point.y),
        distanceSquared: null,
        weight: null,
        probability: null,
        isAlreadyChosen: index === firstIndex,
        isSelected: index === firstIndex,
      })),
      centroids: cloneCentroids(centroids),
    },
  ];

  while (centroids.length < k) {
    const chosenBeforeSelection = new Set(chosen);
    const distancesSquared = points.map((point) =>
      Math.min(...centroids.map((centroid) => squaredDistance(point, centroid))),
    );
    const weights = distancesSquared.map((distance, index) =>
      chosenBeforeSelection.has(index) ? 0 : distance,
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const probabilities = weights.map((weight) => (totalWeight === 0 ? 0 : weight / totalWeight));

    let selectedIndex;
    let randomValue = null;
    let target = null;

    if (totalWeight === 0) {
      selectedIndex = points.findIndex((_, index) => !chosenBeforeSelection.has(index));
    } else {
      randomValue = random();
      target = randomValue * totalWeight;
      let remainingTarget = target;
      selectedIndex = weights.length - 1;

      for (let index = 0; index < weights.length; index += 1) {
        remainingTarget -= weights[index];
        if (remainingTarget <= 0 && !chosenBeforeSelection.has(index)) {
          selectedIndex = index;
          break;
        }
      }
    }

    chosen.add(selectedIndex);
    selectedIndices.push(selectedIndex);
    const selectedCentroid = {
      x: Number(points[selectedIndex].x),
      y: Number(points[selectedIndex].y),
    };
    centroids.push(selectedCentroid);

    steps.push({
      step: centroids.length,
      kind: totalWeight === 0 ? 'fallback' : 'distance-weighted',
      selectedIndex,
      selectedPointId: points[selectedIndex].id ?? selectedIndex + 1,
      selectedCentroid: { ...selectedCentroid },
      randomValue,
      target,
      totalWeight,
      selectionProbability: probabilities[selectedIndex],
      distancesSquared: [...distancesSquared],
      weights: [...weights],
      probabilities: [...probabilities],
      candidates: points.map((point, index) => ({
        index,
        id: point.id ?? index + 1,
        x: Number(point.x),
        y: Number(point.y),
        distanceSquared: distancesSquared[index],
        weight: weights[index],
        probability: probabilities[index],
        isAlreadyChosen: chosenBeforeSelection.has(index),
        isSelected: index === selectedIndex,
      })),
      centroids: cloneCentroids(centroids),
    });
  }

  return {
    k,
    seed,
    centroids: cloneCentroids(centroids),
    initialCentroids: cloneCentroids(centroids),
    selectedIndices: [...selectedIndices],
    steps,
  };
}

function initializeCentroids(points, k, initialization, seed) {
  const random = createSeededRandom(seed);
  if (initialization === 'random') return initializeRandom(points, k, random);
  if (initialization === 'kmeans++') return initializeKMeansPlusPlus(points, k, random);
  return initializeDidactic(points, k);
}

function summarizeClusters(points, labels, centroids) {
  return centroids.map((centroid, cluster) => {
    const memberDistances = points
      .map((point, index) => (labels[index] === cluster ? euclideanDistance(point, centroid) : null))
      .filter((distance) => distance !== null);
    const squaredErrors = memberDistances.map((distance) => distance * distance);

    return {
      cluster,
      centroid: { ...centroid },
      count: memberDistances.length,
      totalSquaredError: squaredErrors.reduce((sum, value) => sum + value, 0),
      meanDistance: memberDistances.length
        ? memberDistances.reduce((sum, value) => sum + value, 0) / memberDistances.length
        : 0,
      maxDistance: memberDistances.length ? Math.max(...memberDistances) : 0,
    };
  });
}

export function runKMeans(points, options = {}) {
  if (!Array.isArray(points) || points.length === 0) {
    throw new RangeError('O K-Means precisa de pelo menos um ponto.');
  }
  points.forEach((point, index) => assertPoint(point, `O ponto ${index + 1}`));

  const k = Math.trunc(Number(options.k ?? 4));
  const maxIterations = Math.max(1, Math.trunc(Number(options.maxIterations ?? 50)));
  const tolerance = Math.max(0, Number(options.tolerance ?? 0.0001));
  const initialization = ['didactic', 'random', 'kmeans++'].includes(options.initialization)
    ? options.initialization
    : 'didactic';
  const seed = Number.isFinite(Number(options.seed)) ? Number(options.seed) : 42;

  if (!Number.isInteger(k) || k < 1 || k > points.length) {
    throw new RangeError(`K deve estar entre 1 e ${points.length}.`);
  }

  let centroids = initializeCentroids(points, k, initialization, seed);
  let labels = assignPointsToCentroids(points, centroids);
  let totalSquaredError = computeTotalSquaredError(points, labels, centroids);
  const iterations = [
    { iteration: 0, centroids: cloneCentroids(centroids), labels: [...labels], totalSquaredError },
  ];
  let converged = false;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const nextCentroids = recomputeCentroids(points, labels, k, centroids);
    const movement = Math.max(
      ...centroids.map((centroid, index) => euclideanDistance(centroid, nextCentroids[index])),
    );
    centroids = nextCentroids;
    labels = assignPointsToCentroids(points, centroids);
    totalSquaredError = computeTotalSquaredError(points, labels, centroids);
    iterations.push({
      iteration,
      centroids: cloneCentroids(centroids),
      labels: [...labels],
      totalSquaredError,
    });

    if (movement <= tolerance) {
      converged = true;
      break;
    }
  }

  return {
    k,
    finalCentroids: cloneCentroids(centroids),
    labels: [...labels],
    iterations,
    errorHistory: iterations.map(({ iteration, totalSquaredError: error }) => ({ iteration, totalSquaredError: error })),
    clusterSummaries: summarizeClusters(points, labels, centroids),
    converged,
    totalSquaredError,
  };
}
