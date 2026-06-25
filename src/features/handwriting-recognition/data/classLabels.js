export const recognitionModes = {
  digits: {
    id: 'digits',
    label: 'Dígitos 0-9',
    shortLabel: 'Dígitos',
    dataset: 'MNIST',
    classes: Array.from({ length: 10 }, (_, index) => String(index)),
    outputNeurons: 10,
    description:
      'Modo inspirado conceitualmente no MNIST: imagens pequenas, em escala de cinza, com dígitos manuscritos centralizados.',
  },
  letters: {
    id: 'letters',
    label: 'Letras A-Z',
    shortLabel: 'Letras',
    dataset: 'EMNIST Letters',
    classes: Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index)),
    outputNeurons: 26,
    description:
      'Modo inspirado conceitualmente no EMNIST Letters: letras maiúsculas manuscritas tratadas como matrizes 28×28.',
  },
  all: {
    id: 'all',
    label: 'Todos',
    shortLabel: '0-9 + A-Z',
    dataset: 'MNIST + EMNIST Letters',
    classes: [
      ...Array.from({ length: 10 }, (_, index) => String(index)),
      ...Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index)),
    ],
    outputNeurons: 36,
    description:
      'Modo alfanumérico: reconhece dígitos de 0 a 9 e letras de A a Z usando um modelo combinado treinado com MNIST e EMNIST Letters.',
  },
};

export function getModeConfig(mode) {
  return recognitionModes[mode] ?? recognitionModes.digits;
}
