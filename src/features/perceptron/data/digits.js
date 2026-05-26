export const digitMatrices = {
  0: [
    [-1, 1, 1, -1],
    [1, -1, -1, 1],
    [1, -1, -1, 1],
    [1, -1, -1, 1],
    [-1, 1, 1, -1],
  ],
  1: [
    [-1, -1, 1, -1],
    [-1, 1, 1, -1],
    [-1, -1, 1, -1],
    [-1, -1, 1, -1],
    [-1, 1, 1, 1],
  ],
  2: [
    [-1, 1, 1, -1],
    [1, -1, -1, 1],
    [-1, -1, 1, -1],
    [-1, 1, -1, -1],
    [1, 1, 1, 1],
  ],
  3: [
    [1, 1, 1, -1],
    [-1, -1, -1, 1],
    [-1, 1, 1, -1],
    [-1, -1, -1, 1],
    [1, 1, 1, -1],
  ],
  4: [
    [1, -1, -1, 1],
    [1, -1, -1, 1],
    [1, 1, 1, 1],
    [-1, -1, -1, 1],
    [-1, -1, -1, 1],
  ],
  5: [
    [1, 1, 1, 1],
    [1, -1, -1, -1],
    [1, 1, 1, -1],
    [-1, -1, -1, 1],
    [1, 1, 1, -1],
  ],
  6: [
    [-1, 1, 1, 1],
    [1, -1, -1, -1],
    [1, 1, 1, -1],
    [1, -1, -1, 1],
    [-1, 1, 1, -1],
  ],
  7: [
    [1, 1, 1, 1],
    [-1, -1, -1, 1],
    [-1, -1, 1, -1],
    [-1, 1, -1, -1],
    [-1, 1, -1, -1],
  ],
  8: [
    [-1, 1, 1, -1],
    [1, -1, -1, 1],
    [-1, 1, 1, -1],
    [1, -1, -1, 1],
    [-1, 1, 1, -1],
  ],
  9: [
    [-1, 1, 1, -1],
    [1, -1, -1, 1],
    [-1, 1, 1, 1],
    [-1, -1, -1, 1],
    [1, 1, 1, -1],
  ],
};

export const futureStudies = [
  {
    title: 'Reconhecimento de Letras',
    status: 'Em breve',
    description: 'Generalizar a representação 4x5 para padrões de letras maiúsculas.',
  },
  {
    title: 'Símbolos',
    status: 'Em breve',
    description: 'Classificar padrões simples como soma, comparação e outros sinais.',
  },
  {
    title: 'Operações Simples',
    status: 'Em breve',
    description: 'Investigar composições de perceptrons em problemas elementares.',
  },
];

export function matrixToVector(matrix) {
  return matrix.flat();
}

export function expectedOutput(correctDigit) {
  return Array.from({ length: 10 }, (_, digit) => (digit === Number(correctDigit) ? 1 : -1));
}

export function emptyMatrix() {
  return Array.from({ length: 5 }, () => Array.from({ length: 4 }, () => -1));
}
