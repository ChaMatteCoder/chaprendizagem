import { validateSonarFeatures } from '../data/sonarDataset.js';
import { disposeSonarModel } from './createSonarModel.js';

export function validateProbabilities(values) {
  if (!Array.isArray(values) || values.length !== 2 ||
      Array.from(values).some(value => !Number.isFinite(value) || value < 0 || value > 1) ||
      Math.abs(values[0] + values[1] - 1) > 1e-5) throw new Error('Probabilidades Sonar inválidas.');
  return values[0] >= values[1] ? 0 : 1;
}

export function validateSonarModelContract(model, metadata) {
  if (typeof metadata?.modelId !== 'string' || !metadata.modelId || !['official', 'experimental'].includes(metadata.kind) ||
      JSON.stringify(metadata.classOrder) !== '["R","M"]' ||
      JSON.stringify(model.inputs?.map(input => input.shape)) !== '[[null,60]]' ||
      JSON.stringify(model.outputs?.map(output => output.shape)) !== '[[null,2]]') {
    throw new Error('Modelo incompatível: identidade, classes ou dimensões inválidas.');
  }
  const units = [];
  model.layers.forEach((layer, index) => {
    const config = layer.getConfig();
    if (layer.getClassName() !== 'Dense' || !config.useBias ||
        config.activation !== (index === model.layers.length - 1 ? 'softmax' : 'relu')) {
      throw new Error('Modelo deve usar Dense/ReLU e duas saídas Softmax.');
    }
    units.push(config.units);
  });
  if (units.at(-1) !== 2 || JSON.stringify([60, ...units]) !== JSON.stringify(metadata.architecture)) {
    throw new Error('Arquitetura não corresponde ao manifesto.');
  }
}

function abortIf(condition) {
  if (condition) { const error = new Error('Operação Sonar cancelada.'); error.name = 'AbortError'; throw error; }
}

/** Trace of actual Dense weights; kernel orientation is [input, output]. No labels/loss. */
export function traceSonar(tf, model, features) {
  validateSonarFeatures(features);
  return tf.tidy(() => {
    let activation = tf.tensor2d([features], [1, 60]);
    const layers = [];
    for (const layer of model.layers) {
      const [kernel, bias] = layer.getWeights(); // Borrowed variables: never dispose them.
      const z = tf.add(tf.matMul(activation, kernel), bias);
      const kind = layer.getConfig().activation;
      const next = kind === 'relu' ? tf.relu(z) : tf.softmax(z);
      layers.push({ name: layer.name, activation: kind, kernelShape: [...kernel.shape],
        input: Array.from(activation.dataSync()), kernel: kernel.arraySync(), bias: Array.from(bias.dataSync()),
        z: Array.from(z.dataSync()), output: Array.from(next.dataSync()) });
      activation = next;
    }
    const probabilities = layers.at(-1).output;
    validateProbabilities(probabilities);
    if (layers.some(layer => [...layer.z, ...layer.output, ...layer.bias, ...layer.kernel.flat()].some(value => !Number.isFinite(value)))) {
      throw new Error('Trace contém valores não finitos.');
    }
    return { input: [...features], layers, logits: layers.at(-1).z, probabilities: [...probabilities] };
  });
}

/** Owns the model. All caller-visible values are detached from tensors. */
export function createSonarPredictor(tf, model, metadata) {
  validateSonarModelContract(model, metadata);
  const identity = structuredClone(metadata);
  let closed = false;
  let active = 0;
  function release() { if (closed && active === 0) disposeSonarModel(model); }
  return {
    get metadata() { return structuredClone(identity); },
    dispose() { closed = true; release(); },
    async predict(features, { signal, trace = false } = {}) {
      abortIf(closed || signal?.aborted);
      validateSonarFeatures(features);
      const input = [...features];
      active++;
      let output;
      try {
        output = tf.tidy(() => model.predict(tf.tensor2d([input], [1, 60])));
        const probabilities = Array.from(await output.data());
        abortIf(closed || signal?.aborted);
        const predictedIndex = validateProbabilities(probabilities);
        const explanation = trace ? traceSonar(tf, model, input) : undefined;
        if (explanation && explanation.probabilities.some((value, index) => Math.abs(value - probabilities[index]) > 1e-5)) {
          throw new Error('Trace diverge da inferência.');
        }
        return {
          modelId: identity.modelId, modelKind: identity.kind, classOrder: ['R', 'M'],
          probabilities, predictedIndex, predictedLabel: ['R', 'M'][predictedIndex],
          ...(explanation ? { trace: explanation } : {}),
        };
      } finally { tf.dispose(output); active--; release(); }
    },
  };
}
