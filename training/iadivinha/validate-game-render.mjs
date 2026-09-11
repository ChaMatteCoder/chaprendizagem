// Component-render regression check; this does not replace visual browser testing.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createGameSequence, seededRandom } from '../../src/features/iadivinha/lib/gameSequence.js';
import { gameReducer, initialGameState } from '../../src/features/iadivinha/lib/gameReducer.js';

const classes = JSON.parse(await readFile('public/models/iadivinha/classes.json', 'utf8'));
assert.equal(classes.length, 8);
const names = ['RoundPreparation', 'SpecialRoundReveal', 'DrawingScreen', 'FinalScore'];
const outfile = resolve('training/iadivinha/runs/eight-full/render-components.mjs');
await build({ stdin: { contents: names.map(name => `export { default as ${name} } from './src/features/iadivinha/components/${name}.jsx';`).join('\n'), resolveDir: process.cwd() }, outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic' });
{
  const components = await import(pathToFileURL(outfile));
  const render = (name, props) => renderToStaticMarkup(createElement(components[name], props));
  const seen = new Set(), sessions = [];
  for (let seedIndex = 0; seen.size < 5 && seedIndex < 100; seedIndex++) {
    const seed = seedIndex * 7919;
    const sequence = createGameSequence(classes, seededRandom(seed));
    const rare = sequence.find(item => item.type === 'special');
    if (seen.has(rare.id)) continue;
    let state = gameReducer(initialGameState, { type: 'START', sequence });
    for (let round = 0; round < 6; round++) {
      const special = sequence[round].type === 'special';
      const preparation = render('RoundPreparation', { state });
      if (special) assert.ok(preparation.includes('UM RABISCO SURPRESA!'));
      state = gameReducer(state, { type: 'BEGIN', now: 1000 });
      if (special) {
        assert.equal(state.phase, 'revealing');
        assert.equal(state.deadline, undefined);
        const reveal = render('SpecialRoundReveal', { challenge: rare, round, onComplete() {} });
        assert.ok(reveal.includes(rare.prompt));
        assert.ok(!reveal.includes('<canvas') && !reveal.includes('role="timer"'));
        state = gameReducer(state, { type: 'REVEAL_DONE', round, now: 3400 });
        assert.equal(state.deadline, 13400);
      }
      const drawing = render('DrawingScreen', { state, onSubmit() {} });
      assert.ok(drawing.includes(sequence[round].prompt));
      assert.ok(drawing.includes('<canvas') && drawing.includes('role="timer"'));
      if (special) assert.ok(drawing.includes('iad-rare-badge'));
      state = gameReducer(state, { type: 'SUBMIT', hasInk: false, reason: 'timeout', token: round });
      state = gameReducer(state, { type: 'NEXT' });
    }
    assert.equal(state.phase, 'finished');
    const final = render('FinalScore', { state });
    assert.equal((final.match(/<li\b/g) || []).length, 6);
    assert.equal((final.match(/class="iad-final-rare"/g) || []).length, 1);
    assert.ok(final.includes(rare.label));
    sessions.push({ seed, sequence: sequence.map(item => item.id), rare: rare.id, round: sequence.indexOf(rare) + 1, preparationHidden: true, revealWithoutCanvasOrTimer: true, drawingPromptAndCanvas: true, finalCards: 6, rareCards: 1 });
    seen.add(rare.id);
  }
  assert.equal(seen.size, 5);
  const report = { validation: 'React server render of actual game components and reducer', browserVisualTest: false, simulatedClassifier: false, inferenceTest: 'separate npm test using published weights', sessions };
  await writeFile('docs/iadivinha/training/eight-class/game-render-validation.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
