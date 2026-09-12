import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASS_CATALOG, isSpecial, topProbabilities } from '../src/features/iadivinha/data/classCatalog.js';
import { createRareGameSequence, seededRandom } from '../src/features/iadivinha/lib/gameSequence.js';
import { gameReducer, initialGameState } from '../src/features/iadivinha/lib/gameReducer.js';
import { revealDuration, scheduleReveal, playUnlockSound } from '../src/features/iadivinha/lib/rareReveal.js';
import { simulatePrediction } from '../src/features/iadivinha/lib/mockDrawingClassifier.js';
import { validateClasses } from '../src/features/iadivinha/lib/loadClasses.js';
import { validateModelContract } from '../src/features/iadivinha/lib/loadDrawingModel.js';
import { readFileSync } from 'node:fs';

test('Turma do ÃO: seis rodadas, principais obrigatórias, uma rara fora da primeira e sem adjacências', () => {
  const counts = new Map(), positions = new Set();
  const random = seededRandom(42);
  for (let run = 0; run < 3000; run++) {
    const sequence = createRareGameSequence(CLASS_CATALOG, random);
    assert.equal(sequence.length, 6);
    for (const core of CLASS_CATALOG.filter(item => item.type === 'core')) assert.ok(sequence.includes(core));
    assert.ok(sequence.every(item => CLASS_CATALOG.includes(item)));
    assert.equal(sequence.filter(isSpecial).length, 1);
    assert.ok(!isSpecial(sequence[0]));
    assert.ok(sequence.every((item, index) => !index || item.id !== sequence[index - 1].id));
    const rare = sequence.find(isSpecial);
    counts.set(rare.id, (counts.get(rare.id) || 0) + 1);
    positions.add(sequence.indexOf(rare));
  }
  assert.equal(positions.size, 5);
  assert.equal(counts.size, 5);
  for (const count of counts.values()) assert.ok(count > 480 && count < 720);
  assert.deepEqual(createRareGameSequence(CLASS_CATALOG, seededRandom(123)), createRareGameSequence(CLASS_CATALOG, seededRandom(123)));
  assert.throws(() => createRareGameSequence(CLASS_CATALOG.slice(1)));
});

test('Revelação: única por rodada rara, bloqueia início/envio, prazo só após concluir e reinício limpa estado', () => {
  let state = gameReducer(initialGameState, { type: 'START', sequence: createRareGameSequence(CLASS_CATALOG, seededRandom(7)) });
  let reveals = 0;
  for (let round = 0; round < 6; round++) {
    state = gameReducer(state, { type: 'BEGIN', now: 100 });
    if (isSpecial(state.sequence[round])) {
      reveals++;
      assert.equal(state.phase, 'revealing');
      assert.equal(state.deadline, undefined);
      assert.equal(gameReducer(state, { type: 'BEGIN', now: 200 }), state);
      assert.equal(gameReducer(state, { type: 'SUBMIT', hasInk: true }), state);
      assert.equal(gameReducer(state, { type: 'REVEAL_DONE', round: round + 1, now: 2500 }), state);
      const reset = gameReducer(state, { type: 'START', sequence: state.sequence });
      assert.equal(reset.phase, 'preparing'); assert.equal(reset.round, 0); assert.equal(reset.deadline, undefined);
      assert.equal(gameReducer(reset, { type: 'REVEAL_DONE', round, now: 2500 }), reset);
      state = gameReducer(state, { type: 'REVEAL_DONE', round, now: 2500 });
      assert.equal(state.deadline, 12500);
    } else { assert.equal(state.phase, 'drawing'); assert.equal(state.deadline, 10100); }
    assert.equal(gameReducer(state, { type: 'REVEAL_DONE', round, now: 5000 }), state);
    state = gameReducer(state, { type: 'SUBMIT', token: round, hasInk: true, reason: 'manual' });
    state = gameReducer(state, { type: 'RESOLVE', token: round, prediction: { id: state.sequence[round].id, confidence: 1 } });
    state = gameReducer(state, { type: 'NEXT' });
  }
  assert.equal(reveals, 1); assert.equal(state.phase, 'finished'); assert.equal(state.score, 600);
});

test('Revelação: movimento reduzido curto, cancelamento remove timeout, áudio opcional não bloqueia', async () => {
  assert.equal(revealDuration(false), 2400); assert.equal(revealDuration(true), 700);
  const scheduled = new Map(); let called = false;
  const timers = { setTimeout(fn, duration) { scheduled.set(1, {fn, duration}); return 1; }, clearTimeout(id) { scheduled.delete(id); } };
  const cancel = scheduleReveal(() => { called = true; }, true, timers);
  assert.equal(scheduled.get(1).duration, 700); cancel(); assert.equal(scheduled.size, 0); assert.equal(called, false);
  scheduleReveal(() => { called = true; }, false, timers); scheduled.get(1).fn(); assert.equal(called, true);
  let plays = 0;
  const audio = { enabled: true, muted: true, userActivated: true, playUnlock() { plays++; throw new Error('sem áudio'); } };
  playUnlockSound(audio); assert.equal(plays, 0);
  playUnlockSound({...audio, muted: false, userActivated: false}); assert.equal(plays, 0);
  playUnlockSound({...audio, muted: false}); assert.equal(plays, 1);
  playUnlockSound({ ...audio, muted: false, playUnlock: () => Promise.reject(new Error('falha')) });
  await Promise.resolve();
});

test('Mock de oito classes: distribuição válida, vencedor máximo e somente top 3 sem renormalizar', () => {
  const prediction = simulatePrediction({ width: 1, height: 1, data: new Uint8ClampedArray([0,0,0,255]) }, CLASS_CATALOG);
  assert.equal(prediction.probabilities.length, 8);
  assert.ok(Math.abs(prediction.probabilities.reduce((sum, item) => sum + item.probability, 0) - 1) < 1e-12);
  const top = topProbabilities(prediction.probabilities);
  assert.equal(top.length, 3); assert.equal(top[0].id, prediction.id); assert.equal(top[0].probability, prediction.confidence);
  assert.equal(CLASS_CATALOG.find(item => item.id === 'hand').prompt, 'DESENHE UMA MÃO!');
  assert.equal(CLASS_CATALOG.find(item => item.datasetLabel === 'hot air balloon').prompt, 'DESENHE UM BALÃO!');
});

test('Manifesto: catálogo em ordem e modelo antigo nunca aceito como oito classes', () => {
  assert.equal(validateClasses(CLASS_CATALOG).length, 8);
  assert.throws(() => validateClasses([...CLASS_CATALOG].reverse()));
  const metadata = JSON.parse(readFileSync(new URL('../public/models/iadivinha/metrics.json', import.meta.url)));
  const model = { inputs: [{shape: [null,28,28,1]}], outputs: [{shape: [null,3]}] };
  assert.throws(() => validateModelContract(model, CLASS_CATALOG, metadata.preprocessing, { ...metadata, classes: CLASS_CATALOG }));
});
