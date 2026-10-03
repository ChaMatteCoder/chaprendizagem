import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as tf from '@tensorflow/tfjs';
import { stableSoftmax, explainLabeledPrediction, explainNeuron, formatSonarNumber } from '../src/features/sonar/lib/math/sonarMath.js';
import { loadSonarLabData } from '../src/features/sonar/lib/data/loadSonarLabData.js';
import { createSonarLabSession } from '../src/features/sonar/lib/lab/sonarLabSession.js';
import { loadOfficialSonar } from '../src/features/sonar/lib/model/sonarArtifacts.js';
import { createSonarLabTrainer } from '../src/features/sonar/lib/model/trainLabModel.js';

await tf.setBackend('cpu'); await tf.ready();
const publicRoot = new URL('../public/', import.meta.url);
const localFetch = async path => new Response(await readFile(new URL(path.replace(/^\//, ''), publicRoot)));
const data = await loadSonarLabData({ fetchImpl: localFetch });
const config = { hiddenUnits: [16], epochs: 2, batchSize: 16, learningRate: 0.001, seed: 4242 };
function near(a, b, tolerance = 1e-5) { assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`); }
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function predictor(kind = 'official', predict = async () => ({ probabilities: [0.6, 0.4], predictedIndex: 0 })) {
  return { metadata: { kind, modelId: kind === 'official' ? data.manifest.modelId : 'experimental-1', architecture: [60, 16, 2] },
    disposals: 0, dispose() { this.disposals++; }, predict };
}

test('Softmax estável, cross-entropy e gradiente conferem casos conhecidos e logits extremos', () => {
  for (const logits of [[0, 0], [1000, -1000], [-1000, 1000], [1000, 1000], [-1000, -1000]]) {
    const softmax = stableSoftmax(logits);
    near(softmax.probabilities.reduce((a, b) => a + b), 1);
    assert.ok(softmax.probabilities.every(Number.isFinite));
  }
  const zero = { logits: [0, 0], probabilities: [0.5, 0.5] };
  const expected = explainLabeledPrediction(zero, 'R', { revealed: true });
  near(expected.crossEntropy, Math.log(2));
  assert.deepEqual(expected.oneHot, [1, 0]); assert.deepEqual(expected.gradientLogits, [-0.5, 0.5]);
  const extreme = explainLabeledPrediction({ logits: [1000, -1000], probabilities: [1, 0] }, 'M', { revealed: true });
  assert.equal(extreme.crossEntropy, 2000); assert.deepEqual(extreme.gradientLogits, [1, -1]);
  assert.throws(() => explainLabeledPrediction(zero, 'R'), /Revele/);
  assert.throws(() => explainLabeledPrediction(zero, 'invalid', { revealed: true }));
  assert.throws(() => explainLabeledPrediction({ ...zero, probabilities: [0.9, 0.1] }, 'R', { revealed: true }), /correspondem/);
  for (const invalid of [[], [1], [NaN, 0], [Infinity, 0]]) assert.throws(() => stableSoftmax(invalid));
  assert.equal(formatSonarNumber(0.0001, 4), '0,0001');
  assert.match(formatSonarNumber(1e-12), /e-12$/);
});

test('gradiente p-y corresponde à diferença finita da loss e à autodiferenciação real', () => {
  const logits = [1.23, -0.71];
  const loss = zs => explainLabeledPrediction({ logits: zs, probabilities: stableSoftmax(zs).probabilities }, 'M', { revealed: true });
  const explanation = loss(logits);
  const epsilon = 1e-5;
  logits.forEach((_, i) => {
    const high = [...logits], low = [...logits]; high[i] += epsilon; low[i] -= epsilon;
    near((loss(high).crossEntropy - loss(low).crossEntropy) / (2 * epsilon), explanation.gradientLogits[i], 1e-7);
  });
  const initial = tf.memory().numTensors;
  tf.tidy(() => {
    const gradient = tf.grad(z => tf.neg(tf.log(tf.softmax(z).slice([1], [1]))).sum());
    const actual = gradient(tf.tensor1d(logits)).dataSync();
    actual.forEach((value, i) => near(value, explanation.gradientLogits[i]));
  });
  assert.equal(tf.memory().numTensors, initial);
});

test('soma ponderada usa todos os pesos, bias e orientação real do kernel', () => {
  const layer = { input: [0.25, 0.8], kernel: [[2, -1], [-1, 3]], bias: [0.1, -0.2], z: [-0.2, 1.95], output: [0, 1.95] };
  const first = explainNeuron(layer, 0), second = explainNeuron(layer, 1);
  near(first.computedZ, -0.2); near(second.computedZ, 1.95); assert.equal(first.terms.length, 2);
  assert.throws(() => explainNeuron(layer, 2));
});

test('loader do laboratório valida arquivos reais e disponibiliza só desenvolvimento à exploração', async () => {
  assert.equal(data.samples.length, 208); assert.equal(data.development.length, 166);
  assert.ok(data.development.every(sample => !data.partitions.testIds.includes(sample.id)));
  assert.equal(data.metrics.finalTest.metrics.correct, 32);
  const badFetch = async path => {
    const bytes = await readFile(new URL(path.replace(/^\//, ''), publicRoot));
    if (path.endsWith('metrics.json')) bytes[0] ^= 1;
    return new Response(bytes);
  };
  await assert.rejects(loadSonarLabData({ fetchImpl: badFetch }), /corrompido/);
  await assert.rejects(loadSonarLabData({ fetchImpl: async () => new Response('', { status: 503 }) }), /503/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(loadSonarLabData({ signal: controller.signal, fetchImpl: async (_, { signal }) => {
    signal.throwIfAborted(); return new Response('');
  } }), { name: 'AbortError' });
});

test('trocar amostra invalida respostas antigas e rejeita IDs de teste ou modelo indisponível', async () => {
  const pending = [];
  const official = predictor('official', async (features, options) => {
    assert.deepEqual(Object.keys(options).sort(), ['signal', 'trace']);
    assert.equal(features.length, 60);
    const job = deferred(); pending.push({ job, options }); return job.promise;
  });
  const session = createSonarLabSession({ loadData: async () => data, loadOfficial: async () => official });
  await session.load();
  assert.throws(() => session.select(data.partitions.testIds[0], 'official'), /desenvolvimento/);
  assert.throws(() => session.select(data.development[0].id, 'experimental'), /indisponível/);
  const first = session.inspect();
  session.select(data.development[1].id, 'official'); const second = session.inspect();
  assert.ok(pending[0].options.signal.aborted);
  pending[1].job.resolve({ modelId: 'new', probabilities: [0.7, 0.3] }); await second;
  pending[0].job.resolve({ modelId: 'stale', probabilities: [0.1, 0.9] }); await first;
  assert.equal(session.state.inspection.result.modelId, 'new');
  session.dispose(); session.dispose(); assert.equal(official.disposals, 1);
});

test('carregamento com erro ou saída descarta predictor que chegou depois, sem callbacks tardios', async () => {
  const pending = deferred(), official = predictor(); let events = 0;
  const session = createSonarLabSession({ loadData: async () => { throw new Error('offline'); },
    loadOfficial: () => pending.promise, onChange: () => events++ });
  const loading = session.load(); session.dispose(); const before = events;
  pending.resolve(official); await loading;
  assert.equal(events, before); assert.equal(official.disposals, 1);
  const failedOfficial = predictor();
  const failed = createSonarLabSession({ loadData: async () => { throw new Error('offline'); }, loadOfficial: async () => failedOfficial });
  await failed.load(); assert.equal(failed.state.status, 'error'); assert.equal(failedOfficial.disposals, 1); failed.dispose();
});

test('cancelamento não promove pesos tardios; concorrência, restart e configuração ficam protegidos', async () => {
  const official = predictor(), partial = predictor('experimental'), jobs = [];
  const session = createSonarLabSession({ loadData: async () => data, loadOfficial: async () => official,
    makeTrainer: async () => ({ cancel() {}, dispose() {}, train(args) { const job = deferred(); jobs.push({ ...job, args }); return job.promise; } }) });
  await session.load();
  const mutable = { ...config, hiddenUnits: [16] }, running = session.train(mutable);
  mutable.hiddenUnits[0] = 64; await Promise.resolve();
  assert.equal(jobs[0].args.config.hiddenUnits[0], 16);
  await assert.rejects(session.train(config), /andamento/);
  jobs[0].args.onEpoch({ runId: 'first', epoch: 1, loss: 1, accuracy: 0.5, valLoss: 1, valAccuracy: 0.5 });
  session.cancelTraining(); jobs[0].args.onEpoch({ epoch: 2 });
  assert.equal(session.state.training.history.length, 1);
  jobs[0].resolve({ status: 'completed', predictor: partial, history: session.state.training.history, runId: 'first' }); await running;
  assert.equal(session.state.training.status, 'cancelled'); assert.equal(session.state.experimental, null); assert.equal(partial.disposals, 1);
  const complete = predictor('experimental'), restarted = session.train(config); await Promise.resolve();
  jobs[1].resolve({ status: 'completed', predictor: complete, history: [], runId: 'second' }); await restarted;
  assert.equal(session.state.training.status, 'completed'); assert.equal(official.disposals, 0);
  session.select(data.development[0].id, 'experimental');
  session.dispose(); assert.equal(complete.disposals, 1); assert.equal(official.disposals, 1);
});

test('sessão com motores reais completa treino experimental, trace e perda sem reavaliar teste nem reter tensores', async () => {
  const initial = tf.memory().numTensors;
  const session = createSonarLabSession({ loadData: async () => data,
    loadOfficial: () => loadOfficialSonar({ fetchImpl: localFetch }),
    makeTrainer: async loaded => createSonarLabTrainer(tf, loaded.samples, loaded.partitions, loaded.datasetSha256) });
  await session.load(); await session.inspect({ trace: true });
  const officialPrediction = session.state.inspection.result;
  const labeled = explainLabeledPrediction(officialPrediction.trace, data.development[0].label, { revealed: true });
  assert.ok(Number.isFinite(labeled.crossEntropy));
  await session.train(config); assert.equal(session.state.training.history.length, 2);
  assert.equal(session.state.experimental.kind, 'experimental');
  session.select(data.development[0].id, 'experimental'); await session.inspect({ trace: true });
  assert.equal(session.state.inspection.result.modelKind, 'experimental');
  session.select(data.development[0].id, 'official'); await session.inspect({ trace: true });
  assert.deepEqual(session.state.inspection.result, officialPrediction);
  session.dispose(); assert.equal(tf.memory().numTensors, initial);
});
