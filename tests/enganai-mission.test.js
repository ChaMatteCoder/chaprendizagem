import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { inflateSync } from 'node:zlib';
import * as ort from 'onnxruntime-web';
import { BUNDLE_PATH, normalizePixels, sha256Hex } from '../src/features/enganai/lib/inference/contract.js';
import { createGanEngine } from '../src/features/enganai/lib/inference/engine.js';
import { crc32, encodeGrayPng } from '../src/features/enganai/lib/mission/png.js';
import { PROGRESS_KEY, applySession, emptyProgress, isProgress, readProgress, saveCompletedSession } from '../src/features/enganai/lib/mission/progress.js';
import { createSession, lupaTally, planRounds, questionFor, sampleRecord, sessionErrors, sessionReducer } from '../src/features/enganai/lib/mission/session.js';

ort.env.wasm.numThreads = 1;
const root = process.cwd();
const run = join(root, 'public/models/enganai', BUNDLE_PATH);
const data = join(root, 'public/data/enganai');
const missions = [
  { id: 'primeiros-rastros', requires: null },
  { id: 'novos-padroes', requires: 'primeiros-rastros' },
  { id: 'grande-duelo', requires: 'novos-padroes' },
];
const POOL = { realCount: 500, latentCount: 64 };

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => (values.has(key) ? values.get(key) : null), setItem: (key, value) => values.set(key, String(value)) };
}

// Synthetic rounds for reducer tests; the real engine is exercised further below.
function fakeRounds(sessionId, plan) {
  return plan.map((round, index) => ({
    sample: sampleRecord({
      sessionId,
      index,
      imageAsset: { path: `sessions/${sessionId}/round-${index + 1}.png`, sha256: 'a'.repeat(63) + String(index), bytes: 900 },
      provenance: round.origin === 'real'
        ? { origin: 'real', datasetId: 'fashion-mnist', partition: 'arena', recordId: `train-0000${index}` }
        : { origin: 'synthetic', runId: 'run', checkpointId: 'ckpt', generatorSha256: 'b'.repeat(64), latent: { dimension: 2, distribution: 'normal-0-1', rngId: 'rng', seed: 1, values: [0, 1] } },
    }),
    discriminator: { status: 'ready', runId: 'run', checkpointId: 'ckpt', logit: index - 2, score: 0.5, threshold: 0.5, predictedOrigin: index >= 2 ? 'real' : 'synthetic', meaning: 'uncalibrated-sigmoid' },
  }));
}

function playToSummary(state, choose) {
  for (let round = 0; round < 5; round++) {
    state = sessionReducer(state, { type: 'answer', roundIndex: round, choice: choose(state, round) });
    state = sessionReducer(state, { type: 'next' });
  }
  return state;
}

function preparedSession(id = 's-test', seed = 7, missionId = 'primeiros-rastros') {
  let state = createSession({ id, missionId, selectionSeed: seed });
  state = sessionReducer(state, { type: 'prepare' });
  return sessionReducer(state, { type: 'prepared', rounds: fakeRounds(id, planRounds(seed, POOL)) });
}

test('round selection is reproducible, balanced 2/3 and never repeats a sample', () => {
  const counts = { 2: 0, 3: 0 };
  for (let seed = 0; seed < 2000; seed++) {
    const plan = planRounds(seed, POOL);
    assert.equal(plan.length, 5);
    const reals = plan.filter(round => round.origin === 'real');
    assert.ok(reals.length === 2 || reals.length === 3);
    counts[reals.length]++;
    for (const origin of ['real', 'synthetic']) {
      const indices = plan.filter(round => round.origin === origin).map(round => round.index);
      assert.equal(new Set(indices).size, indices.length);
      assert.ok(indices.every(index => index >= 0 && index < (origin === 'real' ? POOL.realCount : POOL.latentCount)));
    }
  }
  assert.deepEqual(planRounds(123456, POOL), planRounds(123456, POOL));
  assert.notDeepEqual(planRounds(1, POOL), planRounds(2, POOL));
  assert.ok(counts[2] > 800 && counts[3] > 800, JSON.stringify(counts));
  assert.throws(() => planRounds(-1, POOL), RangeError);
  assert.throws(() => planRounds(2 ** 32, POOL), RangeError);
});

test('a session answers once per round, scores 100 per origin and reaches summary', () => {
  let state = preparedSession();
  assert.equal(state.session.phase, 'investigating');
  const question = questionFor(state);
  assert.deepEqual(Object.keys(question).sort(), ['dataMode', 'image', 'kind', 'missionId', 'roundCount', 'roundIndex', 'sampleId', 'schemaVersion', 'sessionId']);
  assert.ok(!JSON.stringify(question).includes('origin'), 'A pergunta não pode revelar a origem.');
  const truth = state.rounds[0].sample.provenance.origin;
  state = sessionReducer(state, { type: 'answer', roundIndex: 0, choice: truth });
  const repeated = sessionReducer(state, { type: 'answer', roundIndex: 0, choice: truth === 'real' ? 'synthetic' : 'real' });
  assert.equal(repeated, state, 'Uma segunda resposta é ignorada.');
  assert.equal(state.session.score, 100);
  assert.equal(questionFor(state), null);
  assert.equal(sessionReducer(state, { type: 'answer', roundIndex: 1, choice: 'real' }), state, 'Não se responde a rodada seguinte antes de avançar.');
  state = sessionReducer(state, { type: 'next' });
  state = sessionReducer(state, { type: 'answer', roundIndex: 1, choice: 'invalid' });
  assert.equal(state.session.answers.length, 1);
  // Always wrong from here on.
  for (let round = 1; round < 5; round++) {
    const origin = state.rounds[round].sample.provenance.origin;
    state = sessionReducer(state, { type: 'answer', roundIndex: round, choice: origin === 'real' ? 'synthetic' : 'real' });
    assert.deepEqual(sessionErrors(state.session), []);
    state = sessionReducer(state, { type: 'next' });
  }
  assert.equal(state.session.phase, 'summary');
  assert.equal(state.session.score, 100);
  assert.deepEqual(sessionErrors(state.session), []);
  assert.equal(sessionReducer(state, { type: 'next' }), state);
  const lupa = lupaTally(state.session.answers);
  assert.equal(lupa.analysed, 5);
});

test('preparation failures become a recoverable error without partial rounds', () => {
  let state = createSession({ id: 's-err', missionId: 'primeiros-rastros', selectionSeed: 9 });
  assert.equal(sessionReducer(state, { type: 'prepared', rounds: [] }), state, 'Rodadas só entram depois de preparar.');
  state = sessionReducer(state, { type: 'prepare' });
  state = sessionReducer(state, { type: 'fail', code: 'asset-load', message: 'Sem rede.' });
  assert.equal(state.session.phase, 'error');
  assert.deepEqual(state.session.error, { code: 'asset-load', message: 'Sem rede.', recoverTo: 'preparing' });
  assert.deepEqual(sessionErrors(state.session), []);
  state = sessionReducer(state, { type: 'prepare' });
  assert.equal(state.session.phase, 'preparing');
  assert.equal(state.session.error, null);
  const unbalanced = fakeRounds('s-err', planRounds(9, POOL)).map(round => ({ ...round, sample: { ...round.sample, provenance: { origin: 'real', datasetId: 'fashion-mnist', partition: 'arena', recordId: 'train-00001' } } }));
  assert.equal(sessionReducer(state, { type: 'prepared', rounds: unbalanced }).session.phase, 'preparing', '5 reais violam o equilíbrio 2/3.');
  const leaked = fakeRounds('s-err', planRounds(9, POOL)).map(round => round.sample.provenance.origin === 'real' ? { ...round, sample: { ...round.sample, provenance: { ...round.sample.provenance, partition: 'test' } } } : round);
  assert.equal(sessionReducer(state, { type: 'prepared', rounds: leaked }).session.phase, 'preparing', 'Teste oficial não entra na arena.');
});

test('progress counts a session once, keeps the best result and derives unlocks and badges', () => {
  const first = playToSummary(preparedSession('s-one', 1), (state, round) => state.rounds[round].sample.provenance.origin);
  const second = playToSummary(preparedSession('s-two', 2), () => 'real');
  let result = applySession(emptyProgress(), first.session, missions);
  assert.equal(result.status, 'saved');
  assert.deepEqual(result.newlyUnlocked, ['novos-padroes']);
  assert.ok(isProgress(result.record, missions));
  const once = result.record;
  assert.equal(applySession(once, first.session, missions).status, 'duplicate');
  assert.equal(applySession(once, first.session, missions).record, once);
  result = applySession(once, second.session, missions);
  assert.equal(result.record.missions[0].completions, 2);
  assert.equal(result.record.missions[0].bestCorrect, 5, 'O melhor resultado não diminui.');
  assert.equal(result.record.missions[0].bestScore, 500);
  assert.deepEqual(result.newlyUnlocked, []);
  const locked = playToSummary(preparedSession('s-locked', 3, 'grande-duelo'), () => 'real');
  assert.equal(applySession(once, locked.session, missions).status, 'locked');
  const unfinished = preparedSession('s-open', 4);
  assert.equal(applySession(once, unfinished.session, missions).status, 'invalid');
  const tampered = { ...first.session, id: 's-tampered', score: first.session.score - 100 };
  assert.equal(applySession(once, tampered, missions).status, 'invalid');
  let record = once;
  for (const [id, mission] of [['s-two-a', 'novos-padroes'], ['s-three', 'grande-duelo']]) record = applySession(record, playToSummary(preparedSession(id, 5, mission), () => 'real').session, missions).record;
  assert.deepEqual(record.badges, ['first-mission', 'all-missions']);
  assert.ok(isProgress(record, missions));
});

test('saving preserves incompatible data and survives blocked storage', () => {
  const finished = playToSummary(preparedSession('s-save', 11), () => 'synthetic');
  const storage = memoryStorage();
  assert.equal(saveCompletedSession(storage, finished.session, missions).status, 'saved');
  assert.equal(saveCompletedSession(storage, finished.session, missions).status, 'duplicate');
  assert.equal(JSON.parse(storage.getItem(PROGRESS_KEY)).completedSessionIds.length, 1);
  const future = JSON.stringify({ schemaVersion: 2, kind: 'progress' });
  const incompatible = memoryStorage({ [PROGRESS_KEY]: future });
  assert.equal(saveCompletedSession(incompatible, finished.session, missions).status, 'incompatible');
  assert.equal(incompatible.getItem(PROGRESS_KEY), future);
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.equal(readProgress(blocked, missions).persistence, 'unavailable');
  assert.equal(saveCompletedSession(blocked, finished.session, missions).status, 'unavailable');
});

test('PNG encoder is deterministic, valid and lossless', () => {
  const pixels = Uint8Array.from({ length: 784 }, (_, i) => (i * 7) & 255);
  const png = encodeGrayPng(pixels);
  assert.deepEqual([...encodeGrayPng(pixels)], [...png]);
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(png.buffer);
  let offset = 8;
  const chunks = [];
  while (offset < png.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    const body = png.subarray(offset + 8, offset + 8 + length);
    assert.equal(view.getUint32(offset + 8 + length), crc32(png.subarray(offset + 4, offset + 8 + length)), `CRC ${type}`);
    chunks.push({ type, body });
    offset += 12 + length;
  }
  assert.deepEqual(chunks.map(chunk => chunk.type), ['IHDR', 'IDAT', 'IEND']);
  const raw = inflateSync(chunks[1].body);
  assert.equal(raw.length, 28 * 29);
  for (let y = 0; y < 28; y++) {
    assert.equal(raw[y * 29], 0);
    assert.deepEqual([...raw.subarray(y * 29 + 1, (y + 1) * 29)], [...pixels.subarray(y * 28, (y + 1) * 28)]);
  }
  assert.throws(() => encodeGrayPng(new Uint8Array(10)), TypeError);
});

async function realMission(engine, { id, missionId, seed, epoch }) {
  const pool = await engine.loadArenaPool();
  const prepared = await engine.verifyCheckpoint({ epoch });
  let state = sessionReducer(createSession({ id, missionId, selectionSeed: seed }), { type: 'prepare' });
  const plan = planRounds(seed, { realCount: pool.pool.real.recordIds.length, latentCount: pool.pool.latents.count });
  const built = await engine.buildRounds({ checkpointId: prepared.checkpointId }, plan);
  const rounds = [];
  for (const [index, round] of built.rounds.entries()) {
    const png = encodeGrayPng(round.pixels);
    rounds.push({ sample: sampleRecord({ sessionId: id, index, provenance: round.provenance, imageAsset: { path: `sessions/${id}/round-${index + 1}.png`, sha256: await sha256Hex(png), bytes: png.byteLength } }), discriminator: round.discriminator, pixels: round.pixels });
  }
  state = sessionReducer(state, { type: 'prepared', rounds });
  return { state, plan, built, pool };
}

test('engine builds rounds from the arena pool and live G(z), with D on the shown pixels', async () => {
  const engine = createGanEngine({ ort, fetchBytes: async path => new Uint8Array(await readFile(join(run, path))), fetchData: async path => new Uint8Array(await readFile(join(data, path))) });
  try {
    const { state, plan, built, pool } = await realMission(engine, { id: 's-engine', missionId: 'primeiros-rastros', seed: 2026, epoch: 1 });
    assert.equal(state.session.phase, 'investigating');
    const split = JSON.parse(await readFile(join(run, 'split.json'), 'utf8'));
    const arena = new Set(split.partitions.arena);
    for (const [index, round] of built.rounds.entries()) {
      const step = plan[index];
      assert.equal(round.provenance.origin, step.origin);
      if (step.origin === 'real') {
        assert.ok(arena.has(round.provenance.recordId));
        assert.deepEqual([...round.pixels], [...pool.real.subarray(step.index * 784, (step.index + 1) * 784)]);
      } else {
        const vector = pool.latents.vectors[step.index];
        assert.deepEqual(round.provenance.latent.values, vector);
        assert.equal(round.provenance.latent.rngId, 'pytorch-cpu-normal-v1');
        const expected = await engine.generate({ epoch: 1 }, [vector]);
        assert.deepEqual([...round.pixels], [...expected.pixels]);
      }
      const direct = await engine.discriminate({ epoch: 1 }, normalizePixels(round.pixels));
      assert.equal(round.discriminator.logit, direct.logits[0]);
      assert.equal(round.discriminator.checkpointId, 'cpu-no-batchnorm-v1-epoch-001');
    }
    await assert.rejects(engine.buildRounds({ epoch: 1 }, [{ origin: 'real', index: 500 }]), /fora do conjunto/);
    await assert.rejects(engine.buildRounds({ epoch: 1 }, [{ origin: 'synthetic', index: 64 }]), /fora do conjunto/);
  } finally {
    await engine.dispose();
  }
});

const python = join(root, 'training/enganai/.venv/bin/python');
test('records from a real mission satisfy the stage-01 contracts (Python validator)', { skip: !existsSync(python) && 'ambiente Python ausente' }, async () => {
  const engine = createGanEngine({ ort, fetchBytes: async path => new Uint8Array(await readFile(join(run, path))), fetchData: async path => new Uint8Array(await readFile(join(data, path))) });
  try {
    const records = [];
    let progress = emptyProgress();
    for (const [id, missionId, seed, epoch] of [['s-contract-1', 'primeiros-rastros', 31, 1], ['s-contract-2', 'novos-padroes', 32, 4]]) {
      let { state } = await realMission(engine, { id, missionId, seed, epoch });
      records.push(...state.rounds.map(round => round.sample));
      for (let round = 0; round < 5; round++) {
        records.push(questionFor(state));
        state = sessionReducer(state, { type: 'answer', roundIndex: round, choice: round % 2 ? 'real' : 'synthetic' });
        state = sessionReducer(state, { type: 'next' });
      }
      records.push(...state.session.answers, state.session);
      progress = applySession(progress, state.session, missions).record;
    }
    records.push(progress);
    const result = spawnSync(python, ['training/enganai/validate_mission.py'], { cwd: root, input: JSON.stringify({ records }), encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(JSON.parse(result.stdout).status, 'passed');
    // The validator must still reject a tampered answer key.
    const broken = structuredClone(records);
    const reveal = broken.find(item => item.kind === 'round-reveal');
    reveal.correctOrigin = reveal.provenance.origin === 'real' ? 'synthetic' : 'real';
    const rejected = spawnSync(python, ['training/enganai/validate_mission.py'], { cwd: root, input: JSON.stringify({ records: broken }), encoding: 'utf8' });
    assert.notEqual(rejected.status, 0);
  } finally {
    await engine.dispose();
  }
});
