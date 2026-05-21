import { digitMatrices, matrixToVector } from '../data/digits.js';

function similarityScore(inputVector, referenceVector) {
  const matches = inputVector.reduce((total, value, index) => {
    return total + (value === referenceVector[index] ? 1 : -1);
  }, 0);

  return Number((matches / inputVector.length).toFixed(2));
}

export function simulatePrediction(matrix) {
  const inputVector = matrixToVector(matrix);
  const outputs = Object.entries(digitMatrices).map(([digit, reference]) => ({
    digit: Number(digit),
    activation: similarityScore(inputVector, matrixToVector(reference)),
  }));

  const winner = outputs.reduce((best, item) => (item.activation > best.activation ? item : best), outputs[0]);

  return {
    predictedDigit: winner.digit,
    confidence: Number(((winner.activation + 1) / 2).toFixed(2)),
    outputs,
  };
}

export function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}
