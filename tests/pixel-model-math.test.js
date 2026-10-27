import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyPublishedOfficial } from '../training/pixel/verify_official.mjs';
import { explainValidationExample } from '../training/pixel/explain_example.mjs';
import {
  explainConv1Step,
  explainCrossEntropy,
  explainGlobalAveragePoolChannel,
  explainMaxPool1Window,
  stableSoftmax,
} from '../src/features/pixel/lib/cnnMath.js';

test('Funções matemáticas didáticas de CNN (Softmax estável, Cross-Entropy, Pool 2x2, GAP 8x8) operam com precisão', () => {
  const sm = stableSoftmax([1000, 1001, 1002, 999, 998, 997, 996, 995, 994, 993]);
  const sum = sm.probabilities.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) <= 1e-7);
  assert.equal(sm.maximum, 1002);
  assert.ok(sm.probabilities[2] > sm.probabilities[1]);
  assert.ok(sm.probabilities[1] > sm.probabilities[0]);

  const ce = explainCrossEntropy(sm.logits, sm.probabilities, 2);
  assert.ok(ce.exactCrossEntropy > 0 && ce.exactCrossEntropy < 1);
  assert.equal(ce.oneHot[2], 1);
  assert.equal(ce.oneHot[0], 0);

  // Testa MaxPooling2D 2x2 sobre mapa sintético 32x32x32
  const map32 = Array.from({ length: 32 }, (_, r) =>
    Array.from({ length: 32 }, (_, c) => {
      const ch = new Array(32).fill(0);
      ch[0] = r * 100 + c;
      return ch;
    }),
  );
  const pool = explainMaxPool1Window(map32, { poolRow: 2, poolCol: 3, filterIndex: 0 });
  // Janela cobre linhas 4..5 e colunas 6..7 -> máximo em (5, 7) = 507
  assert.equal(pool.computedMax, 507);
  assert.equal(pool.winner.row, 5);
  assert.equal(pool.winner.col, 7);

  // Testa GlobalAveragePooling2D sobre mapa sintético 8x8x64
  const map8 = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => new Array(64).fill(2.5)),
  );
  const gap = explainGlobalAveragePoolChannel(map8, 0);
  assert.ok(Math.abs(gap.computedMean - 2.5) <= 1e-9);
});

test('Modelo oficial exportado apresenta equivalência numérica Python ↔ TensorFlow.js, independência do rótulo e zero vazamento de tensores', async () => {
  const report = await verifyPublishedOfficial();
  assert.equal(report.totalParameters, 61130);
  assert.ok(report.caseCount >= 20);
  assert.equal(report.argmaxMatches, report.caseCount);
  assert.ok(report.maxAbsDiff <= 1e-5, `Diferença máxima excessiva: ${report.maxAbsDiff}`);
  assert.equal(report.tensorLeak, false);
});

test('Cálculo didático passo a passo (Conv2D 3x3 + ReLU + MaxPool 2x2 + GAP + Softmax) coincide com as ativações reais da CNN', async () => {
  const explanation = await explainValidationExample();
  assert.equal(explanation.partition, 'validation');
  assert.ok(explanation.conv1PatchCheck.absDiffZ <= 1e-5);
  assert.ok(explanation.conv1PatchCheck.absDiffPostRelu <= 1e-5);
  assert.ok(explanation.maxPool1Check.absDiff <= 1e-5);
  assert.ok(explanation.gapChannelCheck.absDiff <= 1e-5);
  assert.equal(explanation.newTestPredictions, 0);
  assert.equal(explanation.tensorLeak, false);

  // Confirma a fórmula explícita z = b + sum(x * w) no patch 3x3x3 interno
  const kernel = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => new Array(32).fill(0.1)),
    ),
  );
  const bias = new Array(32).fill(0.25);
  const patchCheck = explainConv1Step(
    new Float32Array(3072).fill(0.5),
    kernel,
    bias,
    { row: 10, col: 10, filterIndex: 0 },
  );
  // 27 posições internas * (0.5 * 0.1) + 0.25 = 1.35 + 0.25 = 1.60
  assert.ok(Math.abs(patchCheck.computedZ - 1.6) <= 1e-6);
  assert.ok(Math.abs(patchCheck.computedPostRelu - 1.6) <= 1e-6);
});
