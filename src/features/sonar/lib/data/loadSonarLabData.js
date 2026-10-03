import { parseSonar, validateSonarDataset, selectSonarSamples } from './sonarDataset.js';
import { validateSonarPartitions } from './sonarManifests.js';
import { sha256Bytes } from '../model/sonarArtifacts.js';
import { classificationMetrics } from '../evaluation/sonarMetrics.js';
import { sonarLabelIndex } from '../../data/sonarSchema.js';

export async function loadSonarLabData({ signal, fetchImpl = globalThis.fetch } = {}) {
  const read = async path => {
    const response = await fetchImpl(path, { signal });
    if (!response.ok) throw new Error(`Falha ao carregar os dados do laboratório: HTTP ${response.status}.`);
    return new Uint8Array(await response.arrayBuffer());
  };
  const decode = bytes => JSON.parse(new globalThis.TextDecoder('utf-8', { fatal: true }).decode(bytes));
  const base = '/models/sonar/official/';
  const manifest = decode(await read(`${base}manifest.json`));
  if (manifest.kind !== 'official' || manifest.evaluation?.status !== 'completed' || JSON.stringify(manifest.classOrder) !== '["R","M"]') {
    throw new Error('Registro oficial incompatível ou não concluído.');
  }
  const json = async name => {
    const bytes = await read(`${base}${name}`);
    const expected = manifest.files?.[name];
    if (!expected || bytes.length !== expected.byteLength || await sha256Bytes(bytes) !== expected.sha256) {
      throw new Error(`Arquivo do laboratório corrompido: ${name}.`);
    }
    return decode(bytes);
  };
  const [dataBytes, provenance, partitions, metrics, config] = await Promise.all([
    read('/data/sonar/sonar.all-data'), json('provenance.json'), json('partitions.json'), json('metrics.json'), json('config.json'),
  ]);
  const datasetSha256 = await sha256Bytes(dataBytes);
  if (datasetSha256 !== manifest.datasetSha256 || datasetSha256 !== provenance.source.sha256 ||
      datasetSha256 !== config.datasetSha256 || manifest.configSha256 !== manifest.files['config.json'].sha256 ||
      manifest.partitionsSha256 !== manifest.files['partitions.json'].sha256 || config.partitionsSha256 !== manifest.partitionsSha256) {
    throw new Error('Dados, configuração e partições não pertencem ao mesmo experimento.');
  }
  const samples = parseSonar(new globalThis.TextDecoder('utf-8', { fatal: true }).decode(dataBytes));
  validateSonarDataset(samples);
  validateSonarPartitions(samples, partitions, datasetSha256);
  const final = metrics.finalTest;
  if (metrics.modelId !== manifest.modelId || final.records.length !== partitions.testIds.length ||
      JSON.stringify(final.records.map(row => row.id).sort()) !== JSON.stringify([...partitions.testIds].sort())) {
    throw new Error('Resultados oficiais não correspondem ao teste persistido.');
  }
  const calculated = classificationMetrics(final.records.map(row => sonarLabelIndex(row.label)), final.records.map(row => row.predictedIndex));
  for (const key of ['confusionMatrix', 'total', 'correct', 'accuracy', 'macroF1', 'perClass']) {
    if (JSON.stringify(calculated[key]) !== JSON.stringify(final.metrics[key])) throw new Error('Métricas oficiais inconsistentes.');
  }
  return { samples, development: selectSonarSamples(samples, partitions.developmentIds),
    datasetSha256, provenance, partitions, metrics, config, manifest };
}
