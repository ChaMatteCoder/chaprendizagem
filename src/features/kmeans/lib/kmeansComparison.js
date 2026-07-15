import { runKMeans, traceKMeansPlusPlusInitialization } from './kmeans.js';
import { computeErrorReduction } from './kmeansMetrics.js';

const CLASSIC_INITIALIZATIONS = new Set(['didactic', 'random']);

function normalizeFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function buildMethodMetrics(result) {
  const initialEqt = result.errorHistory[0]?.totalSquaredError ?? result.totalSquaredError;
  const iterations = Math.max(0, result.iterations.length - 1);

  return {
    initialEqt,
    finalEqt: result.totalSquaredError,
    errorReductionPercentage: computeErrorReduction(result.errorHistory),
    iterations,
    converged: result.converged,
    clusterCounts: result.clusterSummaries.map(({ count }) => count),
    eqtByCluster: result.clusterSummaries.map(({ totalSquaredError }) => totalSquaredError),
  };
}

function chooseWinner(classicMetrics, plusPlusMetrics, tolerance) {
  const finalEqtDifference = classicMetrics.finalEqt - plusPlusMetrics.finalEqt;

  if (Math.abs(finalEqtDifference) > tolerance) {
    const method = finalEqtDifference > 0 ? 'kmeans++' : 'classic';
    return {
      method,
      label: method === 'kmeans++' ? 'K-Means++' : 'K-Means clássico',
      reason: 'lower-final-eqt',
      explanation: method === 'kmeans++'
        ? 'O K-Means++ terminou com menor erro quadrático total.'
        : 'O K-Means clássico terminou com menor erro quadrático total nesta execução.',
    };
  }

  if (classicMetrics.iterations !== plusPlusMetrics.iterations) {
    const method = classicMetrics.iterations < plusPlusMetrics.iterations ? 'classic' : 'kmeans++';
    return {
      method,
      label: method === 'kmeans++' ? 'K-Means++' : 'K-Means clássico',
      reason: 'fewer-iterations',
      explanation: method === 'kmeans++'
        ? 'Os métodos chegaram a EQTs equivalentes, mas o K-Means++ precisou de menos iterações.'
        : 'Os métodos chegaram a EQTs equivalentes, mas o K-Means clássico precisou de menos iterações.',
    };
  }

  return {
    method: 'tie',
    label: 'Empate técnico',
    reason: 'equivalent-result',
    explanation: 'Os métodos terminaram com EQTs equivalentes e o mesmo número de iterações.',
  };
}

function combineErrorHistories(classicHistory, plusPlusHistory) {
  const length = Math.max(classicHistory.length, plusPlusHistory.length);

  return Array.from({ length }, (_, iteration) => ({
    iteration,
    classicTotalSquaredError: classicHistory[iteration]?.totalSquaredError ?? null,
    plusPlusTotalSquaredError: plusPlusHistory[iteration]?.totalSquaredError ?? null,
  }));
}

export function runKMeansComparison(points, options = {}) {
  const classicInitialization = options.classicInitialization ?? options.initialization ?? 'random';
  if (!CLASSIC_INITIALIZATIONS.has(classicInitialization)) {
    throw new RangeError('A inicialização clássica deve ser "didactic" ou "random".');
  }

  const commonOptions = {
    k: Math.trunc(normalizeFiniteNumber(options.k, 4)),
    maxIterations: Math.max(1, Math.trunc(normalizeFiniteNumber(options.maxIterations, 50))),
    tolerance: Math.max(0, normalizeFiniteNumber(options.tolerance, 0.0001)),
    seed: normalizeFiniteNumber(options.seed, 42),
  };
  const winnerTolerance = Math.max(0, normalizeFiniteNumber(options.winnerTolerance, 1e-9));

  const classic = runKMeans(points, {
    ...commonOptions,
    initialization: classicInitialization,
  });
  const plusPlus = runKMeans(points, {
    ...commonOptions,
    initialization: 'kmeans++',
  });
  const initializationTrace = traceKMeansPlusPlusInitialization(points, {
    k: commonOptions.k,
    seed: commonOptions.seed,
  });
  const classicMetrics = buildMethodMetrics(classic);
  const plusPlusMetrics = buildMethodMetrics(plusPlus);
  const finalEqtDifference = classicMetrics.finalEqt - plusPlusMetrics.finalEqt;

  return {
    options: {
      ...commonOptions,
      classicInitialization,
      winnerTolerance,
    },
    classic,
    plusPlus,
    initializationTrace,
    comparisonHistory: combineErrorHistories(classic.errorHistory, plusPlus.errorHistory),
    metrics: {
      classic: classicMetrics,
      plusPlus: plusPlusMetrics,
      finalEqtDifference,
      iterationDifference: classicMetrics.iterations - plusPlusMetrics.iterations,
      relativeFinalEqtImprovement: classicMetrics.finalEqt === 0
        ? 0
        : (finalEqtDifference / classicMetrics.finalEqt) * 100,
    },
    winner: chooseWinner(classicMetrics, plusPlusMetrics, winnerTolerance),
  };
}
