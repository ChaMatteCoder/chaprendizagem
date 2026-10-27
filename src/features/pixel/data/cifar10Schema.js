/**
 * Esquema canônico da base CIFAR-10, arquitetura da CNN e contratos de ferramentas
 * compartilhados entre treinamento, inferência, Pixel em Pânico! e PixelLab.
 */

export const CIFAR10_CLASSES = Object.freeze([
  Object.freeze({ index: 0, id: 'airplane', en: 'airplane', pt: 'Avião', description: 'Aeronaves comerciais, jatos e bimotores em voo ou pista.' }),
  Object.freeze({ index: 1, id: 'automobile', en: 'automobile', pt: 'Automóvel', description: 'Carros de passeio, sedãs, esportivos e peruas.' }),
  Object.freeze({ index: 2, id: 'bird', en: 'bird', pt: 'Pássaro', description: 'Aves de diferentes portes em galhos, solo ou voo.' }),
  Object.freeze({ index: 3, id: 'cat', en: 'cat', pt: 'Gato', description: 'Gatos domésticos em ambientes internos ou externos.' }),
  Object.freeze({ index: 4, id: 'deer', en: 'deer', pt: 'Cervo', description: 'Cervos e veados em campos, florestas e clareiras.' }),
  Object.freeze({ index: 5, id: 'dog', en: 'dog', pt: 'Cachorro', description: 'Cães de diversas raças e pelagens.' }),
  Object.freeze({ index: 6, id: 'frog', en: 'frog', pt: 'Sapo', description: 'Anfíbios sobre folhas, pedras, água ou terra.' }),
  Object.freeze({ index: 7, id: 'horse', en: 'horse', pt: 'Cavalo', description: 'Cavalos em pastos, pistas ou montaria.' }),
  Object.freeze({ index: 8, id: 'ship', en: 'ship', pt: 'Navio', description: 'Navios cargueiros, veleiros, barcos e transatlânticos.' }),
  Object.freeze({ index: 9, id: 'truck', en: 'truck', pt: 'Caminhão', description: 'Caminhões de carga, carretas e veículos pesados.' }),
]);

export const CIFAR10_CLASS_IDS = Object.freeze(CIFAR10_CLASSES.map((item) => item.id));
export const CIFAR10_CLASS_NAMES_PT = Object.freeze(CIFAR10_CLASSES.map((item) => item.pt));

export const PIXEL_IMAGE_SPEC = Object.freeze({
  width: 32,
  height: 32,
  channels: 3,
  totalValues: 32 * 32 * 3,
  channelNames: Object.freeze(['R', 'G', 'B']),
  channelLabels: Object.freeze(['Vermelho (R)', 'Verde (G)', 'Azul (B)']),
  layout: 'NHWC',
  rawDtype: 'uint8',
  rawRange: Object.freeze([0, 255]),
  modelDtype: 'float32',
  modelRange: Object.freeze([0, 1]),
  normalizationFormula: 'x_norm = x_uint8 / 255.0',
});

export const PIXEL_CNN_ARCHITECTURE = Object.freeze({
  id: 'cifar10-compact-cnn-v1',
  inputShape: Object.freeze([32, 32, 3]),
  outputClasses: 10,
  totalParameters: 61130,
  layers: Object.freeze([
    Object.freeze({
      name: 'input_rgb',
      className: 'InputLayer',
      role: 'Entrada RGB normalizada',
      inputShape: Object.freeze([32, 32, 3]),
      outputShape: Object.freeze([32, 32, 3]),
      kernelShape: null,
      biasShape: null,
      parameters: 0,
      activation: 'identity',
    }),
    Object.freeze({
      name: 'conv2d_1',
      className: 'Conv2D',
      role: '1ª Convolução 3×3 (padding same) + ReLU',
      inputShape: Object.freeze([32, 32, 3]),
      outputShape: Object.freeze([32, 32, 32]),
      kernelShape: Object.freeze([3, 3, 3, 32]),
      biasShape: Object.freeze([32]),
      parameters: 896,
      activation: 'relu',
      padding: 'same',
      strides: Object.freeze([1, 1]),
    }),
    Object.freeze({
      name: 'max_pooling2d_1',
      className: 'MaxPooling2D',
      role: '1º Max Pooling 2×2 (passo 2)',
      inputShape: Object.freeze([32, 32, 32]),
      outputShape: Object.freeze([16, 16, 32]),
      kernelShape: null,
      biasShape: null,
      parameters: 0,
      poolSize: Object.freeze([2, 2]),
      strides: Object.freeze([2, 2]),
    }),
    Object.freeze({
      name: 'conv2d_2',
      className: 'Conv2D',
      role: '2ª Convolução 3×3 (padding same) + ReLU',
      inputShape: Object.freeze([16, 16, 32]),
      outputShape: Object.freeze([16, 16, 64]),
      kernelShape: Object.freeze([3, 3, 32, 64]),
      biasShape: Object.freeze([64]),
      parameters: 18496,
      activation: 'relu',
      padding: 'same',
      strides: Object.freeze([1, 1]),
    }),
    Object.freeze({
      name: 'max_pooling2d_2',
      className: 'MaxPooling2D',
      role: '2º Max Pooling 2×2 (passo 2)',
      inputShape: Object.freeze([16, 16, 64]),
      outputShape: Object.freeze([8, 8, 64]),
      kernelShape: null,
      biasShape: null,
      parameters: 0,
      poolSize: Object.freeze([2, 2]),
      strides: Object.freeze([2, 2]),
    }),
    Object.freeze({
      name: 'conv2d_3',
      className: 'Conv2D',
      role: '3ª Convolução 3×3 (padding same) + ReLU',
      inputShape: Object.freeze([8, 8, 64]),
      outputShape: Object.freeze([8, 8, 64]),
      kernelShape: Object.freeze([3, 3, 64, 64]),
      biasShape: Object.freeze([64]),
      parameters: 36928,
      activation: 'relu',
      padding: 'same',
      strides: Object.freeze([1, 1]),
    }),
    Object.freeze({
      name: 'global_average_pooling2d_1',
      className: 'GlobalAveragePooling2D',
      role: 'Global Average Pooling (média espacial 8×8 por canal)',
      inputShape: Object.freeze([8, 8, 64]),
      outputShape: Object.freeze([64]),
      kernelShape: null,
      biasShape: null,
      parameters: 0,
    }),
    Object.freeze({
      name: 'dense_1',
      className: 'Dense',
      role: 'Camada densa oculta (64 neurônios) + ReLU',
      inputShape: Object.freeze([64]),
      outputShape: Object.freeze([64]),
      kernelShape: Object.freeze([64, 64]),
      biasShape: Object.freeze([64]),
      parameters: 4160,
      activation: 'relu',
    }),
    Object.freeze({
      name: 'dense_2',
      className: 'Dense',
      role: 'Camada densa de saída (10 classes) + Softmax',
      inputShape: Object.freeze([64]),
      outputShape: Object.freeze([10]),
      kernelShape: Object.freeze([64, 10]),
      biasShape: Object.freeze([10]),
      parameters: 650,
      activation: 'softmax',
    }),
  ]),
});

export const PIXEL_TOOL_LIMITS = Object.freeze({
  smoothing: Object.freeze({ min: 0, max: 1, step: 0.05, defaultValue: 0, unit: '', label: 'Suavização 3×3' }),
  contrast: Object.freeze({ min: 0.5, max: 2.0, step: 0.05, defaultValue: 1.0, unit: '×', label: 'Contraste' }),
  brightness: Object.freeze({ min: -80, max: 80, step: 2, defaultValue: 0, unit: '', label: 'Brilho' }),
  noiseStd: Object.freeze({ min: 0, max: 60, step: 2, defaultValue: 0, unit: '', label: 'Ruído aditivo' }),
});

export const DEFAULT_RESTORATION_TOOLS = Object.freeze({
  smoothing: 0,
  contrast: 1.0,
  brightness: 0,
});

export const PIXEL_INTERFERENCE_PRESETS = Object.freeze([
  Object.freeze({
    id: 'underexposed-noisy',
    label: 'Subexposição com granulação',
    description: 'Queda de brilho (-36), perda moderada de contraste (0,75×) e ruído leve (±14).',
    contrast: 0.75,
    brightness: -36,
    noiseStd: 14,
  }),
  Object.freeze({
    id: 'overexposed-glare',
    label: 'Superexposição estourada',
    description: 'Excesso de brilho (+38), baixo contraste (0,70×) e ruído leve (±12).',
    contrast: 0.7,
    brightness: 38,
    noiseStd: 12,
  }),
  Object.freeze({
    id: 'low-contrast-haze',
    label: 'Névoa de baixo contraste',
    description: 'Compressão de contraste (0,60×), leve desvio de brilho (+14) e ruído (±16).',
    contrast: 0.6,
    brightness: 14,
    noiseStd: 16,
  }),
  Object.freeze({
    id: 'sensor-static',
    label: 'Estática de transmissão',
    description: 'Ruído aditivo acentuado (±24) combinado a escurecimento leve (-18) e contraste 0,85×.',
    contrast: 0.85,
    brightness: -18,
    noiseStd: 24,
  }),
  Object.freeze({
    id: 'harsh-shadow-static',
    label: 'Contraste duro e ruído térmico',
    description: 'Contraste elevado (1,45×), desvio de brilho (-24) e ruído (±18).',
    contrast: 1.45,
    brightness: -24,
    noiseStd: 18,
  }),
]);

export const PIXEL_GAME_RULES = Object.freeze({
  roundsPerMatch: 5,
  maxQueriesPerRound: 3,
  pointsPerCorrectFinal: 100,
  maxMatchScore: 500,
});

export function getCifar10Class(indexOrId) {
  if (typeof indexOrId === 'number') {
    const found = CIFAR10_CLASSES[indexOrId];
    if (!found) throw new Error(`Índice de classe CIFAR-10 inválido: ${indexOrId}`);
    return found;
  }
  const found = CIFAR10_CLASSES.find((item) => item.id === indexOrId || item.pt === indexOrId);
  if (!found) throw new Error(`Identificador de classe CIFAR-10 inválido: ${indexOrId}`);
  return found;
}
