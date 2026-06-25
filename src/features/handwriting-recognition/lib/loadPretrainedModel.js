import * as tf from '@tensorflow/tfjs';

const OFFICIAL_DIGITS_MODEL_URL = '/models/digits/model.json';
const DIGITS_JSON_WEIGHTS_URL = '/models/digits/mnist_mlp_weights.json';
const ALPHANUMERIC_JSON_WEIGHTS_URL = '/models/alphanumeric/alphanumeric_mlp_weights.json';

function warmupModel(model) {
  tf.tidy(() => {
    model.predict(tf.zeros([1, 784]));
  });
}

function createDigitsMlpModel() {
  const model = tf.sequential();

  model.add(tf.layers.dense({ inputShape: [784], units: 128, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));
  warmupModel(model);

  return model;
}

function createAlphanumericMlpModel() {
  const model = tf.sequential();

  model.add(tf.layers.dense({ inputShape: [784], units: 256, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 36, activation: 'softmax' }));
  warmupModel(model);

  return model;
}

function validateWeightsPayload(payload, { task, classCount, weightCount, label }) {
  if (payload?.format !== 'chaprendizagem-mlp-weights-v1') {
    throw new Error(`Formato de pesos ${label} inválido.`);
  }

  if (
    payload.task !== task ||
    payload.inputSize !== 784 ||
    payload.classes?.length !== classCount ||
    payload.weights?.length !== weightCount
  ) {
    throw new Error(`Arquitetura de pesos ${label} incompatível com a MLP do site.`);
  }
}

async function loadJsonWeightsModel({ url, createModel, validation, source }) {
  const response = await fetch(url, { cache: 'no-cache' });

  if (!response.ok) {
    throw new Error(`Pesos JSON não encontrados (${response.status}).`);
  }

  const payload = await response.json();
  validateWeightsPayload(payload, validation);

  const model = createModel();
  const tensors = [];

  try {
    for (const weight of payload.weights) {
      tensors.push(tf.tensor(weight.values, weight.shape, 'float32'));
    }

    model.setWeights(tensors);
    return { model, source };
  } catch (error) {
    model.dispose();
    throw error;
  } finally {
    tensors.forEach((tensor) => tensor.dispose());
  }
}

export async function loadPretrainedDigitsModel() {
  try {
    const model = await tf.loadLayersModel(OFFICIAL_DIGITS_MODEL_URL);
    return { model, source: 'tfjs' };
  } catch {
    return loadJsonWeightsModel({
      url: DIGITS_JSON_WEIGHTS_URL,
      createModel: createDigitsMlpModel,
      source: 'json',
      validation: {
        task: 'digits-mnist',
        classCount: 10,
        weightCount: 6,
        label: 'MNIST',
      },
    });
  }
}

export async function loadPretrainedAlphanumericModel() {
  return loadJsonWeightsModel({
    url: ALPHANUMERIC_JSON_WEIGHTS_URL,
    createModel: createAlphanumericMlpModel,
    source: 'alphanumeric-json',
    validation: {
      task: 'alphanumeric-mnist-emnist',
      classCount: 36,
      weightCount: 6,
      label: 'alfanuméricos',
    },
  });
}
