import assert from 'node:assert/strict';
import test from 'node:test';
import { confidencePoints, formatConfidence } from '../src/features/iadivinha/lib/confidence.js';
import { gameReducer, initialGameState } from '../src/features/iadivinha/lib/gameReducer.js';
import { CLASS_CATALOG } from '../src/features/iadivinha/data/classCatalog.js';

test('confiança vira pontos inteiros: 86%, 100%, limites e valores inválidos', () => {
  for (const [confidence, expected] of [[.86, 86], [1, 100], [.734, 73], [.735, 74], [.9999, 100], [0, 0]]) {
    assert.equal(confidencePoints(confidence), expected);
  }
  for (const value of [NaN, Infinity, -.1, 1.1, undefined, '0.86']) assert.equal(confidencePoints(value), 0);
});

test('porcentagens próximas de 100 não são exibidas como certeza absoluta', () => {
  assert.equal(formatConfidence(.86), '86%');
  assert.equal(formatConfidence(.996), '99,6%');
  assert.equal(formatConfidence(.9999), '>99,9%');
  assert.equal(formatConfidence(1), '≈100%');
  assert.equal(formatConfidence(.00001), '<0,1%');
  assert.equal(formatConfidence(0), '0%');
  assert.equal(formatConfidence(NaN), '—');
});

test('seis rodadas somam confiança apenas nos acertos, preservando guarda de envio e reinício', () => {
  const sequence = ['cat', 'duck', 'shoe', 'bread', 'cat', 'duck'].map(id => CLASS_CATALOG.find(c => c.id === id));
  let state = gameReducer(initialGameState, { type: 'START', sequence });
  const confidences = [.86, 1, .734, .925, .9999, .62];
  const expected = [86, 100, 73, 0, 100, 62];
  for (let round = 0; round < 6; round++) {
    state = gameReducer(state, { type: 'BEGIN', now: 0 });
    if (state.phase === 'revealing') state = gameReducer(state, { type: 'REVEAL_DONE', round, now: 2400 });
    state = gameReducer(state, { type: 'SUBMIT', token: round, hasInk: true, reason: 'manual', imageUrl: 'test' });
    const action = { type: 'RESOLVE', token: round, prediction: { id: round === 3 ? 'cat' : sequence[round].id, confidence: confidences[round] } };
    state = gameReducer(state, action);
    assert.equal(state.results.at(-1).points, expected[round]);
    assert.equal(gameReducer(state, action), state);
    state = gameReducer(state, { type: 'NEXT' });
  }
  assert.equal(state.phase, 'finished');
  assert.equal(state.score, 421);
  assert.equal(state.results.filter(r => r.correct).length, 5);
  const restart = gameReducer(state, { type: 'START', sequence });
  assert.equal(restart.score, 0);
  assert.equal(restart.results.length, 0);
});
