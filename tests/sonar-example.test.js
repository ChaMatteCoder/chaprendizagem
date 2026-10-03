import test from 'node:test';
import assert from 'node:assert/strict';
import { explainDevelopmentExample } from '../training/sonar/explain-example.mjs';
import { hashBytes, officialDirectory, readExperimentContext, readJson } from '../training/sonar/experiment-io.mjs';
import { readFile } from 'node:fs/promises';

test('exemplo do professor reproduz os pesos oficiais e mantém os artefatos intactos', async () => {
  const manifest = await readJson(new URL('manifest.json', officialDirectory));
  const snapshots = new Map();
  for (const file of ['manifest.json', ...Object.keys(manifest.files)]) {
    snapshots.set(file, hashBytes(await readFile(new URL(file, officialDirectory))));
  }
  const example = await explainDevelopmentExample();
  const fixtures = await readJson(new URL('parity-fixtures.json', officialDirectory));
  const fixture = fixtures.records.find(row => row.id === example.sampleId);
  assert.equal(example.partition, 'development');
  assert.equal(example.result.modelId, manifest.modelId);
  assert.deepEqual(example.result.probabilities, fixture.probabilities);
  assert.equal(example.hiddenNeuron1.terms.length, 60);
  assert.ok(Math.abs(example.hiddenNeuron1.computedZ - example.hiddenNeuron1.observedZ) < 1e-5);
  for (const neuron of example.outputNeurons) {
    assert.equal(neuron.terms.length, 16);
    assert.ok(Math.abs(neuron.computedZ - neuron.observedZ) < 1e-5);
  }
  assert.ok(Math.abs(example.revealed.crossEntropy + Math.log(example.result.probabilities[example.revealed.index])) < 1e-5);
  assert.equal(example.newTestPredictions, 0);
  for (const [file, expected] of snapshots) assert.equal(hashBytes(await readFile(new URL(file, officialDirectory))), expected);
});

test('exemplo recusa qualquer ID reservado para teste antes de fazer inferência', async () => {
  const context = await readExperimentContext();
  for (const id of context.partitions.testIds) await assert.rejects(explainDevelopmentExample(id), /desenvolvimento/);
  await assert.rejects(explainDevelopmentExample('sonar-9999'), /desenvolvimento/);
});
