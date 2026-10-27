import { CIFAR10_CLASSES } from '../data/cifar10Schema.js';
import { decodePixelsBase64 } from './pixelOps.js';
import { createPixelPredictor, validatePixelModelContract } from './predictPixel.js';

export async function sha256Bytes(bytes) {
  const buffer = bytes instanceof ArrayBuffer ? bytes : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function loadPixelModelFromBytes(tf, manifest, modelBytes, weightBytes) {
  for (const [fileName, bytes] of [
    ['model.json', modelBytes],
    ['weights.bin', weightBytes],
  ]) {
    const expected = manifest?.files?.[fileName];
    if (!expected || expected.byteLength !== bytes.byteLength || (await sha256Bytes(bytes)) !== expected.sha256) {
      throw new Error(`Artefato do modelo Pixel corrompido ou incompatível: ${fileName}.`);
    }
  }

  const modelJson = JSON.parse(new globalThis.TextDecoder('utf-8', { fatal: true }).decode(modelBytes));
  if (
    modelJson.weightsManifest?.length !== 1 ||
    JSON.stringify(modelJson.weightsManifest[0].paths) !== '["weights.bin"]'
  ) {
    throw new Error('Manifesto de pesos TensorFlow.js inválido.');
  }

  let model = null;
  try {
    const weightBuffer =
      weightBytes instanceof ArrayBuffer
        ? weightBytes
        : weightBytes.buffer.slice(weightBytes.byteOffset, weightBytes.byteOffset + weightBytes.byteLength);
    model = await tf.loadLayersModel(
      tf.io.fromMemory({
        modelTopology: modelJson.modelTopology,
        weightSpecs: modelJson.weightsManifest[0].weights,
        weightData: weightBuffer,
      }),
    );
    validatePixelModelContract(model, manifest);
    return model;
  } catch (error) {
    model?.dispose();
    throw error;
  }
}

export function validateDemoDataset(demoPayload, provenance, partitions) {
  const expectedOrder = CIFAR10_CLASSES.map((c) => ({ index: c.index, en: c.en, pt: c.pt }));
  if (
    demoPayload?.schemaVersion !== 1 ||
    demoPayload?.sourcePartition !== 'validation' ||
    JSON.stringify(demoPayload?.classOrder) !== JSON.stringify(expectedOrder) ||
    !Array.isArray(demoPayload?.samples) ||
    demoPayload.samples.length === 0
  ) {
    throw new Error('Pacote de amostras de demonstração CIFAR-10 inválido.');
  }

  if (
    provenance?.schemaVersion !== 1 ||
    partitions?.schemaVersion !== 1 ||
    provenance?.archive?.sha256 !== partitions?.archiveSha256
  ) {
    throw new Error('Metadados de proveniência ou partições do CIFAR-10 inconsistentes.');
  }

  const seenIds = new Set();
  const decodedSamples = demoPayload.samples.map((item) => {
    if (
      typeof item.id !== 'string' ||
      seenIds.has(item.id) ||
      !Number.isInteger(item.label) ||
      item.label < 0 ||
      item.label >= 10 ||
      item.partition !== 'validation'
    ) {
      throw new Error(`Amostra de demonstração inválida: ${item?.id}`);
    }
    seenIds.add(item.id);
    const pixels = decodePixelsBase64(item.pixelsBase64);
    return {
      id: item.id,
      originalTrainIndex: item.originalTrainIndex,
      sourceBatch: item.sourceBatch,
      sourceFilename: item.sourceFilename,
      partition: item.partition,
      demonstrationOnly: true,
      label: item.label,
      classId: CIFAR10_CLASSES[item.label].id,
      classNamePt: CIFAR10_CLASSES[item.label].pt,
      sha256: item.sha256,
      pixels,
    };
  });

  return decodedSamples;
}

export async function loadPixelBundle({
  modelBaseUrl = '/models/pixel/official/',
  dataBaseUrl = '/data/pixel/',
  signal,
  fetchImpl = globalThis.fetch,
} = {}) {
  const fetchResource = async (baseUrl, name) => {
    const url = `${baseUrl.replace(/\/?$/, '/')}${name}`;
    const response = await fetchImpl(url, { signal });
    if (!response.ok) {
      throw new Error(`Não foi possível carregar ${name} (HTTP ${response.status}).`);
    }
    return response;
  };

  const manifest = await (await fetchResource(modelBaseUrl, 'manifest.json')).json();
  if (manifest.schemaVersion !== 1 || manifest.kind !== 'official' || manifest.smoke !== false) {
    throw new Error('O modelo oficial da CNN ainda não está disponível ou foi marcado como smoke test.');
  }

  const [
    tf,
    modelBytes,
    weightBytes,
    metrics,
    history,
    robustness,
    provenance,
    partitions,
    demoPayload,
  ] = await Promise.all([
    import('@tensorflow/tfjs'),
    fetchResource(modelBaseUrl, 'model.json').then((r) => r.arrayBuffer()),
    fetchResource(modelBaseUrl, 'weights.bin').then((r) => r.arrayBuffer()),
    fetchResource(modelBaseUrl, 'metrics.json').then((r) => r.json()),
    fetchResource(modelBaseUrl, 'history.json').then((r) => r.json()),
    fetchResource(modelBaseUrl, 'robustness.json').then((r) => r.json()),
    fetchResource(dataBaseUrl, 'provenance.json').then((r) => r.json()),
    fetchResource(dataBaseUrl, 'partitions.json').then((r) => r.json()),
    fetchResource(dataBaseUrl, 'demo-samples.json').then((r) => r.json()),
  ]);

  await tf.ready();
  const samples = validateDemoDataset(demoPayload, provenance, partitions);

  let model = null;
  try {
    model = await loadPixelModelFromBytes(tf, manifest, modelBytes, weightBytes);
    if (signal?.aborted) {
      const error = new Error('Carregamento cancelado.');
      error.name = 'AbortError';
      throw error;
    }
    const predictor = createPixelPredictor(tf, model, manifest);
    return {
      predictor,
      manifest,
      metrics,
      history,
      robustness,
      provenance,
      partitions,
      demoMeta: {
        demonstrationNotice: demoPayload.demonstrationNotice,
        sourcePartition: demoPayload.sourcePartition,
      },
      samples,
    };
  } catch (error) {
    model?.dispose();
    throw error;
  }
}
