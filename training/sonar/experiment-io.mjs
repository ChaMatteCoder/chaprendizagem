import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseSonar } from '../../src/features/sonar/lib/data/sonarDataset.js';
import { validateSonarPartitions } from '../../src/features/sonar/lib/data/sonarManifests.js';
import { verifySonarSource } from './source-file.mjs';

export const root = new URL('../../', import.meta.url);
export const officialDirectory = new URL('public/models/sonar/official/', root);
export const hashBytes = bytes => createHash('sha256').update(bytes).digest('hex');
export const encodeJson = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
export const readJson = async url => JSON.parse(await readFile(url, 'utf8'));

export async function readOptional(url) {
  try { return await readFile(url); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export async function writeImmutable(url, bytes) {
  const previous = await readOptional(url);
  if (previous) {
    if (!previous.equals(Buffer.from(bytes))) throw new Error(`Artefato existente divergente; não será sobrescrito: ${url.pathname}`);
    return;
  }
  await mkdir(new URL('./', url), { recursive: true });
  await writeFile(url, bytes, { flag: 'wx' });
}

export function runDirectory(args = []) {
  if (args.length > 1 || (args.length && !/^--run=[a-z0-9][a-z0-9-]{0,63}$/.test(args[0]))) {
    throw new Error('Uso: node training/sonar/run-experiment.mjs [--run=nome-da-reproducao]');
  }
  return new URL(`training/sonar/runs/${args[0]?.slice(6) ?? 'official-v1'}/`, root);
}

export async function readExperimentContext() {
  const configBytes = await readFile(new URL('training/sonar/config.json', root));
  const config = JSON.parse(configBytes);
  const source = await readJson(new URL('training/sonar/source.lock.json', root));
  const data = await readFile(new URL('public/data/sonar/sonar.all-data', root));
  const partitionsBytes = await readFile(new URL('public/data/sonar/partitions.json', root));
  const partitions = JSON.parse(partitionsBytes);
  const datasetSha256 = verifySonarSource(data, source);
  if (datasetSha256 !== config.datasetSha256 || hashBytes(partitionsBytes) !== config.partitionsSha256) {
    throw new Error('Dados ou partições divergem do protocolo congelado.');
  }
  const samples = parseSonar(data.toString('utf8'));
  validateSonarPartitions(samples, partitions, datasetSha256);
  return { config, configBytes, configSha256: hashBytes(configBytes), samples, partitions, partitionsBytes };
}

export async function trainingSourceHashes() {
  const paths = [
    'src/features/sonar/data/sonarSchema.js',
    ...['sonarDataset', 'sonarManifests', 'stratifiedSplit'].map(name => `src/features/sonar/lib/data/${name}.js`),
    ...['createSonarModel', 'trainSonarModel', 'predictSonar', 'sonarArtifacts'].map(name => `src/features/sonar/lib/model/${name}.js`),
    'src/features/sonar/lib/evaluation/sonarMetrics.js',
    'training/sonar/run-experiment.mjs', 'training/sonar/experiment-io.mjs',
  ];
  return Object.fromEntries(await Promise.all(paths.map(async path => [path, hashBytes(await readFile(new URL(path, root)))])));
}

export function requireSameConfig(record, context) {
  if (record.configSha256 !== context.configSha256) throw new Error('Configuração difere da execução registrada.');
}
