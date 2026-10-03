import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as tf from '@tensorflow/tfjs';
import { createSonarModel, disposeSonarModel, validateTrainingConfig } from '../src/features/sonar/lib/model/createSonarModel.js';
import { createSonarTrainer } from '../src/features/sonar/lib/model/trainSonarModel.js';
import { createSonarPredictor, validateProbabilities, validateSonarModelContract } from '../src/features/sonar/lib/model/predictSonar.js';
import { loadOfficialSonar, loadSonarModelArtifacts, serializeSonarModel, sha256Bytes } from '../src/features/sonar/lib/model/sonarArtifacts.js';
import { createSonarLabTrainer } from '../src/features/sonar/lib/model/trainLabModel.js';
import { parseSonar } from '../src/features/sonar/lib/data/sonarDataset.js';
import { classificationMetrics, evaluateSonarModel, meanAndSampleDeviation, selectOfficialCandidate } from '../src/features/sonar/lib/evaluation/sonarMetrics.js';

await tf.setBackend('cpu'); await tf.ready();
const config = { hiddenUnits: [16, 8], epochs: 4, batchSize: 4, learningRate: 0.001, seed: 4200 };
const rows = Array.from({ length: 12 }, (_, i) => ({ id: `sonar-${String(i + 1).padStart(4, '0')}`,
  features: Array(60).fill(i % 2 ? 0.9 : 0.1), label: i % 2 ? 'M' : 'R' }));
const trainRows = rows.slice(0, 8), validationRows = rows.slice(8);
const metadata = { modelId: 'test-mlp', kind: 'experimental', classOrder: ['R', 'M'], architecture: [60, 16, 8, 2] };
const input = Array(60).fill(0.4);
function near(a, b, tolerance = 1e-5) { assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`); }

async function bundle(model) {
  const saved = await serializeSonarModel(tf, model);
  const modelBytes = new TextEncoder().encode(`${JSON.stringify(saved.modelJson, null, 2)}\n`);
  const weightBytes = new Uint8Array(saved.weightData);
  const manifest = { ...metadata, files: {
    'model.json': { byteLength: modelBytes.byteLength, sha256: await sha256Bytes(modelBytes) },
    'weights.bin': { byteLength: weightBytes.byteLength, sha256: await sha256Bytes(weightBytes) },
  } };
  return { manifest, modelBytes, weightBytes };
}

test('arquiteturas reais têm os parâmetros previstos, saída Softmax e loss categórica', () => {
  const initial = tf.memory().numTensors;
  for (const [hiddenUnits, parameters] of [[[], 122], [[16], 1010], [[16, 8], 1130]]) {
    const model = createSonarModel(tf, { ...config, hiddenUnits });
    assert.equal(model.countParams(), parameters);
    assert.equal(model.loss, 'categoricalCrossentropy');
    validateSonarModelContract(model, { ...metadata, architecture: [60, ...hiddenUnits, 2] });
    disposeSonarModel(model); disposeSonarModel(model);
  }
  assert.equal(tf.memory().numTensors, initial);
  for (const override of [{ seed: -1 }, { epochs: 0 }, { batchSize: 65 }, { learningRate: NaN }, { hiddenUnits: [0] }, { hiddenUnits: Array(1) }]) {
    assert.throws(() => validateTrainingConfig({ ...config, ...override }));
  }
});

test('inferência retorna distribuição, argmax e identidade; ignora metadados e libera recursos', async () => {
  const initial = tf.memory().numTensors;
  const model = createSonarModel(tf, config);
  const predictor = createSonarPredictor(tf, model, metadata);
  const loaded = tf.memory().numTensors;
  const first = await predictor.predict(input, { label: 'R', id: 'one' });
  const second = await predictor.predict(input, { label: 'M', score: 5 });
  assert.deepEqual(first, second);
  assert.equal(first.modelId, metadata.modelId);
  assert.equal(first.modelKind, 'experimental');
  near(first.probabilities.reduce((a, b) => a + b), 1);
  assert.equal(first.predictedIndex, first.probabilities[0] >= first.probabilities[1] ? 0 : 1);
  assert.equal(first.predictedLabel, ['R', 'M'][first.predictedIndex]);
  assert.ok(!('loss' in first) && !('label' in first));
  for (const value of [[], Array(59).fill(0), [...input, 0], Array(60).fill(NaN), Array(60).fill(Infinity), Array(60).fill(-0.1), { features: input, label: 'R' }]) {
    await assert.rejects(predictor.predict(value));
  }
  assert.equal(tf.memory().numTensors, loaded);
  predictor.dispose();
  await assert.rejects(predictor.predict(input), { name: 'AbortError' });
  assert.equal(tf.memory().numTensors, initial);
});

test('contrato rejeita classes invertidas, arquitetura incorreta e distribuições inválidas', () => {
  const model = createSonarModel(tf, config);
  for (const override of [{ classOrder: ['M', 'R'] }, { architecture: [60, 2] }, { kind: 'mock' }, { modelId: '' }]) {
    assert.throws(() => validateSonarModelContract(model, { ...metadata, ...override }));
  }
  for (const values of [[NaN, 1], [0.3, 0.3], [Infinity, 0], [1.1, -0.1], [1], Array(2)]) assert.throws(() => validateProbabilities(values));
  assert.equal(validateProbabilities([0.5, 0.5]), 0);
  disposeSonarModel(model);
});

test('Softmax permanece finita com logits extremos e trace usa os pesos reais', async () => {
  const initial = tf.memory().numTensors;
  const model = createSonarModel(tf, { ...config, hiddenUnits: [] });
  tf.tidy(() => model.setWeights([tf.zeros([60, 2]), tf.tensor1d([1000, -1000])]));
  const predictor = createSonarPredictor(tf, model, { ...metadata, architecture: [60, 2] });
  const result = await predictor.predict(input, { trace: true });
  assert.deepEqual(result.probabilities, [1, 0]);
  assert.deepEqual(result.trace.logits, [1000, -1000]);
  assert.deepEqual(result.trace.layers[0].kernelShape, [60, 2]);
  assert.ok(!('loss' in result.trace));
  predictor.dispose();
  assert.equal(tf.memory().numTensors, initial);
});

test('trace Dense/ReLU/Softmax corresponde ao produto e à inferência, sem alterar pesos', async () => {
  const initial = tf.memory().numTensors;
  const predictor = createSonarPredictor(tf, createSonarModel(tf, config), metadata);
  const before = await predictor.predict(input);
  const loaded = tf.memory().numTensors;
  for (let repeat = 0; repeat < 3; repeat++) {
    const result = await predictor.predict(input, { trace: true });
    result.trace.layers.forEach(layer => {
      layer.z.forEach((value, j) => near(value, layer.input.reduce((sum, x, i) => sum + x * layer.kernel[i][j], layer.bias[j])));
      if (layer.activation === 'relu') layer.output.forEach((value, j) => near(value, Math.max(0, layer.z[j])));
    });
    result.trace.probabilities.forEach((value, i) => near(value, before.probabilities[i]));
    assert.equal(tf.memory().numTensors, loaded);
  }
  assert.deepEqual(await predictor.predict(input), before);
  predictor.dispose();
  assert.equal(tf.memory().numTensors, initial);
});

test('aborto e descarte com leitura pendente não devolvem resposta antiga nem vazam tensores', async () => {
  const initial = tf.memory().numTensors;
  const predictor = createSonarPredictor(tf, createSonarModel(tf, config), metadata);
  const controller = new AbortController();
  const pending = predictor.predict(input, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  const second = predictor.predict(input);
  predictor.dispose();
  await assert.rejects(second, { name: 'AbortError' });
  predictor.dispose();
  assert.equal(tf.memory().numTensors, initial);
});

test('treinamento real é reprodutível no CPU, registra validação e limpa Adam', async () => {
  const initial = tf.memory().numTensors;
  const untrained = createSonarModel(tf, config);
  const before = tf.tidy(() => Array.from(untrained.getWeights()[0].dataSync()));
  disposeSonarModel(untrained);
  const histories = [], predictions = [];
  for (let run = 0; run < 2; run++) {
    const trainer = createSonarTrainer(tf);
    const result = await trainer.train({ trainSamples: trainRows, validationSamples: validationRows, config });
    assert.equal(result.status, 'completed');
    assert.equal(result.history.length, 4);
    assert.ok(result.history.every(epoch => Number.isFinite(epoch.valLoss) && Number.isFinite(epoch.valAccuracy)));
    assert.notDeepEqual(tf.tidy(() => Array.from(result.model.getWeights()[0].dataSync())), before);
    histories.push(result.history.map(({ loss, accuracy, valLoss, valAccuracy }) => ({ loss, accuracy, valLoss, valAccuracy })));
    predictions.push((await evaluateSonarModel(tf, result.model, validationRows)).records);
    disposeSonarModel(result.model); trainer.dispose();
    assert.equal(tf.memory().numTensors, initial);
  }
  assert.deepEqual(histories[0], histories[1]);
  assert.deepEqual(predictions[0], predictions[1]);
});

test('cancelamento, concorrência entre controladores e reinício têm estados distintos', async () => {
  const initial = tf.memory().numTensors;
  const trainer = createSonarTrainer(tf), other = createSonarTrainer(tf);
  let callbacks = 0;
  const pending = trainer.train({ trainSamples: trainRows, config, onEpoch: () => { callbacks++; trainer.cancel(); } });
  await assert.rejects(other.train({ trainSamples: trainRows, config }), /andamento/);
  const cancelled = await pending;
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.completedEpochs, 1);
  assert.equal(callbacks, 1);
  assert.ok(!cancelled.model);
  assert.equal(tf.memory().numTensors, initial);
  const restarted = await trainer.train({ trainSamples: trainRows, config: { ...config, epochs: 1 } });
  assert.equal(restarted.status, 'completed');
  assert.notEqual(restarted.runId, cancelled.runId);
  disposeSonarModel(restarted.model);
  trainer.dispose(); other.dispose();
  assert.equal(tf.memory().numTensors, initial);
});

test('treino cede o event loop, aceita aborto externo e suprime callbacks após sair', async () => {
  const initial = tf.memory().numTensors;
  const trainer = createSonarTrainer(tf);
  const controller = new AbortController();
  let timerRan = false;
  const pending = trainer.train({ trainSamples: trainRows, config: { ...config, epochs: 100 }, signal: controller.signal });
  const timer = setTimeout(() => { timerRan = true; controller.abort(); }, 0);
  const result = await pending;
  clearTimeout(timer);
  assert.ok(timerRan);
  assert.equal(result.status, 'cancelled');
  assert.ok(result.completedEpochs < 100);
  let events = 0;
  const leaving = trainer.train({ trainSamples: trainRows, config, onEpoch: () => events++ });
  trainer.dispose();
  assert.equal((await leaving).status, 'cancelled');
  assert.equal(events, 0);
  assert.equal(tf.memory().numTensors, initial);
});

test('falhas de callback e partições sobrepostas não deixam modelo parcial ou trava global', async () => {
  const initial = tf.memory().numTensors;
  const trainer = createSonarTrainer(tf);
  await assert.rejects(trainer.train({ trainSamples: trainRows, validationSamples: trainRows, config }), /sobrepõem/);
  await assert.rejects(trainer.train({ trainSamples: trainRows, config, onEpoch: () => { throw new Error('callback failed'); } }), /callback failed/);
  assert.equal(trainer.state, 'error');
  assert.equal(tf.memory().numTensors, initial);
  const done = await trainer.train({ trainSamples: trainRows, config: { ...config, epochs: 1 } });
  disposeSonarModel(done.model); trainer.dispose();
  assert.equal(tf.memory().numTensors, initial);
});

test('exportar/importar mantém previsões; pesos corrompidos são rejeitados', async () => {
  const initial = tf.memory().numTensors;
  const model = createSonarModel(tf, config);
  const artifacts = await bundle(model);
  const restored = await loadSonarModelArtifacts(tf, artifacts.manifest, artifacts.modelBytes, artifacts.weightBytes);
  const originalService = createSonarPredictor(tf, model, metadata);
  const restoredService = createSonarPredictor(tf, restored, metadata);
  assert.deepEqual(await restoredService.predict(input), await originalService.predict(input));
  const damaged = new Uint8Array(artifacts.weightBytes); damaged[0] ^= 1;
  await assert.rejects(loadSonarModelArtifacts(tf, artifacts.manifest, artifacts.modelBytes, damaged), /corrompido/);
  originalService.dispose(); restoredService.dispose();
  assert.equal(tf.memory().numTensors, initial);
});

test('loader oficial rejeita modelo experimental/não avaliado e trata HTTP sem fallback', async () => {
  await assert.rejects(loadOfficialSonar({ fetchImpl: async () => new Response('{}', { status: 404 }) }), /HTTP 404/);
  for (const manifest of [{ kind: 'experimental' }, { schemaVersion: 1, kind: 'official', evaluation: { status: 'started' } }]) {
    await assert.rejects(loadOfficialSonar({ fetchImpl: async () => Response.json(manifest) }), /indisponível/);
  }
});

test('laboratório usa só sua divisão salva e retorna serviço experimental separado', async () => {
  const initial = tf.memory().numTensors;
  const data = parseSonar(await readFile(new URL('../public/data/sonar/sonar.all-data', import.meta.url), 'utf8'));
  const partitions = JSON.parse(await readFile(new URL('../public/data/sonar/partitions.json', import.meta.url), 'utf8'));
  const trainer = createSonarLabTrainer(tf, data, partitions, partitions.datasetSha256);
  const result = await trainer.train({ config: { ...config, epochs: 1 } });
  assert.equal(result.status, 'completed');
  assert.equal((await result.predictor.predict(data[0].features)).modelKind, 'experimental');
  assert.match(result.predictor.metadata.modelId, /^experimental-/);
  result.predictor.dispose(); trainer.dispose();
  assert.equal(tf.memory().numTensors, initial);
});

test('métricas conhecidas usam linhas verdadeiras/colunas previstas e denominadores explícitos', () => {
  const metrics = classificationMetrics([0, 0, 0, 1, 1], [0, 0, 1, 0, 1]);
  assert.deepEqual(metrics.confusionMatrix, [[2, 1], [1, 1]]);
  near(metrics.accuracy, 3 / 5); near(metrics.macroF1, (2 / 3 + 0.5) / 2);
  assert.deepEqual(classificationMetrics([0, 0], [0, 0]).perClass[1].zeroDenominators, ['precision', 'recall', 'f1']);
  assert.equal(classificationMetrics([], []).accuracy, 0);
  assert.throws(() => classificationMetrics([0], [2]));
  assert.deepEqual(meanAndSampleDeviation([1, 2, 3]), { mean: 2, sampleStandardDeviation: 1 });
});

test('seleção usa somente macro-F1 elegível, tolerância e simplicidade; mantém baseline no relatório', () => {
  const candidates = [
    { id: 'linear', role: 'baseline', parameters: 122, macroF1: { mean: 0.99 } },
    { id: 'small', role: 'mlp', parameters: 1010, macroF1: { mean: 0.80 } },
    { id: 'large', role: 'mlp', parameters: 1130, macroF1: { mean: 0.80005 } },
  ];
  assert.equal(selectOfficialCandidate(candidates, { eligibleRole: 'mlp', tieTolerance: 0.0001 }).id, 'small');
  candidates[2].macroF1.mean = 0.81;
  assert.equal(selectOfficialCandidate(candidates, { eligibleRole: 'mlp', tieTolerance: 0.0001 }).id, 'large');
  assert.equal(candidates[0].id, 'linear');
});
