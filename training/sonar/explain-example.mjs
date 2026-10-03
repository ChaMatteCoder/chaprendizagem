import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import * as tf from '@tensorflow/tfjs';
import { createSonarPredictor } from '../../src/features/sonar/lib/model/predictSonar.js';
import { loadSonarModelArtifacts } from '../../src/features/sonar/lib/model/sonarArtifacts.js';
import { explainNeuron, stableSoftmax, explainLabeledPrediction } from '../../src/features/sonar/lib/math/sonarMath.js';
import { encodeJson, officialDirectory, readExperimentContext, root } from './experiment-io.mjs';
import { readFrozenEvaluation } from './read-frozen-evaluation.mjs';

/** Read-only explanation of one development example. No training or test inference. */
export async function explainDevelopmentExample(id) {
  const context = await readExperimentContext();
  const sampleId = id ?? context.partitions.developmentIds[0];
  if (!context.partitions.developmentIds.includes(sampleId)) {
    throw new Error('O exemplo deve pertencer ao desenvolvimento; IDs de teste não são aceitos.');
  }
  const manifest = await readFrozenEvaluation(context);
  if (!manifest) throw new Error('Oficial congelado ausente.');
  const sample = context.samples.find(row => row.id === sampleId);
  await tf.setBackend('cpu'); await tf.ready();
  const initialTensors = tf.memory().numTensors;
  const model = await loadSonarModelArtifacts(tf, manifest,
    await readFile(new URL('model.json', officialDirectory)), await readFile(new URL('weights.bin', officialDirectory)));
  const predictor = createSonarPredictor(tf, model, manifest);
  let example;
  try {
    const result = await predictor.predict(sample.features, { trace: true });
    example = {
      schemaVersion: 1, sampleId, partition: 'development', backend: 'cpu',
      datasetSha256: manifest.datasetSha256, weightsSha256: manifest.files['weights.bin'].sha256,
      result,
      hiddenNeuron1: explainNeuron(result.trace.layers[0], 0),
      outputNeurons: result.trace.layers.at(-1).bias.map((_, i) => explainNeuron(result.trace.layers.at(-1), i)),
      softmax: stableSoftmax(result.trace.logits),
      // The label is read after prediction and is used exclusively for this explanation.
      revealed: explainLabeledPrediction(result.trace, sample.label, { revealed: true }),
      newTestPredictions: 0,
    };
  } finally { predictor.dispose(); }
  assert.equal(tf.memory().numTensors, initialTensors, 'O exemplo deve liberar seus tensores.');
  return example;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--save' && !/^--id=sonar-\d{4}$/.test(arg)) ||
      args.filter(arg => arg.startsWith('--id=')).length > 1 || args.filter(arg => arg === '--save').length > 1) {
    throw new Error('Uso: npm run explain:sonar -- [--id=sonar-0001] [--save]');
  }
  const example = await explainDevelopmentExample(args.find(arg => arg.startsWith('--id='))?.slice(5));
  if (args.includes('--save')) await writeFile(new URL('docs/sonar/etapa-6-exemplo.json', root), encodeJson(example));
  console.log(JSON.stringify({ sampleId: example.sampleId, modelId: example.result.modelId,
    logits: example.result.trace.logits, probabilities: example.result.probabilities,
    predictedLabel: example.result.predictedLabel, revealed: example.revealed,
    newTestPredictions: 0, tensorLeak: false,
    evidence: args.includes('--save') ? 'docs/sonar/etapa-6-exemplo.json' : null }, null, 2));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
