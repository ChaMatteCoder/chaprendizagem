import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as tf from '@tensorflow/tfjs';
import { createSonarMission, drawMissionIds } from '../src/features/sonar/lib/mission/sonarMission.js';
import { loadSonarLabData } from '../src/features/sonar/lib/data/loadSonarLabData.js';
import { loadSonarModelArtifacts } from '../src/features/sonar/lib/model/sonarArtifacts.js';
import { createSonarPredictor } from '../src/features/sonar/lib/model/predictSonar.js';
import { explainLabeledPrediction } from '../src/features/sonar/lib/math/sonarMath.js';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const samples = Array.from({ length: 42 }, (_, index) => ({ id: `test-${index}`, label: index % 2 ? 'M' : 'R', features: Array(60).fill(index / 42) }));
const metadata = { kind: 'official', modelId: 'frozen', architecture: [60, 16, 2], classOrder: ['R', 'M'] };
const data = { samples, partitions: { testIds: samples.map(row => row.id) }, manifest: { ...metadata, evaluation: { status: 'completed' } } };
const result = { modelId: 'frozen', modelKind: 'official', classOrder: ['R', 'M'], predictedIndex: 1, predictedLabel: 'M', probabilities: [0.2, 0.8], trace: { input: Array(60).fill(0), probabilities: [0.2, 0.8] } };
function setup(overrides = {}) {
  const inputs = []; let disposed = 0;
  const predictor = { metadata, predict: async (input, options) => { inputs.push({ input, options }); return result; }, dispose: () => disposed++ };
  const game = createSonarMission({ loadData: async () => data, loadOfficial: async () => predictor, random: () => 0, ...overrides });
  return { game, predictor, inputs, get disposed() { return disposed; } };
}

test('mission draw: five distinct test IDs, full pool eligible, input preserved, invalid randomness rejected', () => {
  const ids = samples.map(row => row.id), original = [...ids];
  assert.deepEqual(drawMissionIds(ids, () => 0), ids.slice(0, 5));
  const last = drawMissionIds(ids, () => 0.999999);
  assert.equal(last[0], ids.at(-1)); assert.equal(new Set(last).size, 5); assert.deepEqual(ids, original);
  assert.throws(() => drawMissionIds(ids, () => 1)); assert.throws(() => drawMissionIds(ids, () => NaN));
  assert.throws(() => drawMissionIds(['a', 'a', 'b', 'c', 'd'])); assert.throws(() => drawMissionIds(['a']));
});

test('mission sequence: no early prediction or reveal, one guess and one point per participant', async () => {
  const { game, inputs } = setup(); await game.start();
  assert.equal(inputs.length, 0); assert.equal(game.reveal(), false); assert.equal(game.next(), false);
  assert.equal(game.openContext(), false); assert.equal(game.context, null);
  assert.equal('label' in game.state.encounter.sample, false);
  await game.guess('R'); await game.guess('M');
  assert.equal(inputs.length, 1); assert.equal(game.state.encounter.choice, 'R');
  assert.equal(game.state.status, 'comparing'); assert.equal(game.state.history.length, 0);
  assert.equal('label' in game.state.encounter.sample, false);
  assert.equal(game.openContext(), true); assert.equal(game.context.revealed, false); assert.equal('label' in game.context.sample, false);
  assert.deepEqual(inputs[0].input, samples[0].features); assert.equal(inputs[0].input.length, 60);
  assert.ok(inputs[0].input.every(Number.isFinite)); assert.notEqual(inputs[0].input, samples[0].features);
  assert.equal(inputs[0].options.trace, true);
  assert.equal(game.reveal(), true); assert.equal(game.reveal(), false);
  assert.deepEqual(game.state.score, { user: 1, ai: 0 }); assert.equal(game.context.revealed, true);
  assert.equal(game.context.sample.label, 'R'); game.dispose();
});

test('five encounters finish with correct 0..5 totals, summaries and revealed context; restart resets everything', async () => {
  const { game } = setup(); await game.start();
  const ids = [];
  for (let i = 0; i < 5; i++) {
    ids.push(game.state.encounter.sample.id); await game.guess('R'); game.reveal();
    assert.equal(game.state.history.length, i + 1); game.next();
    if (i < 4) { assert.equal(game.state.status, 'guessing'); assert.equal(game.next(), false); }
  }
  assert.equal(new Set(ids).size, 5); assert.equal(game.state.status, 'finished');
  assert.deepEqual(game.state.score, { user: 3, ai: 2 });
  game.openContext(1); assert.equal(game.context.sample.id, ids[1]); assert.equal(game.context.sample.label, 'M');
  assert.equal(game.reveal(), false); assert.equal(game.next(), false);
  await game.start({ restart: true }); assert.equal(game.state.index, 0); assert.equal(game.state.history.length, 0);
  assert.deepEqual(game.state.score, { user: 0, ai: 0 }); assert.equal(game.context, null);
  assert.equal('label' in game.state.encounter.sample, false); game.dispose();
});

test('all correct/all incorrect guesses produce endpoints five and zero without filtering IA errors', async () => {
  for (const correct of [true, false]) {
    const { game } = setup(); await game.start();
    for (let i = 0; i < 5; i++) {
      const label = samples[i].label; await game.guess(correct ? label : label === 'R' ? 'M' : 'R'); game.reveal(); game.next();
    }
    assert.equal(game.state.score.user, correct ? 5 : 0); assert.equal(game.state.score.ai, 2); game.dispose();
  }
});

test('duplicate guess during pending inference and snapshots cannot mutate the recorded choice or features', async () => {
  const wait = deferred(), { game, predictor } = setup(); predictor.predict = () => wait.promise;
  await game.start(); const request = game.guess('R');
  assert.equal(await game.guess('M'), false); assert.equal(game.reveal(), false); assert.equal(game.next(), false);
  const view = game.state; view.encounter.choice = 'M'; view.encounter.sample.features[0] = 1;
  assert.equal(game.state.encounter.choice, 'R'); assert.equal(game.state.encounter.sample.features[0], 0);
  wait.resolve(result); await request; assert.equal(game.state.status, 'comparing'); game.dispose();
});

test('inference errors keep the encounter and choice, retry succeeds without invented result or points', async () => {
  const { game, predictor } = setup(); let attempts = 0;
  predictor.predict = async () => { if (!attempts++) throw new Error('Unavailable'); return result; };
  await game.start(); await game.guess('M');
  assert.equal(game.state.status, 'prediction-error'); assert.equal(game.state.encounter.prediction, null);
  assert.equal(game.state.encounter.choice, 'M'); assert.equal(game.state.index, 0); assert.equal(game.reveal(), false);
  await game.retryPrediction(); assert.equal(game.state.status, 'comparing'); assert.equal(game.state.history.length, 0);
  game.reveal(); assert.deepEqual(game.state.score, { user: 0, ai: 0 }); game.dispose();
});

test('experimental, wrong-model and malformed predictions are rejected without fallback', async () => {
  for (const invalid of [{ ...result, modelKind: 'experimental' }, { ...result, modelId: 'other' }, { ...result, probabilities: [NaN, 0.8] }, { ...result, predictedIndex: 0 }, { ...result, trace: null }]) {
    const { game, predictor } = setup(); predictor.predict = async () => invalid;
    await game.start(); await game.guess('R'); assert.equal(game.state.status, 'prediction-error');
    assert.equal(game.state.encounter.prediction, null); assert.equal(game.reveal(), false); game.dispose();
  }
});

test('restart, pause and leave invalidate old inference responses even if the predictor ignores abort', async () => {
  for (const action of ['restart', 'pause', 'leave']) {
    const wait = deferred(), { game, predictor } = setup(); let signal;
    predictor.predict = (input, options) => { signal = options.signal; return wait.promise; };
    await game.start(); const request = game.guess('R');
    if (action === 'restart') await game.start({ restart: true }); else game[action]();
    assert.equal(signal.aborted, true); wait.resolve(result); await request;
    assert.equal(game.state.encounter?.prediction ?? null, null); assert.equal(game.state.history.length, 0);
    assert.equal(game.state.status, { restart: 'guessing', pause: 'prediction-error', leave: 'idle' }[action]); game.dispose();
  }
});

test('missing official model blocks the mission, explicit reload recovers, no experiment substitution', async () => {
  let attempts = 0; const reference = setup();
  const { game } = setup({ loadOfficial: async () => { if (!attempts++) throw new Error('HTTP 404'); return reference.predictor; } });
  await game.start(); assert.equal(game.state.status, 'blocked'); assert.equal(game.state.encounter, null);
  await game.start(); assert.equal(game.state.status, 'guessing'); game.dispose(); reference.game.dispose();
  for (const invalid of [{ ...metadata, kind: 'experimental' }, { ...metadata, modelId: 'different' }]) {
    const local = setup({ loadOfficial: async () => ({ metadata: invalid, dispose() {} }) });
    await local.game.start(); assert.equal(local.game.state.status, 'blocked'); local.game.dispose();
  }
});

test('leaving/disposal during load releases late official resources without publishing an encounter', async () => {
  for (const action of ['leave', 'dispose']) {
    const wait = deferred(), events = [], reference = setup();
    const { game } = setup({ loadOfficial: () => wait.promise, onChange: state => events.push(state) });
    const request = game.start(); game[action](); const count = events.length;
    wait.resolve(reference.predictor); await request; assert.equal(events.length, count);
    assert.equal(reference.disposed, 1); game.dispose(); reference.game.dispose();
  }
});

test('real frozen model mission: exact feature-only trace, concealed label until reveal, same prediction in lab context, resources released', async () => {
  await tf.setBackend('cpu'); await tf.ready(); const before = tf.memory().numTensors;
  const root = new URL('../public/', import.meta.url);
  const fetchImpl = async path => { const bytes = await readFile(new URL(path.replace(/^\//, ''), root)); return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }; };
  const actual = await loadSonarLabData({ fetchImpl });
  const model = await loadSonarModelArtifacts(tf, actual.manifest,
    new Uint8Array(await readFile(new URL('models/sonar/official/model.json', root))), new Uint8Array(await readFile(new URL('models/sonar/official/weights.bin', root))));
  const real = createSonarPredictor(tf, model, actual.manifest); let input;
  const game = createSonarMission({ loadData: async () => actual, loadOfficial: async () => ({ metadata: real.metadata,
    predict: (features, options) => { input = features; return real.predict(features, options); }, dispose: () => real.dispose() }), random: () => 0 });
  await game.start(); const expected = actual.samples.find(row => row.id === game.state.encounter.sample.id);
  await game.guess('R'); assert.equal(game.state.status, 'comparing'); assert.deepEqual(input, expected.features);
  const prediction = game.state.encounter.prediction;
  assert.deepEqual(prediction.trace.input, expected.features);
  assert.equal(JSON.stringify(game.state).includes('"label"'), false);
  assert.throws(() => explainLabeledPrediction(prediction.trace, expected.label, { revealed: false }));
  game.openContext(); assert.deepEqual(game.context.prediction, prediction); assert.equal('label' in game.context.sample, false);
  game.reveal(); assert.equal(game.context.sample.label, expected.label);
  assert.ok(Number.isFinite(explainLabeledPrediction(game.context.prediction.trace, expected.label, { revealed: true }).crossEntropy));
  game.dispose(); assert.equal(tf.memory().numTensors, before);
});
