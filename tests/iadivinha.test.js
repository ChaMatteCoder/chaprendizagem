import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameSequence } from '../src/features/iadivinha/lib/gameSequence.js';
import { gameReducer, initialGameState } from '../src/features/iadivinha/lib/gameReducer.js';
import { getRemainingSeconds, hasDrawingInk } from '../src/features/iadivinha/lib/drawingImage.js';
import { createMockDrawingClassifier, simulatePrediction } from '../src/features/iadivinha/lib/mockDrawingClassifier.js';
import { CLASS_CATALOG } from '../src/features/iadivinha/data/classCatalog.js';
import { validateClasses } from '../src/features/iadivinha/lib/loadClasses.js';

const classes = validateClasses(CLASS_CATALOG.filter(item => item.type === 'core'));
const image = { width: 2, height: 1, data: new Uint8ClampedArray([23, 42, 45, 255, 255, 255, 255, 255]) };
const blank = { width: 2, height: 1, data: new Uint8ClampedArray(8).fill(255) };
const start = () => gameReducer(initialGameState, { type: 'START', sequence: createGameSequence(classes, () => 0) });
const begin = (state) => gameReducer(state, { type: 'BEGIN', now: 1234 });
const submit = (state, token, options = {}) => gameReducer(state, { type: 'SUBMIT', token, imageUrl: 'data:image/png;base64,test', hasInk: true, reason: 'manual', ...options });

test('IAdivinha: todas as ordens sorteadas têm seis rodadas, duas de cada classe e nenhuma repetição consecutiva', () => {
  const orders = new Set();
  for (let i = 0; i < 1000; i += 1) {
    const sequence = createGameSequence(classes, () => i / 1000);
    assert.equal(sequence.length, 6);
    for (const item of classes) assert.equal(sequence.filter((x) => x.id === item.id).length, 2);
    assert.ok(sequence.every((item, index) => index === 0 || item.id !== sequence[index - 1].id));
    orders.add(sequence.map((x) => x.id).join(','));
  }
  assert.ok(orders.size > 10);
  assert.throws(() => createGameSequence([classes[0], classes[0], classes[2]]));
});

test('IAdivinha: não começa a contar na preparação e rejeita transições fora de ordem', () => {
  const preparing = start();
  assert.equal(preparing.deadline, undefined);
  assert.equal(gameReducer(preparing, { type: 'NEXT' }), preparing);
  assert.equal(submit(preparing, 1), preparing);
  const drawing = begin(preparing);
  assert.equal(drawing.deadline, 11234);
  assert.equal(begin(drawing), drawing);
});

test('IAdivinha: acertos somam 100 até 600, seis rodadas terminam e reinício zera tudo', () => {
  let state = start();
  for (let round = 0; round < 6; round += 1) {
    state = submit(begin(state), round);
    state = gameReducer(state, { type: 'RESOLVE', token: round, prediction: { id: state.sequence[round].id, confidence: 1 } });
    assert.equal(state.score, (round + 1) * 100);
    assert.equal(state.results.length, round + 1);
    state = gameReducer(state, { type: 'NEXT' });
  }
  assert.equal(state.phase, 'finished');
  assert.equal(state.score, 600);
  assert.equal(gameReducer(state, { type: 'NEXT' }), state);
  const restarted = gameReducer(state, { type: 'START', sequence: createGameSequence(classes) });
  assert.equal(restarted.score, 0);
  assert.deepEqual(restarted.results, []);
  assert.equal(restarted.round, 0);
  assert.equal(restarted.pending, null);
});

test('IAdivinha: erro de classificação não pontua; resultado conserva desenho e desafio', () => {
  const drawing = begin(start());
  const wrong = classes.find((item) => item.id !== drawing.sequence[0].id);
  const result = gameReducer(submit(drawing, 1), { type: 'RESOLVE', token: 1, prediction: wrong });
  assert.equal(result.score, 0);
  assert.equal(result.results[0].correct, false);
  assert.equal(result.results[0].challenge, drawing.sequence[0]);
  assert.equal(result.results[0].imageUrl, 'data:image/png;base64,test');
});

test('IAdivinha: clique e timeout duplicados e respostas atrasadas não repetem pontuação', () => {
  const processing = submit(begin(start()), 1);
  assert.equal(submit(processing, 2, { reason: 'timeout' }), processing);
  assert.equal(gameReducer(processing, { type: 'RESOLVE', token: 7, prediction: classes[0] }), processing);
  const action = { type: 'RESOLVE', token: 1, prediction: { ...processing.sequence[0], confidence: .86 } };
  const result = gameReducer(processing, action);
  assert.equal(result.score, 86);
  assert.equal(gameReducer(result, action), result);
  const home = gameReducer(result, { type: 'HOME' });
  assert.equal(gameReducer(home, action), home);
});

test('IAdivinha: imagem vazia bloqueia envio manual; timeout vazio vai direto ao resultado sem previsão', () => {
  const drawing = begin(start());
  assert.equal(submit(drawing, 1, { hasInk: false }), drawing);
  const result = submit(drawing, 2, { hasInk: false, reason: 'timeout', imageUrl: null });
  assert.equal(result.phase, 'result');
  assert.equal(result.score, 0);
  assert.equal(result.results[0].prediction, null);
  assert.equal(result.results[0].empty, true);
});

test('IAdivinha: falha pode ser repetida sem perder desenho ou contar uma rodada a mais', () => {
  const processing = submit(begin(start()), 9);
  const failed = gameReducer(processing, { type: 'FAIL', token: 9 });
  assert.equal(failed.phase, 'error');
  assert.equal(failed.results.length, 0);
  assert.equal(failed.pending.imageUrl, processing.pending.imageUrl);
  const retried = gameReducer(failed, { type: 'RETRY' });
  assert.equal(retried.phase, 'processing');
  const result = gameReducer(retried, { type: 'RESOLVE', token: 9, prediction: { ...retried.sequence[0], confidence: 1 } });
  assert.equal(result.results.length, 1);
  assert.equal(result.score, 100);
});

test('IAdivinha: cronômetro usa prazo absoluto, não acumula atraso de ticks', () => {
  assert.equal(getRemainingSeconds(11000, 1000), 10);
  assert.equal(getRemainingSeconds(11000, 8090), 3);
  assert.equal(getRemainingSeconds(11000, 10999), 1);
  assert.equal(getRemainingSeconds(11000, 11000), 0);
  assert.equal(getRemainingSeconds(11000, 20000), 0);
});

test('IAdivinha: branco e transparente são vazios; um toque visível conta como traço', () => {
  assert.equal(hasDrawingInk(blank), false);
  assert.equal(hasDrawingInk({ data: new Uint8ClampedArray(8) }), false);
  assert.equal(hasDrawingInk(image), true);
  assert.throws(() => simulatePrediction(blank, classes), /vazia/);
});

test('IAdivinha: simulação usa só pixels, é repetível e distribui probabilidades entre as três saídas do manifesto', () => {
  const prediction = simulatePrediction(image, classes);
  assert.deepEqual(simulatePrediction(image, classes), prediction);
  assert.deepEqual(simulatePrediction({ ...image, challenge: 'cat', score: 600 }, classes), prediction);
  assert.deepEqual(prediction.probabilities.map((item) => item.id), classes.map((item) => item.id));
  assert.ok(Math.abs(prediction.probabilities.reduce((sum, item) => sum + item.probability, 0) - 1) < 1e-12);
  assert.equal(prediction.simulated, true);
});

test('IAdivinha: cancelamento aborta classificador simulado', async () => {
  const classify = createMockDrawingClassifier(classes);
  const controller = new AbortController();
  const pending = classify(image, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  await assert.rejects(classify(image, { signal: controller.signal }), { name: 'AbortError' });
});

test('IAdivinha: manifesto rejeita índices fora de ordem e classes duplicadas', () => {
  assert.throws(() => validateClasses([...classes].reverse()));
  assert.throws(() => validateClasses([classes[0], { ...classes[1], id: 'cat' }, classes[2]]));
});
