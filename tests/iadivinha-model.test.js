import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as tf from '@tensorflow/tfjs';
import { preprocessDrawing } from '../src/features/iadivinha/lib/preprocessDrawing.js';
import { predictDrawing, createDrawingClassifier } from '../src/features/iadivinha/lib/predictDrawing.js';
import { validateModelContract } from '../src/features/iadivinha/lib/loadDrawingModel.js';
import { gameReducer, initialGameState } from '../src/features/iadivinha/lib/gameReducer.js';
import { createGameSequence } from '../src/features/iadivinha/lib/gameSequence.js';

const directory = new URL('../public/models/iadivinha/', import.meta.url);
const json = async name => JSON.parse(await readFile(new URL(name, directory), 'utf8'));
const classes = await json('classes.json');
test('modelo publicado inclui as oito classes e a Turma do ÃO na partida normal', () => {
  assert.deepEqual(classes.map(item => item.id), ['cat', 'duck', 'shoe', 'bread', 'hand', 'hot-air-balloon', 'airplane', 'guitar']);
  for (let index = 0; index < 100; index++) {
    const sequence = createGameSequence(classes);
    assert.equal(sequence.length, 6);
    assert.equal(sequence.filter(item => item.type === 'special').length, 1);
    assert.equal(sequence[0].type, 'core');
  }
});
function drawing(scale = 1, shift = 0) {
  const image = { width: 100, height: 100, data: new Uint8ClampedArray(40000).fill(255) };
  for (let y = 0; y < 20 * scale; y++) for (let x = 0; x < 10 * scale; x++) {
    if (x < 2 * scale || y >= 18 * scale) {
      const i = ((y + 10 + shift) * 100 + x + 10 + shift) * 4;
      image.data.set([23, 42, 45, 255], i);
    }
  }
  return image;
}
test('pré-processamento: translação e escala mantêm os pixels, sem girar ou espelhar', () => {
  const first = preprocessDrawing(drawing());
  assert.deepEqual(first.pixels, preprocessDrawing(drawing(2, 12)).pixels);
  assert.deepEqual(first.shape, [1, 28, 28, 1]);
  assert.equal(first.pixels[0], 0);
  assert.ok(first.pixels[14 * 28 + 8] > first.pixels[14 * 28 + 18]);
  assert.ok(first.pixels[25 * 28 + 14] > first.pixels[2 * 28 + 14]);
  for (const value of first.pixels) assert.ok(value >= 0 && value <= 1 && Math.abs(value * 255 - Math.round(value * 255)) < 0.0001);
});
test('pré-processamento: branco, transparência e dimensões inválidas são rejeitados', () => {
  for (const alpha of [0, 255]) {
    const image = { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(255) };
    for (let i = 3; i < 16; i += 4) image.data[i] = alpha;
    assert.throws(() => preprocessDrawing(image), /vazia/);
  }
  assert.throws(() => preprocessDrawing({width: 2, height: 3, data: [0]}), /inválida/);
});
test('pré-processamento: traço na borda e ponto isolado não somem', () => {
  const image = { width: 100, height: 100, data: new Uint8ClampedArray(40000).fill(255) };
  image.data.set([0, 0, 0, 255], 0);
  const prepared = preprocessDrawing(image);
  assert.ok(prepared.pixels.some(value => value > 0));
  assert.deepEqual(prepared.bounds, {left: 0, top: 0, width: 1, height: 1});
});
test('contrato: rejeita ordem diferente de classes, formato e modelo smoke', async () => {
  const model = { inputs: [{shape: [null,28,28,1]}], outputs: [{shape: [null,classes.length]}] };
  const preprocessing = await json('preprocessing.json'), metrics = await json('metrics.json');
  validateModelContract(model, classes, preprocessing, metrics);
  assert.throws(() => validateModelContract(model, [...classes].reverse(), preprocessing, metrics));
  assert.throws(() => validateModelContract(model, classes, {...preprocessing, background: 1}, metrics));
  assert.throws(() => validateModelContract(model, classes, preprocessing, {...metrics, smoke: true}));
});
test('CNN real: previsão depende só da imagem; abortos e descarte não vazam tensores', async () => {
  await tf.setBackend('cpu'); await tf.ready();
  const initial = tf.memory().numTensors;
  const artifact = await json('model.json'), buffer = await readFile(new URL('weights.bin', directory));
  const model = await tf.loadLayersModel(tf.io.fromMemory({modelTopology: artifact.modelTopology,
    weightSpecs: artifact.weightsManifest.flatMap(group => group.weights),
    weightData: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)}));
  const service = createDrawingClassifier(tf, model, classes);
  const loaded = tf.memory().numTensors;
  const first = await service.classify(drawing(), {challenge: 'cat', score: 0});
  const second = await service.classify(drawing(), {challenge: 'shoe', score: 600});
  assert.deepEqual(first.probabilities, second.probabilities);
  assert.equal(first.simulated, false);
  assert.deepEqual(first.probabilities.map(item => item.id), classes.map(item => item.id));
  assert.ok(first.inferenceMs >= 0 && first.totalMs >= first.inferenceMs);
  assert.equal(tf.memory().numTensors, loaded);
  let state = initialGameState;
  for (let session = 0; session < 3; session++) {
    state = gameReducer(state, { type: 'START', sequence: createGameSequence(classes) });
    assert.equal(state.score, 0);
    assert.equal(state.results.length, 0);
    let expectedScore = 0;
    for (let round = 0; round < 6; round++) {
      const token = session * 6 + round;
      state = gameReducer(state, { type: 'BEGIN', now: 1000 });
      if (state.phase === 'revealing') state = gameReducer(state, { type: 'REVEAL_DONE', round, now: 3400 });
      state = gameReducer(state, { type: 'SUBMIT', token, hasInk: true, imageUrl: 'test', reason: 'manual' });
      const prediction = await service.classify(drawing());
      if (prediction.id === state.sequence[round].id) expectedScore += Math.round(prediction.confidence * 100);
      state = gameReducer(state, { type: 'RESOLVE', token, prediction });
      state = gameReducer(state, { type: 'NEXT' });
      assert.equal(tf.memory().numTensors, loaded);
    }
    assert.equal(state.phase, 'finished');
    assert.equal(state.results.length, 6);
    assert.equal(state.sequence.filter(item => item.type === 'special').length, 1);
    assert.equal(state.score, expectedScore);
  }
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(service.classify(drawing(), {signal: controller.signal}), {name: 'AbortError'});
  const pendingController = new AbortController();
  const pending = service.classify(drawing(), {signal: pendingController.signal});
  pendingController.abort(); service.dispose();
  await assert.rejects(pending, {name: 'AbortError'});
  service.dispose();
  await assert.rejects(service.classify(drawing()), /encerrado/);
  assert.equal(tf.memory().numTensors, initial);
});
test('saída inválida libera o tensor mesmo após erro', async () => {
  const initial = tf.memory().numTensors;
  await assert.rejects(predictDrawing(tf, {predict: () => tf.tensor2d([[NaN, 0, 1]])}, classes, drawing()), /inválidas/);
  assert.equal(tf.memory().numTensors, initial);
});
