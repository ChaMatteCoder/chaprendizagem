import { createSonarPredictor, validateSonarModelContract } from './predictSonar.js';
import { disposeSonarModel } from './createSonarModel.js';

export async function sha256Bytes(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

export async function serializeSonarModel(tf, model) {
  let captured;
  await model.save(tf.io.withSaveHandler(async artifacts => {
    captured = artifacts;
    return { modelArtifactsInfo: tf.io.getModelArtifactsInfoForJSON(artifacts) };
  }), { includeOptimizer: false });
  const modelJson = { format: 'layers-model', generatedBy: `TensorFlow.js ${tf.version.tfjs}`, convertedBy: null,
    modelTopology: captured.modelTopology,
    weightsManifest: [{ paths: ['weights.bin'], weights: captured.weightSpecs }] };
  return { modelJson, weightData: captured.weightData };
}

export async function loadSonarModelArtifacts(tf, manifest, modelBytes, weightBytes) {
  for (const [file, bytes] of [['model.json', modelBytes], ['weights.bin', weightBytes]]) {
    const expected = manifest.files?.[file];
    if (!expected || expected.byteLength !== bytes.byteLength || await sha256Bytes(bytes) !== expected.sha256) {
      throw new Error(`Artefato Sonar corrompido ou incompatível: ${file}.`);
    }
  }
  const json = JSON.parse(new globalThis.TextDecoder('utf-8', { fatal: true }).decode(modelBytes));
  if (json.weightsManifest?.length !== 1 || JSON.stringify(json.weightsManifest[0].paths) !== '["weights.bin"]') {
    throw new Error('Manifesto de pesos Sonar inválido.');
  }
  let model;
  try {
    model = await tf.loadLayersModel(tf.io.fromMemory({ modelTopology: json.modelTopology,
      weightSpecs: json.weightsManifest[0].weights,
      weightData: weightBytes instanceof ArrayBuffer ? weightBytes : weightBytes.buffer.slice(weightBytes.byteOffset, weightBytes.byteOffset + weightBytes.byteLength) }));
    validateSonarModelContract(model, manifest);
    return model;
  } catch (error) { disposeSonarModel(model); throw error; }
}

export async function loadOfficialSonar({ baseUrl = '/models/sonar/official/', signal, fetchImpl = globalThis.fetch } = {}) {
  const read = async name => {
    const response = await fetchImpl(`${baseUrl.replace(/\/?$/, '/')}${name}`, { signal });
    if (!response.ok) throw new Error(`Não foi possível carregar ${name}: HTTP ${response.status}.`);
    return response;
  };
  const manifest = await (await read('manifest.json')).json();
  if (manifest.schemaVersion !== 1 || manifest.kind !== 'official' || manifest.evaluation?.status !== 'completed' ||
      manifest.architecture?.length < 3 || manifest.preprocessing !== 'identity; original values in [0,1]') {
    throw new Error('Modelo oficial indisponível ou ainda não avaliado.');
  }
  const [tf, modelBytes, weightBytes] = await Promise.all([
    import('@tensorflow/tfjs'), read('model.json').then(response => response.arrayBuffer()), read('weights.bin').then(response => response.arrayBuffer()),
  ]);
  await tf.ready();
  let model;
  try {
    model = await loadSonarModelArtifacts(tf, manifest, modelBytes, weightBytes);
    if (signal?.aborted) { const error = new Error('Carregamento cancelado.'); error.name = 'AbortError'; throw error; }
    return createSonarPredictor(tf, model, manifest);
  } catch (error) { disposeSonarModel(model); throw error; }
}
