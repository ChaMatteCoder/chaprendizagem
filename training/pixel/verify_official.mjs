import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as tf from '@tensorflow/tfjs';
import { PIXEL_CNN_ARCHITECTURE } from '../../src/features/pixel/data/cifar10Schema.js';
import {
  applyInterference,
  applyRestorationTools,
  decodePixelsBase64,
  encodePixelsBase64,
  normalizePixelsToFloat32,
} from '../../src/features/pixel/lib/pixelOps.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function loadModelFromDir(dirPath) {
  const modelJsonBytes = await fs.readFile(path.join(dirPath, 'model.json'));
  const weightBytes = await fs.readFile(path.join(dirPath, 'weights.bin'));
  const modelJson = JSON.parse(modelJsonBytes.toString('utf8'));
  const model = await tf.loadLayersModel(
    tf.io.fromMemory({
      modelTopology: modelJson.modelTopology,
      weightSpecs: modelJson.weightsManifest[0].weights,
      weightData: weightBytes.buffer.slice(
        weightBytes.byteOffset,
        weightBytes.byteOffset + weightBytes.byteLength,
      ),
    }),
  );
  return { model, modelJsonBytes, weightBytes };
}

export async function verifyRunDir(runDir) {
  await tf.ready();
  const tfjsDir = path.join(runDir, 'tfjs');
  const parityFixtures = await readJson(path.join(runDir, 'parity-fixtures.json'));
  const { model } = await loadModelFromDir(tfjsDir);

  try {
    if (model.countParams() !== PIXEL_CNN_ARCHITECTURE.totalParameters) {
      throw new Error(
        `Contagem de parâmetros divergente: esperado ${PIXEL_CNN_ARCHITECTURE.totalParameters}, obtido ${model.countParams()}.`,
      );
    }

    const n = parityFixtures.sampleCount;
    const rawUint8 = Uint8Array.from(parityFixtures.imagesUint8Flat);
    const normalized = new Float32Array(rawUint8.length);
    for (let i = 0; i < n; i += 1) {
      const sampleU8 = rawUint8.subarray(i * 3072, (i + 1) * 3072);
      normalized.set(normalizePixelsToFloat32(sampleU8), i * 3072);
    }

    const beforeTensors = tf.memory().numTensors;
    const probsTfjs = tf.tidy(() => {
      const x = tf.tensor4d(normalized, [n, 32, 32, 3]);
      return model.predict(x).arraySync();
    });
    const afterTensors = tf.memory().numTensors;
    if (afterTensors !== beforeTensors) {
      throw new Error(`Vazamento de tensores detectado: antes=${beforeTensors}, depois=${afterTensors}.`);
    }

    let maxAbsDiff = 0;
    let argmaxMismatches = 0;
    for (let i = 0; i < n; i += 1) {
      const rowTf = probsTfjs[i];
      const rowPy = parityFixtures.pythonProbabilities[i];
      const sumProb = rowTf.reduce((acc, v) => acc + v, 0);
      if (Math.abs(sumProb - 1) > 1e-4) {
        throw new Error(`Soma de probabilidades inválida na amostra ${i}: ${sumProb}`);
      }
      for (let c = 0; c < 10; c += 1) {
        const diff = Math.abs(rowTf[c] - rowPy[c]);
        if (diff > maxAbsDiff) maxAbsDiff = diff;
      }
      const predTf = rowTf.indexOf(Math.max(...rowTf));
      if (predTf !== parityFixtures.pythonPredictedIndices[i]) {
        argmaxMismatches += 1;
      }
    }

    if (maxAbsDiff > 1e-5 || argmaxMismatches > 0) {
      throw new Error(
        `Falha de paridade Python <-> TF.js: maxAbsDiff=${maxAbsDiff}, argmaxMismatches=${argmaxMismatches}`,
      );
    }

    const report = {
      verifiedAt: new Date().toISOString(),
      tfjsVersion: tf.version.tfjs,
      backend: tf.getBackend(),
      sampleCount: n,
      parameterCount: model.countParams(),
      maxAbsDiff,
      argmaxAgreement: 1.0,
      tensorLeakDelta: afterTensors - beforeTensors,
    };
    await fs.writeFile(
      path.join(runDir, 'export-validation.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );
    console.log(
      `Paridade TF.js verificada em ${runDir}: maxAbsDiff=${maxAbsDiff.toExponential(3)}, 0 vazamentos.`,
    );
    return report;
  } finally {
    model.dispose();
  }
}

export async function verifyPublishedOfficial() {
  const officialDir = path.join(ROOT, 'public/models/pixel/official');
  const dataDir = path.join(ROOT, 'public/data/pixel');

  const manifest = await readJson(path.join(officialDir, 'manifest.json'));
  if (manifest.smoke !== false || manifest.kind !== 'official' || manifest.evaluation?.status !== 'completed') {
    throw new Error('Manifesto oficial inválido ou proveniente de smoke test.');
  }

  for (const [fileName, meta] of Object.entries(manifest.files)) {
    const buf = await fs.readFile(path.join(officialDir, fileName));
    const hash = sha256Buffer(buf);
    if (buf.byteLength !== meta.byteLength || hash !== meta.sha256) {
      throw new Error(`Hash ou tamanho divergente para ${fileName}: esperado ${meta.sha256}, obtido ${hash}`);
    }
  }

  const demoData = await readJson(path.join(dataDir, 'demo-samples.json'));
  for (const fix of demoData.pixelOpsReferenceFixtures) {
    const sample = demoData.samples.find((s) => s.id === fix.sampleId);
    const orig = decodePixelsBase64(sample.pixelsBase64);
    const corrupted = applyInterference(orig, fix.interference);
    const restored = applyRestorationTools(corrupted.pixels, fix.restoration);
    if (encodePixelsBase64(corrupted.pixels) !== fix.corruptedBase64) {
      throw new Error(`Equivalência de interferência falhou para ${fix.sampleId}`);
    }
    if (encodePixelsBase64(restored.pixels) !== fix.restoredBase64) {
      throw new Error(`Equivalência de restauração falhou para ${fix.sampleId}`);
    }
  }

  await tf.ready();
  const { model } = await loadModelFromDir(officialDir);
  try {
    const parityFixtures = await readJson(path.join(officialDir, 'parity-fixtures.json'));
    const n = parityFixtures.sampleCount;
    const rawUint8 = Uint8Array.from(parityFixtures.imagesUint8Flat);
    const normalized = new Float32Array(rawUint8.length);
    for (let i = 0; i < n; i += 1) {
      normalized.set(normalizePixelsToFloat32(rawUint8.subarray(i * 3072, (i + 1) * 3072)), i * 3072);
    }

    const beforeTensors = tf.memory().numTensors;
    const probsTfjs = tf.tidy(() => model.predict(tf.tensor4d(normalized, [n, 32, 32, 3])).arraySync());
    const afterTensors = tf.memory().numTensors;
    if (afterTensors !== beforeTensors) {
      throw new Error(`Vazamento de tensores na verificação oficial: delta=${afterTensors - beforeTensors}`);
    }

    let maxAbsDiff = 0;
    let argmaxMatches = 0;
    for (let i = 0; i < n; i += 1) {
      const rowTf = probsTfjs[i];
      for (let c = 0; c < 10; c += 1) {
        maxAbsDiff = Math.max(maxAbsDiff, Math.abs(rowTf[c] - parityFixtures.pythonProbabilities[i][c]));
      }
      const predTf = rowTf.indexOf(Math.max(...rowTf));
      if (predTf === parityFixtures.pythonPredictedIndices[i]) {
        argmaxMatches += 1;
      }
    }
    if (maxAbsDiff > 1e-5 || argmaxMatches !== n) {
      throw new Error(`Paridade oficial excedeu tolerância: maxAbsDiff=${maxAbsDiff}, argmaxMatches=${argmaxMatches}/${n}`);
    }
    console.log(
      `Artefatos oficiais verificados (${manifest.modelId}): ${Object.keys(manifest.files).length} arquivos íntegros, paridade=${maxAbsDiff.toExponential(3)}.`,
    );
    return {
      modelId: manifest.modelId,
      totalParameters: model.countParams(),
      caseCount: n,
      argmaxMatches,
      maxAbsDiff,
      tensorLeak: false,
    };
  } finally {
    model.dispose();
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const args = process.argv.slice(2);
  const runDirIndex = args.indexOf('--run-dir');
  if (runDirIndex !== -1 && args[runDirIndex + 1]) {
    await verifyRunDir(path.resolve(args[runDirIndex + 1]));
  } else {
    await verifyPublishedOfficial();
  }
}
