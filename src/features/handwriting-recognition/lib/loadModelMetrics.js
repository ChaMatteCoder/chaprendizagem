const METRICS_BY_MODE = {
  digits: {
    url: '/models/digits/mnist_metrics.json',
    formats: ['chaprendizagem-mnist-metrics-v1'],
    label: 'MNIST',
  },
  all: {
    url: '/models/alphanumeric/alphanumeric_metrics.json',
    formats: ['chaprendizagem-alphanumeric-metrics-v1'],
    label: 'alfanuméricas',
  },
};

export async function loadPretrainedMetrics(mode) {
  const config = METRICS_BY_MODE[mode];

  if (!config) {
    throw new Error(`Não há métricas pré-treinadas configuradas para o modo ${mode}.`);
  }

  const response = await fetch(config.url, { cache: 'no-cache' });

  if (!response.ok) {
    throw new Error(`Métricas ${config.label} não encontradas (${response.status}).`);
  }

  const payload = await response.json();

  if (!config.formats.includes(payload?.format)) {
    throw new Error(`Formato de métricas ${config.label} inválido.`);
  }

  return payload;
}

export function loadMnistMetrics() {
  return loadPretrainedMetrics('digits');
}
