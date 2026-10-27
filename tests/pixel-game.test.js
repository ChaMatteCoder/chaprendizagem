import test from 'node:test';
import assert from 'node:assert/strict';
import { CIFAR10_CLASSES, DEFAULT_RESTORATION_TOOLS, PIXEL_GAME_RULES } from '../src/features/pixel/data/cifar10Schema.js';
import {
  classifyRoundOutcome,
  createPixelGame,
  selectMatchRounds,
} from '../src/features/pixel/lib/pixelGame.js';

function createMockSamples(count = 20) {
  const samples = [];
  for (let i = 0; i < count; i += 1) {
    const pixels = new Uint8Array(3072);
    for (let j = 0; j < 3072; j += 1) {
      pixels[j] = (i * 23 + j * 7) % 256;
    }
    const label = i % 10;
    samples.push({
      id: `cifar10-val-${String(i).padStart(5, '0')}`,
      partition: 'validation',
      sourceBatch: 'data_batch_1',
      sourceFilename: `mock_${i}.png`,
      label,
      classId: CIFAR10_CLASSES[label].id,
      classNamePt: CIFAR10_CLASSES[label].pt,
      pixels,
    });
  }
  return samples;
}

function makeFakePrediction(winnerIndex, confidence = 0.72, modelId = 'pixel-official-mock') {
  const probabilities = new Array(10).fill((1 - confidence) / 9);
  probabilities[winnerIndex] = confidence;
  const logits = probabilities.map((p) => Math.log(Math.max(p, 1e-6)));
  const rankedProbabilities = CIFAR10_CLASSES.map((cls, idx) => ({
    index: idx,
    id: cls.id,
    en: cls.en,
    pt: cls.pt,
    probability: probabilities[idx],
  }));
  const top3 = [...rankedProbabilities].sort((a, b) => b.probability - a.probability).slice(0, 3);
  return {
    modelId,
    modelKind: 'official',
    probabilities,
    rankedProbabilities,
    top3,
    winnerIndex,
    winnerClass: CIFAR10_CLASSES[winnerIndex],
    confidence,
    logits,
    inferenceMs: 1.5,
  };
}

test('selectMatchRounds seleciona 5 rodadas distintas com interferência reproduzível', () => {
  const samples = createMockSamples(20);
  const roundsA = selectMatchRounds(samples, { matchSeed: 20260420 });
  const roundsB = selectMatchRounds(samples, { matchSeed: 20260420 });

  assert.equal(roundsA.length, PIXEL_GAME_RULES.roundsPerMatch);
  const ids = new Set(roundsA.map((r) => r.sample.id));
  assert.equal(ids.size, PIXEL_GAME_RULES.roundsPerMatch);
  assert.deepEqual(
    roundsA.map((r) => ({ id: r.sample.id, seed: r.interference.seed })),
    roundsB.map((r) => ({ id: r.sample.id, seed: r.interference.seed })),
  );
});

test('classifyRoundOutcome separa os 4 desfechos e aplica pontuação única de 100 pontos sem bônus de confiança', () => {
  assert.equal(PIXEL_GAME_RULES.pointsPerCorrectFinal, 100);
  assert.equal(PIXEL_GAME_RULES.maxMatchScore, 500);

  const o1 = classifyRoundOutcome(true, true);
  assert.equal(o1.kind, 'keptCorrect');
  assert.equal(o1.points, 100);

  const o2 = classifyRoundOutcome(false, true);
  assert.equal(o2.kind, 'fixedError');
  assert.equal(o2.points, 100);

  const o3 = classifyRoundOutcome(true, false);
  assert.equal(o3.kind, 'brokeCorrect');
  assert.equal(o3.points, 0);

  const o4 = classifyRoundOutcome(false, false);
  assert.equal(o4.kind, 'keptError');
  assert.equal(o4.points, 0);
});

test('Fluxo completo de createPixelGame: 3 consultas, falha não consome tentativa, reset volta à corrompida, original oculto até concluir e cancelamento de respostas atrasadas', async () => {
  const samples = createMockSamples(10);
  let shouldFailNextQuery = false;
  let nextWinnerOverride = null;
  let delayedPromiseControl = null;

  const game = createPixelGame({
    randomUint32: () => 123456,
    loadBundle: async () => ({
      manifest: {
        modelId: 'pixel-official-mock',
        parameterCount: 61130,
      },
      samples,
      predictor: {
        dispose() {},
        async predict(pixelsU8) {
          assert.ok(pixelsU8 instanceof Uint8Array);
          assert.equal(pixelsU8.length, 3072);
          if (delayedPromiseControl) {
            await delayedPromiseControl.promise;
          }
          if (shouldFailNextQuery) {
            throw new Error('Falha simulada de inferência');
          }
          const winner = nextWinnerOverride !== null ? nextWinnerOverride : 3;
          return makeFakePrediction(winner, 0.84);
        },
      },
    }),
  });

  await game.start({ matchSeed: 42 });
  assert.equal(game.state.status, 'playing');
  assert.equal(game.state.round.roundNumber, 1);
  assert.equal(game.state.round.queriesUsed, 0);
  assert.equal(game.state.round.queriesRemaining, 3);
  // Original e rótulo verdadeiro não aparecem antes de concluir
  assert.equal(game.state.round.revealed, null);

  // Modifica ferramentas e redefine: volta à imagem corrompida recebida
  const corruptedSnapshot = Array.from(game.state.round.corruptedPixels);
  game.updateTools({ smoothing: 0.6, contrast: 1.4, brightness: 24 });
  assert.notDeepEqual(Array.from(game.state.round.previewPixels), corruptedSnapshot);
  assert.equal(game.state.round.hasUncheckedChanges, true);

  game.resetTools();
  assert.deepEqual(Array.from(game.state.round.previewPixels), corruptedSnapshot);
  assert.deepEqual(game.state.round.tools, DEFAULT_RESTORATION_TOOLS);
  assert.equal(game.state.round.hasUncheckedChanges, false);

  // Falha técnica não consome tentativa
  game.updateTools({ smoothing: 0.4, contrast: 1.2, brightness: 12 });
  shouldFailNextQuery = true;
  await game.testAdjustments();
  assert.equal(game.state.status, 'query-error');
  assert.equal(game.state.round.queriesUsed, 0);
  assert.equal(game.state.round.queriesRemaining, 3);

  // 3 consultas válidas consomem as 3 tentativas
  shouldFailNextQuery = false;
  for (let q = 1; q <= 3; q += 1) {
    game.updateTools({ smoothing: 0.2 * q, contrast: 1.1, brightness: q * 4 });
    await game.testAdjustments();
    assert.equal(game.state.status, 'playing');
    assert.equal(game.state.round.queriesUsed, q);
    assert.equal(game.state.round.queriesRemaining, 3 - q);
  }
  assert.equal(game.state.round.mustConclude, true);

  // Tentativa extra após 3 consultas é bloqueada
  await game.testAdjustments();
  assert.equal(game.state.round.queriesUsed, 3);

  // Concluir rodada revela original, rótulo e pontua apenas uma vez
  game.concludeRound();
  assert.equal(game.state.status, 'revealed');
  assert.ok(game.state.round.revealed !== null);
  assert.equal(game.state.round.revealed.originalPixels.length, 3072);
  const scoreAfterConclude = game.state.score;
  // Chamar concludeRound novamente não duplica pontuação
  game.concludeRound();
  assert.equal(game.state.score, scoreAfterConclude);

  // Testa cancelamento de resposta atrasada ao reiniciar partida
  await game.nextRound();
  assert.equal(game.state.status, 'playing');
  assert.equal(game.state.round.roundNumber, 2);

  let resolveDelayed;
  delayedPromiseControl = {
    promise: new Promise((resolve) => {
      resolveDelayed = resolve;
    }),
  };
  game.updateTools({ smoothing: 0.5 });
  const pendingQuery = game.testAdjustments();
  assert.equal(game.state.status, 'querying');

  // Sai da partida antes da resposta atrasada chegar
  game.leave();
  assert.equal(game.state.status, 'idle');
  delayedPromiseControl = null;
  resolveDelayed();
  await pendingQuery;
  // Estado permanece 'idle', ignorando a resposta atrasada
  assert.equal(game.state.status, 'idle');

  game.dispose();
});
