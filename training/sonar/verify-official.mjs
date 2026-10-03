import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as tf from '@tensorflow/tfjs';
import { selectSonarSamples } from '../../src/features/sonar/lib/data/sonarDataset.js';
import { sonarLabelIndex } from '../../src/features/sonar/data/sonarSchema.js';
import { classificationMetrics } from '../../src/features/sonar/lib/evaluation/sonarMetrics.js';
import { createSonarPredictor, validateProbabilities } from '../../src/features/sonar/lib/model/predictSonar.js';
import { loadSonarModelArtifacts } from '../../src/features/sonar/lib/model/sonarArtifacts.js';
import { hashBytes, officialDirectory, readExperimentContext, readJson } from './experiment-io.mjs';

async function main() {
  if (process.argv.length !== 2) throw new Error('Uso: node training/sonar/verify-official.mjs');
  const context = await readExperimentContext();
  const manifest = await readJson(new URL('manifest.json', officialDirectory));
  assert.equal(manifest.kind, 'official');
  assert.equal(manifest.evaluation.status, 'completed');
  assert.equal(manifest.configSha256, context.configSha256);
  assert.equal(manifest.partitionsSha256, context.config.partitionsSha256);
  for (const [file, expected] of Object.entries(manifest.files)) {
    assert.match(file, /^[a-z-]+\.(json|bin)$/);
    const bytes = await readFile(new URL(file, officialDirectory));
    assert.equal(bytes.length, expected.byteLength, file);
    assert.equal(hashBytes(bytes), expected.sha256, file);
  }
  const metrics = await readJson(new URL('metrics.json', officialDirectory));
  const byId = new Map(context.samples.map(sample => [sample.id, sample]));
  function checkRecords(evaluation, allowedIds) {
    assert.equal(new Set(evaluation.records.map(row => row.id)).size, allowedIds.length);
    assert.deepEqual(evaluation.records.map(row => row.id).sort(), [...allowedIds].sort());
    for (const row of evaluation.records) {
      assert.equal(row.label, byId.get(row.id).label);
      assert.equal(row.predictedIndex, validateProbabilities(row.probabilities));
    }
    const calculated = classificationMetrics(evaluation.records.map(row => sonarLabelIndex(row.label)), evaluation.records.map(row => row.predictedIndex));
    for (const [key, value] of Object.entries(calculated)) assert.deepEqual(evaluation.metrics[key], value, key);
    assert.ok(Number.isFinite(evaluation.metrics.crossEntropy));
  }
  // Consistency checks on stored test results: no new test inference/evaluation.
  checkRecords(metrics.finalTest, context.partitions.testIds);
  for (const candidate of metrics.crossValidation) {
    for (const fold of candidate.folds) checkRecords(fold, context.partitions.folds[fold.fold - 1].validationIds);
  }
  const histories = await readJson(new URL('history.json', officialDirectory));
  for (const run of [...histories.crossValidation, histories.finalTraining]) {
    assert.equal(run.history.length, context.config.training.epochs);
    run.history.forEach((epoch, index) => {
      assert.equal(epoch.epoch, index + 1);
      for (const key of ['loss', 'accuracy']) assert.ok(Number.isFinite(epoch[key]));
      if (run === histories.finalTraining) {
        assert.equal(epoch.valLoss, null); assert.equal(epoch.valAccuracy, null);
      } else {
        assert.ok(Number.isFinite(epoch.valLoss)); assert.ok(Number.isFinite(epoch.valAccuracy));
      }
    });
  }
  await tf.setBackend('cpu'); await tf.ready();
  const initial = tf.memory().numTensors;
  const model = await loadSonarModelArtifacts(tf, manifest,
    await readFile(new URL('model.json', officialDirectory)), await readFile(new URL('weights.bin', officialDirectory)));
  const predictor = createSonarPredictor(tf, model, manifest);
  let maxProbabilityError = 0;
  try {
    const fixtures = await readJson(new URL('parity-fixtures.json', officialDirectory));
    assert.equal(fixtures.sampleSet, 'development');
    assert.deepEqual(fixtures.records.map(row => row.id), context.partitions.developmentIds);
    const samples = selectSonarSamples(context.samples, context.partitions.developmentIds);
    for (const [index, sample] of samples.entries()) {
      const result = await predictor.predict(sample.features, { trace: index === 0 });
      result.probabilities.forEach((value, output) => {
        const error = Math.abs(value - fixtures.records[index].probabilities[output]);
        assert.ok(error <= context.config.parityTolerance);
        maxProbabilityError = Math.max(maxProbabilityError, error);
      });
      assert.equal(result.predictedIndex, fixtures.records[index].predictedIndex);
    }
  } finally { predictor.dispose(); }
  assert.equal(tf.memory().numTensors, initial);
  console.log(JSON.stringify({ modelId: manifest.modelId, filesVerified: Object.keys(manifest.files).length,
    cvRecordsVerified: 3 * 166, storedTestRecordsVerified: 42, newTestPredictions: 0,
    developmentPredictionsVerified: 166, maxProbabilityError, tensorLeak: false }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
