import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseSonar, validateSonarDataset } from '../../src/features/sonar/lib/data/sonarDataset.js';
import { createSonarPartitions, createSonarProvenance, validateSonarPartitions } from '../../src/features/sonar/lib/data/sonarManifests.js';
import { downloadSonarSource, verifySonarSource } from './source-file.mjs';

const directory = new URL('../../public/data/sonar/', import.meta.url);
const source = JSON.parse(await readFile(new URL('./source.lock.json', import.meta.url), 'utf8'));

async function readOptional(url) {
  try { return await readFile(url); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(arg => !['--check', '--download'].includes(arg))) {
    throw new Error('Uso: node training/sonar/prepare-data.mjs [--download | --check]');
  }
  const check = args.includes('--check');
  const originalUrl = new URL(source.fileName, directory);
  let bytes = await readOptional(originalUrl);
  if (bytes) verifySonarSource(bytes, source); // Never overwrite a differing local original.
  if (args.includes('--download')) {
    const downloaded = await downloadSonarSource(source);
    if (!bytes) {
      await mkdir(directory, { recursive: true });
      await writeFile(originalUrl, downloaded, { flag: 'wx' });
    }
    bytes = downloaded;
  }
  if (!bytes) throw new Error('Original Sonar ausente. Execute com --download para obter a fonte oficial.');
  const datasetSha256 = verifySonarSource(bytes, source);
  const samples = parseSonar(bytes.toString('utf8'));
  const validation = validateSonarDataset(samples);
  const partitions = createSonarPartitions(samples, datasetSha256);
  const provenance = createSonarProvenance(samples, source);
  const artifacts = [];
  for (const [name, value] of [['provenance.json', provenance], ['partitions.json', partitions]]) {
    const url = new URL(name, directory);
    const content = `${JSON.stringify(value, null, 2)}\n`;
    const existing = await readOptional(url);
    if (existing && existing.toString('utf8') !== content) {
      throw new Error(`${name} diverge da reprodução. Manifestos existentes não serão sobrescritos; investigue a diferença.`);
    }
    if (check && !existing) throw new Error(`${name} ausente; execute a preparação antes da verificação.`);
    artifacts.push({ url, content, exists: existing !== null });
  }
  // Preflight every artifact before writing, preserving already frozen partitions.
  if (!check) {
    for (const artifact of artifacts) {
      if (!artifact.exists) await writeFile(artifact.url, artifact.content, { flag: 'wx' });
    }
  }
  const counts = validateSonarPartitions(samples, partitions, datasetSha256);
  console.log(JSON.stringify({ mode: check ? 'verified' : 'prepared', datasetSha256, validation, partitions: counts }, null, 2));
}

try { await main(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
