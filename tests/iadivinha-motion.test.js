import test from 'node:test';
import assert from 'node:assert/strict';
import { animateScore } from '../src/features/iadivinha/lib/animateScore.js';

function scheduler() {
  let next = 0;
  const pending = new Map();
  return {
    pending,
    requestFrame(callback) { pending.set(++next, callback); return next; },
    cancelFrame(id) { pending.delete(id); },
    step(time) { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time)); },
  };
}

test('score animation reaches the exact real score and stops, even after a delayed frame', () => {
  for (const score of [0, 100, 500, 600]) {
    const clock = scheduler();
    const values = [];
    animateScore(score, value => values.push(value), clock);
    clock.step(100); clock.step(250); clock.step(500); clock.step(5000);
    assert.equal(values.at(-1), score);
    assert.ok(values.every((v, i) => v >= 0 && v <= score && (!i || v >= values[i - 1])));
    assert.equal(clock.pending.size, 0);
  }
});

test('unmount or reduced-motion change cancels pending score frames', () => {
  const clock = scheduler();
  const values = [];
  const stop = animateScore(600, value => values.push(value), clock);
  clock.step(0); clock.step(100);
  const staleCallback = [...clock.pending.values()][0];
  stop();
  staleCallback(200);
  assert.equal(clock.pending.size, 0);
  assert.equal(values.length, 2);
});
