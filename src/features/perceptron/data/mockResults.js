import { digitMatrices } from './digits.js';

// Dados temporários para a primeira versão visual. Substitua por resultados reais
// do treino em Python quando a integração do modelo estiver pronta.
export const trainingMetrics = {
  epochs: 100,
  finalError: 0,
  samples: 10,
  accuracy: 100,
};

export const errorCurve = [
  { epoch: 1, error: 72 },
  { epoch: 5, error: 48 },
  { epoch: 10, error: 32 },
  { epoch: 15, error: 20 },
  { epoch: 20, error: 14 },
  { epoch: 30, error: 8 },
  { epoch: 40, error: 4 },
  { epoch: 55, error: 2 },
  { epoch: 70, error: 1 },
  { epoch: 85, error: 0 },
  { epoch: 100, error: 0 },
];

export const learnedWeights = [
  [-1.2, 0.8, 1.1, -0.9],
  [0.7, -0.6, -0.4, 0.9],
  [0.8, -0.7, -0.5, 0.8],
  [0.7, -0.6, -0.4, 0.9],
  [-1.0, 0.9, 1.0, -0.8],
];

export const testSamples = [
  { label: 0, predicted: 0, matrix: digitMatrices[0], correct: true },
  { label: 3, predicted: 3, matrix: digitMatrices[3], correct: true },
  { label: 7, predicted: 7, matrix: digitMatrices[7], correct: true },
  { label: 8, predicted: 8, matrix: digitMatrices[8], correct: true },
];
