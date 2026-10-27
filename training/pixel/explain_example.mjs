import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import * as tf from '@tensorflow/tfjs';
import { decodePixelsBase64, normalizePixelsToFloat32 } from '../../src/features/pixel/lib/pixelOps.js';
import {
  explainConv1Step,
  explainCrossEntropy,
  explainGlobalAveragePoolChannel,
  explainMaxPool1Window,
  stableSoftmax,
} from '../../src/features/pixel/lib/cnnMath.js';
import { createPixelPredictor } from '../../src/features/pixel/lib/predictPixel.js';

const root = new URL('../../', import.meta.url);
const officialDir = new URL('public/models/pixel/official/', root);
const demoSamplesUrl = new URL('public/data/pixel/demo-samples.json', root);

async function loadNodeModel() {
  const modelJsonText = await readFile(new URL('model.json', officialDir), 'utf8');
  const modelJson = JSON.parse(modelJsonText);
  const weightSpecs = modelJson.weightsManifest.flatMap((group) => group.weights);
  const weightsBuffer = await readFile(new URL('weights.bin', officialDir));
  const weightData = weightsBuffer.buffer.slice(
    weightsBuffer.byteOffset,
    weightsBuffer.byteOffset + weightsBuffer.byteLength,
  );
  return tf.loadLayersModel(
    tf.io.fromMemory({
      modelTopology: modelJson.modelTopology,
      weightSpecs,
      weightData,
    }),
  );
}

export async function explainValidationExample(sampleIdArg, { filterIndex = 0, row = 15, col = 15 } = {}) {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', officialDir), 'utf8'));
  const demoPack = JSON.parse(await readFile(demoSamplesUrl, 'utf8'));
  const sample = sampleIdArg
    ? demoPack.samples.find((item) => item.id === sampleIdArg)
    : demoPack.samples[0];
  if (!sample) {
    throw new Error(`Amostra de validação não encontrada: ${sampleIdArg}`);
  }
  if (sample.partition !== 'validation') {
    throw new Error('O exemplo didático deve pertencer à partição de validação.');
  }

  await tf.setBackend('cpu');
  await tf.ready();
  const initialTensors = tf.memory().numTensors;

  const model = await loadNodeModel();
  const predictor = createPixelPredictor(tf, model, manifest);

  let explanation;
  try {
    const rgbUint8 = decodePixelsBase64(sample.pixelsBase64);
    const normalized = normalizePixelsToFloat32(rgbUint8);
    const prediction = await predictor.predict(rgbUint8, { includeActivations: true });
    const { activations } = prediction;

    const conv1Check = explainConv1Step(
      normalized,
      activations.conv1Kernel,
      activations.conv1Bias,
      { row, col, filterIndex },
      activations.layers.conv2d_1.preRelu,
      activations.layers.conv2d_1.postRelu,
    );
    assert.ok(conv1Check.absDiffZ <= 1e-5, 'z didático deve coincidir com conv2d_1.preRelu');
    assert.ok(conv1Check.absDiffPostRelu <= 1e-5, 'a didático deve coincidir com conv2d_1.postRelu');

    const poolRow = Math.floor(row / 2);
    const poolCol = Math.floor(col / 2);
    const poolCheck = explainMaxPool1Window(
      activations.layers.conv2d_1.postRelu,
      { poolRow, poolCol, filterIndex },
      activations.layers.max_pooling2d_1.output,
    );
    assert.ok(poolCheck.absDiff <= 1e-5, 'MaxPool2D didático deve coincidir com max_pooling2d_1.output');

    const gapCheck = explainGlobalAveragePoolChannel(
      activations.layers.conv2d_3.postRelu,
      filterIndex,
      activations.layers.global_average_pooling2d_1.output,
    );
    assert.ok(gapCheck.absDiff <= 1e-5, 'GAP didático deve coincidir com global_average_pooling2d_1.output');

    const softmaxCheck = stableSoftmax(prediction.logits);
    const crossEntropyCheck = explainCrossEntropy(
      prediction.logits,
      prediction.probabilities,
      sample.label,
    );

    explanation = {
      schemaVersion: 1,
      sampleId: sample.id,
      partition: sample.partition,
      trueLabelIndex: sample.label,
      trueClassId: sample.classId,
      trueClassNamePt: sample.classNamePt,
      modelId: manifest.modelId,
      predictedIndex: prediction.winnerIndex,
      predictedClassNamePt: prediction.winnerClass.pt,
      confidence: prediction.confidence,
      logits: prediction.logits,
      probabilities: prediction.probabilities,
      conv1PatchCheck: conv1Check,
      maxPool1Check: poolCheck,
      gapChannelCheck: gapCheck,
      softmaxCheck,
      crossEntropyCheck,
      newTestPredictions: 0,
      tensorLeak: false,
    };
  } finally {
    predictor.dispose();
  }

  assert.equal(tf.memory().numTensors, initialTensors, 'O exemplo deve liberar todos os tensores.');
  return explanation;
}

async function main() {
  const args = process.argv.slice(2);
  const save = args.includes('--save');
  const idArg = args.find((arg) => arg.startsWith('--id='))?.slice(5);
  const explanation = await explainValidationExample(idArg);
  if (save) {
    const outDir = new URL('docs/pixel/', root);
    await mkdir(outDir, { recursive: true });
    await writeFile(
      new URL('etapa-6-exemplo.json', outDir),
      `${JSON.stringify(explanation, null, 2)}\n`,
      'utf8',
    );
  }
  console.log(
    JSON.stringify(
      {
        sampleId: explanation.sampleId,
        trueClassNamePt: explanation.trueClassNamePt,
        predictedClassNamePt: explanation.predictedClassNamePt,
        confidence: explanation.confidence,
        conv1AbsDiff: explanation.conv1PatchCheck.absDiffPostRelu,
        pool1AbsDiff: explanation.maxPool1Check.absDiff,
        gapAbsDiff: explanation.gapChannelCheck.absDiff,
        crossEntropy: explanation.crossEntropyCheck.exactCrossEntropy,
        tensorLeak: explanation.tensorLeak,
        savedTo: save ? 'docs/pixel/etapa-6-exemplo.json' : null,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
