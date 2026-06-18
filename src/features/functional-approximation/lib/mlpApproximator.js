import { calculateRegressionMetrics, roundNumber } from './metrics.js';

const activationFunctions = {
  tanh: {
    label: 'tanh',
    fn: (value) => Math.tanh(value),
    derivativeFromOutput: (output) => 1 - output ** 2,
  },
  sigmoid: {
    label: 'sigmoide',
    fn: (value) => 1 / (1 + Math.exp(-value)),
    derivativeFromOutput: (output) => output * (1 - output),
  },
  relu: {
    label: 'ReLU',
    fn: (value) => Math.max(0, value),
    derivativeFromOutput: (output) => (output > 0 ? 1 : 0),
  },
};

function seededRandom(seed) {
  let state = Math.abs(Math.floor(Number(seed) || 1)) % 2147483647;
  if (state === 0) state = 1;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function randomBetween(random, min, max) {
  return min + (max - min) * random();
}

export function validateFunctionalRows(rows) {
  const parsed = rows.map((row, index) => {
    const x = Number(row.x);
    const t = Number(row.t);

    if (!Number.isFinite(x)) {
      throw new Error(`Linha ${index + 1}: informe um valor numérico para x.`);
    }

    if (!Number.isFinite(t)) {
      throw new Error(`Linha ${index + 1}: informe um valor numérico para t.`);
    }

    return { x, t };
  });

  if (parsed.length < 3) {
    throw new Error('Use pelo menos três pontos para treinar uma curva minimamente interpretável.');
  }

  const xValues = new Set(parsed.map((row) => row.x.toFixed(8)));
  if (xValues.size < 2) {
    throw new Error('A base precisa ter pelo menos dois valores diferentes de x.');
  }

  return parsed.sort((a, b) => a.x - b.x);
}

export function createMlp({ hiddenNeurons = 6, seed = 42, activation = 'tanh' } = {}) {
  const random = seededRandom(seed);
  const hiddenCount = Math.max(1, Math.min(24, Math.floor(Number(hiddenNeurons) || 6)));
  const activationConfig = activationFunctions[activation] ?? activationFunctions.tanh;

  return {
    activation,
    activationConfig,
    hiddenWeights: Array.from({ length: hiddenCount }, () => randomBetween(random, -1, 1)),
    hiddenBiases: Array.from({ length: hiddenCount }, () => randomBetween(random, -0.6, 0.6)),
    outputWeights: Array.from({ length: hiddenCount }, () => randomBetween(random, -0.8, 0.8)),
    outputBias: randomBetween(random, -0.2, 0.2),
  };
}

export function predictWithNetwork(network, x) {
  const hiddenOutputs = network.hiddenWeights.map((weight, index) =>
    network.activationConfig.fn(weight * x + network.hiddenBiases[index]),
  );
  const y = hiddenOutputs.reduce((sum, output, index) => sum + output * network.outputWeights[index], network.outputBias);

  return { hiddenOutputs, y };
}

export function trainMlpApproximator(
  dataset,
  { hiddenNeurons = 6, learningRate = 0.03, epochs = 1200, activation = 'tanh', seed = 42 } = {},
) {
  const cleanDataset = validateFunctionalRows(dataset);
  const eta = Math.max(0.0001, Math.min(1, Number(learningRate) || 0.03));
  const totalEpochs = Math.max(1, Math.min(20000, Math.floor(Number(epochs) || 1200)));
  const network = createMlp({ hiddenNeurons, seed, activation });
  const errorHistory = [];

  for (let epoch = 1; epoch <= totalEpochs; epoch += 1) {
    let squaredErrorSum = 0;

    for (const sample of cleanDataset) {
      const { hiddenOutputs, y } = predictWithNetwork(network, sample.x);
      const error = sample.t - y;
      squaredErrorSum += error ** 2;

      const previousOutputWeights = [...network.outputWeights];

      for (let hiddenIndex = 0; hiddenIndex < hiddenOutputs.length; hiddenIndex += 1) {
        network.outputWeights[hiddenIndex] += eta * error * hiddenOutputs[hiddenIndex];
      }

      network.outputBias += eta * error;

      for (let hiddenIndex = 0; hiddenIndex < hiddenOutputs.length; hiddenIndex += 1) {
        const hiddenGradient =
          error *
          previousOutputWeights[hiddenIndex] *
          network.activationConfig.derivativeFromOutput(hiddenOutputs[hiddenIndex]);

        network.hiddenWeights[hiddenIndex] += eta * hiddenGradient * sample.x;
        network.hiddenBiases[hiddenIndex] += eta * hiddenGradient;
      }
    }

    errorHistory.push({
      epoch,
      mse: roundNumber(squaredErrorSum / cleanDataset.length, 8),
      totalError: roundNumber(squaredErrorSum, 8),
    });
  }

  const predictions = cleanDataset.map((sample, index) => {
    const yPredicted = predictWithNetwork(network, sample.x).y;
    const error = sample.t - yPredicted;

    return {
      index: index + 1,
      x: sample.x,
      t: sample.t,
      yPredicted: roundNumber(yPredicted),
      error: roundNumber(error),
      absoluteError: roundNumber(Math.abs(error)),
    };
  });

  const metrics = calculateRegressionMetrics(predictions.map((row) => ({ t: row.t, error: row.error })));
  const xMin = Math.min(...cleanDataset.map((row) => row.x));
  const xMax = Math.max(...cleanDataset.map((row) => row.x));
  const curve = generateApproximationCurve(network, xMin, xMax, 140);

  return {
    activation,
    activationLabel: network.activationConfig.label,
    curve,
    dataset: cleanDataset,
    epochs: totalEpochs,
    errorHistory,
    hiddenNeurons: network.hiddenWeights.length,
    learningRate: eta,
    metrics,
    network,
    predictions,
    seed: Number(seed) || 1,
  };
}

export function generateApproximationCurve(network, xMin = 0, xMax = 1, steps = 120) {
  const safeSteps = Math.max(2, steps);
  const range = xMax - xMin || 1;

  return Array.from({ length: safeSteps + 1 }, (_, index) => {
    const x = xMin + (range * index) / safeSteps;
    return {
      x: roundNumber(x, 5),
      yPredicted: roundNumber(predictWithNetwork(network, x).y),
    };
  });
}

export function explainTrainingBehavior(result) {
  if (!result?.errorHistory?.length) {
    return 'Treine a MLP para observar como a curva se ajusta aos pontos.';
  }

  const first = result.errorHistory[0].mse;
  const last = result.errorHistory.at(-1).mse;
  const ratio = first > 0 ? last / first : 1;

  if (result.learningRate >= 0.25 && ratio > 0.85) {
    return 'A taxa de aprendizagem parece alta: o erro não caiu de forma clara e a curva pode estar oscilando.';
  }

  if (last < 0.01 && ratio < 0.35) {
    return 'O erro caiu de forma consistente. A rede capturou bem a tendencia curva dos pontos amostrados.';
  }

  if (ratio > 0.75) {
    return 'A rede ainda não aprendeu bem a curva. Tente mais épocas, mais neurônios ou uma taxa um pouco menor.';
  }

  if (result.hiddenNeurons >= 10) {
    return 'Mais neurônios deixam a curva mais flexível. Observe se a rede está generalizando ou apenas contornando os pontos.';
  }

  return 'O treinamento reduziu o erro e produziu uma aproximação razoável para comparar com os pontos reais.';
}
