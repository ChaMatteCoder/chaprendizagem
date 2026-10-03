import { readFile } from 'node:fs/promises';
import { encodeJson, hashBytes, officialDirectory, readJson, requireSameConfig, root, writeImmutable } from './experiment-io.mjs';

/** Publishes files to the local source tree only; manifest is the last readiness marker. */
export async function exportOfficialArtifacts(directory, context, evaluation) {
  const report = await readJson(new URL('development-report.json', directory));
  requireSameConfig(report, context);
  requireSameConfig(evaluation, context);
  if (evaluation.status !== 'completed' || evaluation.modelId !== report.modelId) throw new Error('Avaliação final incompatível.');
  const files = {};
  const artifacts = new Map();
  for (const name of ['model.json', 'weights.bin', 'history.json', 'reproducibility.json', 'parity-fixtures.json', 'registration.json']) {
    artifacts.set(name, await readFile(new URL(name, directory)));
  }
  artifacts.set('config.json', context.configBytes);
  artifacts.set('partitions.json', context.partitionsBytes);
  artifacts.set('provenance.json', await readFile(new URL('public/data/sonar/provenance.json', root)));
  artifacts.set('evaluation.json', encodeJson(evaluation));
  artifacts.set('metrics.json', encodeJson({
    modelId: report.modelId, selectedId: report.selectedId, selectionPolicy: context.config.selection,
    crossValidation: report.crossValidation,
    finalTraining: report.finalTraining,
    finalTest: evaluation.result,
    limitations: ['Small dataset; row-stratified split does not prove independence across objects or acquisition angles.',
      'Test is already evaluated and frozen; game scores on these samples are demonstrations, not new scientific estimates.'],
  }));
  artifacts.set('validation.json', encodeJson({ exportParity: report.parity, tensorLeak: report.tensorLeak,
    trainingElapsedSeconds: report.elapsedSeconds, trainingCompletedAt: report.completedAt }));
  if (hashBytes(artifacts.get('weights.bin')) !== evaluation.weightsSha256) throw new Error('Pesos diferentes dos avaliados.');
  for (const [name, bytes] of artifacts) {
    await writeImmutable(new URL(name, officialDirectory), bytes);
    files[name] = { byteLength: bytes.length, sha256: hashBytes(bytes) };
  }
  const manifest = { schemaVersion: 1, kind: 'official', modelId: report.modelId,
    architecture: report.architecture, parameterCount: report.parameters, inputSize: 60, classOrder: ['R', 'M'],
    preprocessing: 'identity; original values in [0,1]',
    datasetSha256: context.config.datasetSha256, partitionsSha256: context.config.partitionsSha256,
    configSha256: context.configSha256, protocolId: context.config.protocolId,
    evaluation: { status: 'completed', sampleCount: evaluation.result.metrics.total, completedAt: evaluation.completedAt }, files };
  await writeImmutable(new URL('manifest.json', officialDirectory), encodeJson(manifest));
  return manifest;
}
