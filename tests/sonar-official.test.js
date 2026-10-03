import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, cp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as tf from '@tensorflow/tfjs';
import { loadOfficialSonar } from '../src/features/sonar/lib/model/sonarArtifacts.js';
import { officialDirectory, readExperimentContext, readJson, hashBytes } from '../training/sonar/experiment-io.mjs';
import { readFrozenEvaluation } from '../training/sonar/read-frozen-evaluation.mjs';

await tf.setBackend('cpu'); await tf.ready();
const context = await readExperimentContext();
const manifest = await readJson(new URL('manifest.json', officialDirectory));

test('loader de produção carrega pesos oficiais e reproduz fixture de desenvolvimento sem rótulo', async () => {
  const initial = tf.memory().numTensors;
  const requested = [];
  const fetchImpl = async (url, { signal }) => {
    assert.equal(signal?.aborted ?? false, false);
    assert.match(url, /^\/models\/sonar\/official\/[a-z.-]+$/);
    const name = url.split('/').at(-1);
    requested.push(name);
    return new Response(await readFile(new URL(name, officialDirectory)));
  };
  const predictor = await loadOfficialSonar({ fetchImpl });
  try {
    assert.equal(predictor.metadata.kind, 'official');
    assert.deepEqual(predictor.metadata.architecture, [60, 16, 2]);
    const fixtures = await readJson(new URL('parity-fixtures.json', officialDirectory));
    const sample = context.samples.find(row => row.id === fixtures.records[0].id);
    const result = await predictor.predict(sample.features, { trace: true,
      get label() { throw new Error('Rótulo não pode entrar na inferência'); } });
    assert.equal(result.modelId, manifest.modelId);
    assert.equal(result.predictedIndex, fixtures.records[0].predictedIndex);
    result.probabilities.forEach((value, index) => assert.ok(Math.abs(value - fixtures.records[0].probabilities[index]) <= 1e-5));
    assert.deepEqual(result.trace.probabilities, result.probabilities);
    assert.ok(!('loss' in result.trace));
  } finally { predictor.dispose(); }
  assert.deepEqual(requested.sort(), ['manifest.json', 'model.json', 'weights.bin']);
  assert.equal(tf.memory().numTensors, initial);
});

test('registro versionado impede nova avaliação mesmo sem diretório local de execução', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sonar-frozen-'));
  // The isolated directory contains only versioned artifacts, no training/runs.
  try {
    await cp(officialDirectory, directory, { recursive: true });
    const frozenUrl = pathToFileURL(`${directory}${sep}`);
    const frozen = await readFrozenEvaluation(context, frozenUrl);
    assert.equal(frozen.modelId, manifest.modelId);
    const weights = await readFile(new URL('weights.bin', frozenUrl));
    weights[0] ^= 1;
    await writeFile(new URL('weights.bin', frozenUrl), weights);
    await assert.rejects(readFrozenEvaluation(context, frozenUrl), /divergente/);
  } finally {
    const verifiedPath = resolve(directory);
    assert.ok(verifiedPath.startsWith(`${resolve(tmpdir())}${sep}`));
    await rm(verifiedPath, { recursive: true, force: true });
  }
});

test('comando de avaliação repetido lê conclusão, preserva arquivos e não faz novas previsões', async () => {
  const snapshots = new Map();
  for (const file of ['manifest.json', ...Object.keys(manifest.files)]) {
    snapshots.set(file, hashBytes(await readFile(new URL(file, officialDirectory))));
  }
  const { stdout } = await promisify(execFile)(process.execPath,
    ['training/sonar/evaluate-final.mjs'], { cwd: new URL('../', import.meta.url) });
  assert.match(stdout, /Registro versionado verificado; nenhuma previsão de teste foi repetida/);
  for (const [file, expected] of snapshots) assert.equal(hashBytes(await readFile(new URL(file, officialDirectory))), expected);
});
