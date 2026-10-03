import { readFile, writeFile } from 'node:fs/promises';
import * as tf from '@tensorflow/tfjs';
import { selectSonarSamples } from '../../src/features/sonar/lib/data/sonarDataset.js';
import { disposeSonarModel } from '../../src/features/sonar/lib/model/createSonarModel.js';
import { loadSonarModelArtifacts } from '../../src/features/sonar/lib/model/sonarArtifacts.js';
import { evaluateSonarModel } from '../../src/features/sonar/lib/evaluation/sonarMetrics.js';
import { encodeJson, hashBytes, readExperimentContext, readJson, readOptional, requireSameConfig, runDirectory, trainingSourceHashes, writeImmutable } from './experiment-io.mjs';
import { exportOfficialArtifacts } from './export-model.mjs';
import { readFrozenEvaluation } from './read-frozen-evaluation.mjs';

async function main() {
  if (process.argv.length !== 2) throw new Error('Avaliação oficial não aceita overrides ou flags de repetição.');
  const context = await readExperimentContext();
  const frozen = await readFrozenEvaluation(context);
  if (frozen) {
    console.log(`Avaliação oficial já concluída: ${frozen.modelId}. Registro versionado verificado; nenhuma previsão de teste foi repetida.`);
    return;
  }
  const directory = runDirectory();
  const report = await readJson(new URL('development-report.json', directory));
  requireSameConfig(report, context);
  const evaluationUrl = new URL('evaluation.json', directory);
  let completed = await readOptional(evaluationUrl);
  if (!completed) {
    const registration = await readJson(new URL('registration.json', directory));
    if (JSON.stringify(registration.sourceHashes) !== JSON.stringify(await trainingSourceHashes())) throw new Error('Código mudou desde o treinamento registrado.');
    if (tf.version.tfjs !== context.config.tensorflowjs) throw new Error('Versão TensorFlow.js divergente.');
    await tf.setBackend('cpu'); await tf.ready();
    const initialTensors = tf.memory().numTensors;
    const metadata = await readJson(new URL('model-metadata.json', directory));
    const modelBytes = await readFile(new URL('model.json', directory));
    const weightBytes = await readFile(new URL('weights.bin', directory));
    const model = await loadSonarModelArtifacts(tf, metadata, modelBytes, weightBytes);
    try {
      // Exclusive durable claim. An interrupted attempt cannot silently evaluate again.
      await writeFile(new URL('evaluation-attempt.json', directory), encodeJson({ status: 'started',
        modelId: report.modelId, configSha256: context.configSha256, startedAt: new Date().toISOString() }), { flag: 'wx' });
      const testSamples = selectSonarSamples(context.samples, context.partitions.testIds);
      const result = await evaluateSonarModel(tf, model, testSamples);
      const record = { status: 'completed', modelId: report.modelId, configSha256: context.configSha256,
        datasetSha256: context.config.datasetSha256, partitionsSha256: context.config.partitionsSha256,
        weightsSha256: hashBytes(weightBytes), completedAt: new Date().toISOString(),
        policy: 'Single final evaluation, after development-only selection; no tuning from test.', result };
      completed = encodeJson(record);
      await writeImmutable(evaluationUrl, completed); // Save measured results before any export.
      console.log(JSON.stringify(result.metrics, null, 2));
    } finally { disposeSonarModel(model); }
    if (tf.memory().numTensors !== initialTensors) throw new Error('Tensores retidos na avaliação final.');
  } else {
    console.log('Avaliação já concluída. Usando o registro existente; nenhuma previsão de teste foi repetida.');
  }
  const manifest = await exportOfficialArtifacts(directory, context, JSON.parse(completed));
  console.log(`Artefatos locais oficiais prontos: ${manifest.modelId}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
