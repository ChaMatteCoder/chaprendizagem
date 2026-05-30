export function parseObservations(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const dataLines = /^[a-zA-Z]/.test(lines[0] ?? '') ? lines.slice(1) : lines;

  return dataLines.map((line, index) => {
    const [x, y] = line.split(/[\s;,]+/).map(Number);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`Linha ${index + 1}: informe valores numéricos para x e y.`);
    }

    return { id: index + 1, x, y };
  });
}

export function validateRegressionRows(rows) {
  if (rows.length < 2) {
    throw new Error('Use pelo menos 2 pontos para simular a regressão.');
  }

  return rows.map((row, index) => {
    const x = Number(row.x);
    const y = Number(row.y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`Linha ${index + 1}: x e y precisam ser números válidos.`);
    }

    return { id: index + 1, x, y };
  });
}

export function normalizeX(base) {
  const values = base.map((item) => item.x);
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  const standardDeviation = Math.sqrt(variance) || 1;

  return {
    mean,
    standardDeviation,
    data: base.map((item) => ({
      ...item,
      xNormalized: (item.x - mean) / standardDeviation,
    })),
  };
}

export function denormalizeAdalineCoefficients(weight, bias, normalization) {
  const slope = weight / normalization.standardDeviation;
  const intercept = bias - (weight * normalization.mean) / normalization.standardDeviation;

  return { slope, intercept };
}

export function trainRegressionAdaline(base, learningRate = 0.01, epochs = 100) {
  const normalized = normalizeX(base);
  let weight = 0;
  let bias = 0;
  const errorHistory = [];

  for (let epoch = 1; epoch <= epochs; epoch += 1) {
    let totalSquaredError = 0;

    for (const sample of normalized.data) {
      const yPred = weight * sample.xNormalized + bias;
      const error = sample.y - yPred;

      weight += learningRate * error * sample.xNormalized;
      bias += learningRate * error;
      totalSquaredError += error ** 2;
    }

    errorHistory.push({
      epoch,
      error: Number(totalSquaredError.toFixed(6)),
    });
  }

  const denormalized = denormalizeAdalineCoefficients(weight, bias, normalized);

  return {
    normalizedWeight: weight,
    normalizedBias: bias,
    weight: denormalized.slope,
    bias: denormalized.intercept,
    errorHistory,
    finalError: errorHistory.at(-1)?.error ?? 0,
  };
}

export function calculateClassicRegression(base) {
  const meanX = average(base.map((item) => item.x));
  const meanY = average(base.map((item) => item.y));
  const numerator = base.reduce((sum, item) => sum + (item.x - meanX) * (item.y - meanY), 0);
  const denominator = base.reduce((sum, item) => sum + (item.x - meanX) ** 2, 0);
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;

  return { slope, intercept, meanX, meanY };
}

export function calculatePearson(base) {
  const meanX = average(base.map((item) => item.x));
  const meanY = average(base.map((item) => item.y));
  const numerator = base.reduce((sum, item) => sum + (item.x - meanX) * (item.y - meanY), 0);
  const sumX = base.reduce((sum, item) => sum + (item.x - meanX) ** 2, 0);
  const sumY = base.reduce((sum, item) => sum + (item.y - meanY) ** 2, 0);
  const denominator = Math.sqrt(sumX * sumY);

  return denominator === 0 ? 0 : numerator / denominator;
}

export function classifyCorrelation(r) {
  const absolute = Math.abs(r);

  if (absolute >= 0.9) return 'muito forte';
  if (absolute >= 0.7) return 'forte';
  if (absolute >= 0.5) return 'moderada';
  if (absolute >= 0.3) return 'fraca';
  return 'muito fraca';
}

export function buildLineData(base, slope, intercept, key) {
  const xValues = base.map((item) => item.x);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);

  return [minX, maxX].map((x) => ({
    x,
    [key]: slope * x + intercept,
  }));
}

export function generateRegressionComment({ adaline, classic, pearson, rSquared }) {
  const direction = pearson >= 0 ? 'positiva' : 'negativa';
  const correlation = classifyCorrelation(pearson);
  const slopeDistance = Math.abs(adaline.weight - classic.slope);
  const biasDistance = Math.abs(adaline.bias - classic.intercept);
  const firstError = adaline.errorHistory[0]?.error ?? 0;
  const errorFell = adaline.finalError < firstError;
  const closeFit = slopeDistance < 0.05 && biasDistance < 0.15;
  const learningRateText = errorFell
    ? 'A queda do erro indica que a taxa de aprendizagem escolhida está adequada para esta simulação.'
    : 'Como o erro não diminuiu de forma clara, vale testar uma taxa de aprendizagem menor ou mais épocas.';

  return `Os dados apresentam tendência linear ${direction} com correlação ${correlation}. O coeficiente de Pearson ficou em ${formatNumber(
    pearson,
  )}, e o R² de ${formatNumber(rSquared)} indica ${
    rSquared >= 0.8 ? 'bom poder explicativo da reta' : 'poder explicativo limitado para uma reta simples'
  }. A reta aprendida pela Adaline ${
    closeFit ? 'ficou muito próxima' : 'ficou parcialmente próxima'
  } da regressão linear clássica: a diferença no coeficiente angular foi ${formatNumber(
    slopeDistance,
  )} e a diferença no intercepto foi ${formatNumber(biasDistance)}. ${learningRateText}`;
}

export function formatNumber(value, digits = 4) {
  return Number(value).toFixed(digits);
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
