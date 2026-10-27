import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CIFAR10_CLASSES,
  CIFAR10_CLASS_IDS,
  DEFAULT_RESTORATION_TOOLS,
  PIXEL_CNN_ARCHITECTURE,
  PIXEL_IMAGE_SPEC,
  getCifar10Class,
} from '../src/features/pixel/data/cifar10Schema.js';
import {
  applyInterference,
  applyRestorationTools,
  clampAndRoundUint8,
  computeBoxSmooth3x3,
  computePixelDiffStats,
  createStratifiedSplit,
  decodePixelsBase64,
  encodePixelsBase64,
  generateNoiseRealization,
  normalizePixelsToFloat32,
  toRgbaImageDataArray,
} from '../src/features/pixel/lib/pixelOps.js';

const root = new URL('../', import.meta.url);

test('CIFAR-10 schema define exatamente as 10 classes canônicas e arquitetura de 61.130 parâmetros', () => {
  assert.equal(CIFAR10_CLASSES.length, 10);
  assert.equal(PIXEL_IMAGE_SPEC.totalValues, 3072);
  assert.equal(PIXEL_CNN_ARCHITECTURE.totalParameters, 61130);

  const expectedKeys = [
    'airplane',
    'automobile',
    'bird',
    'cat',
    'deer',
    'dog',
    'frog',
    'horse',
    'ship',
    'truck',
  ];
  assert.deepEqual(CIFAR10_CLASS_IDS, expectedKeys);
  assert.equal(getCifar10Class(3).pt, 'Gato');
  assert.equal(getCifar10Class('ship').pt, 'Navio');
});

test('Partições CIFAR-10 e pacote demo-samples.json são disjuntos, balanceados e sem perdas', async () => {
  const provenance = JSON.parse(await readFile(new URL('public/data/pixel/provenance.json', root), 'utf8'));
  const partitions = JSON.parse(await readFile(new URL('public/data/pixel/partitions.json', root), 'utf8'));
  const demoSamples = JSON.parse(await readFile(new URL('public/data/pixel/demo-samples.json', root), 'utf8'));

  assert.equal(provenance.dataset, 'CIFAR-10 (Python version)');
  assert.equal(provenance.counts.total, 60000);
  assert.equal(partitions.counts.train, 45000);
  assert.equal(partitions.counts.validation, 5000);
  assert.equal(partitions.counts.officialTest, 10000);

  for (const row of partitions.perClass) {
    assert.equal(row.train, 4500);
    assert.equal(row.validation, 500);
    assert.equal(row.officialTest, 1000);
    assert.equal(row.demoCount, 10);
  }

  assert.equal(demoSamples.samples.length, 100);
  const perClassDemo = new Array(10).fill(0);
  const seenIds = new Set();

  for (const sample of demoSamples.samples) {
    assert.equal(sample.partition, 'validation');
    assert.ok(!seenIds.has(sample.id), `ID duplicado: ${sample.id}`);
    seenIds.add(sample.id);
    perClassDemo[sample.label] += 1;
    const decoded = decodePixelsBase64(sample.pixelsBase64);
    assert.equal(decoded.length, 3072);
    assert.equal(encodePixelsBase64(decoded), sample.pixelsBase64);
  }

  assert.deepEqual(perClassDemo, new Array(10).fill(10));

  // Verifica equivalência exata entre Python e JavaScript para interferência e restauração
  for (const fix of demoSamples.pixelOpsReferenceFixtures) {
    const sample = demoSamples.samples.find((s) => s.id === fix.sampleId);
    const orig = decodePixelsBase64(sample.pixelsBase64);
    const corrupted = applyInterference(orig, fix.interference);
    const restored = applyRestorationTools(corrupted.pixels, fix.restoration);
    assert.equal(encodePixelsBase64(corrupted.pixels), fix.corruptedBase64);
    assert.equal(encodePixelsBase64(restored.pixels), fix.restoredBase64);
  }
});

test('Pré-processamento, divisão estratificada e transformações de pixel são reproduzíveis e não acumulam deriva', () => {
  const labels = [];
  for (let c = 0; c < 10; c += 1) {
    for (let i = 0; i < 100; i += 1) labels.push(c);
  }
  const split = createStratifiedSplit(labels, { valPerClass: 20, numClasses: 10, seed: 42 });
  assert.equal(split.trainIndices.length, 800);
  assert.equal(split.valIndices.length, 200);
  const trainSet = new Set(split.trainIndices);
  for (const idx of split.valIndices) {
    assert.equal(trainSet.has(idx), false, 'Partições de treino e validação devem ser disjuntas');
  }

  const base = new Uint8Array(3072);
  for (let i = 0; i < base.length; i += 1) {
    base[i] = (i * 17 + 43) % 256;
  }

  const norm = normalizePixelsToFloat32(base);
  assert.equal(norm.length, 3072);
  assert.ok(Math.abs(norm[0] - base[0] / 255) <= 1e-7);

  // Ruído com mesma seed é idêntico; seeds distintas diferem
  const noiseA = generateNoiseRealization(12345, 3072);
  const noiseB = generateNoiseRealization(12345, 3072);
  const noiseC = generateNoiseRealization(54321, 3072);
  assert.deepEqual(Array.from(noiseA.slice(0, 32)), Array.from(noiseB.slice(0, 32)));
  assert.notDeepEqual(Array.from(noiseA.slice(0, 32)), Array.from(noiseC.slice(0, 32)));

  assert.equal(clampAndRoundUint8(255.9), 255);
  assert.equal(clampAndRoundUint8(-10), 0);

  // Suavização 3x3 sobre imagem constante preserva valor exato
  const constantImg = new Uint8Array(3072).fill(100);
  const smoothedMean = computeBoxSmooth3x3(constantImg);
  assert.ok(Math.abs(smoothedMean[0] - 100) <= 1e-9);
  assert.ok(Math.abs(smoothedMean[1500] - 100) <= 1e-9);

  // Aplicar pipeline duas vezes com os mesmos controles a partir da base produz bytes idênticos
  const corrupted = applyInterference(base, {
    contrast: 0.65,
    brightness: -24,
    noiseStd: 18,
    seed: 2026,
  });
  const tools = { smoothing: 0.5, contrast: 1.35, brightness: 20 };
  const restored1 = applyRestorationTools(corrupted.pixels, tools);
  const restored2 = applyRestorationTools(corrupted.pixels, tools);
  assert.deepEqual(Array.from(restored1.pixels), Array.from(restored2.pixels));

  // Ferramentas neutras retornam cópia idêntica à imagem recebida
  const unchanged = applyRestorationTools(corrupted.pixels, DEFAULT_RESTORATION_TOOLS);
  assert.deepEqual(Array.from(unchanged.pixels), Array.from(corrupted.pixels));
  const stats = computePixelDiffStats(corrupted.pixels, unchanged.pixels);
  assert.equal(stats.meanAbsDiff, 0);
  assert.equal(stats.changedPixels, 0);

  // Extração de canal RGBA gera 32*32*4 bytes
  const rgbaR = toRgbaImageDataArray(base, 'r');
  assert.equal(rgbaR.length, 32 * 32 * 4);
  assert.equal(rgbaR[0], base[0]);
  assert.equal(rgbaR[1], 0);
  assert.equal(rgbaR[2], 0);
  assert.equal(rgbaR[3], 255);
});
