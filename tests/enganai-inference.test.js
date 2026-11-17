import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import * as ort from 'onnxruntime-web';
import {
  BUNDLE_PATH,
  compareDiscriminator,
  compareGenerator,
  discriminatorReading,
  latentTensor,
  quantizeImages,
  roundHalfEven,
  sha256Fallback,
  sha256Hex,
  validateExport,
  validateManifest,
  verifyBytes,
} from '../src/features/enganai/lib/inference/contract.js';
import { createGanEngine } from '../src/features/enganai/lib/inference/engine.js';
import { createInferenceClient, InferenceError } from '../src/features/enganai/lib/inference/client.js';

ort.env.wasm.numThreads = 1;
const root = join(process.cwd(), 'public/models/enganai', BUNDLE_PATH);
const readBytes = async path => new Uint8Array(await readFile(join(root, path)));
const readJson = async path => JSON.parse(await readFile(join(root, path), 'utf8'));
const clone = value => structuredClone(value);

test('rounding and quantization follow torch.round (half to even) and clamp', () => {
  assert.deepEqual([0.5, 1.5, 2.5, -0.5, -1.5, 2.4999, 2.5001].map(roundHalfEven), [0, 2, 2, 0, -2, 2, 3]);
  assert.deepEqual([...quantizeImages(new Float32Array([-1, 1, 0, -2, 2, -0.996078431372549]))], [0, 255, 128, 0, 255, 0]);
});

test('SHA-256 fallback matches node:crypto and subtle', async () => {
  for (const length of [0, 1, 55, 56, 63, 64, 65, 1000]) {
    const bytes = Uint8Array.from({ length }, (_, i) => (i * 37 + 11) & 255);
    const expected = createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha256Fallback(bytes), expected);
    assert.equal(await sha256Hex(bytes), expected);
  }
});

test('discriminator readings follow the stage-01 contract', () => {
  const reading = discriminatorReading(0, 'run-a', 'ckpt-a');
  assert.deepEqual(reading, { status: 'ready', runId: 'run-a', checkpointId: 'ckpt-a', logit: 0, score: 0.5, threshold: 0.5, predictedOrigin: 'real', meaning: 'uncalibrated-sigmoid' });
  assert.equal(discriminatorReading(-1e-9, 'run-a', 'ckpt-a').predictedOrigin, 'synthetic');
  assert.ok(Math.abs(discriminatorReading(-800, 'r', 'c').score) < 1e-300);
  assert.equal(discriminatorReading(Number.NaN, 'r', 'c').status, 'error');
});

test('latent tensors reject wrong dimensions and non-finite values', () => {
  assert.deepEqual([...latentTensor([[1, 2], [3, 4]], 2)], [1, 2, 3, 4]);
  assert.throws(() => latentTensor([[1, 2, 3]], 2), /dimensão/);
  assert.throws(() => latentTensor([[1, Number.NaN]], 2), /não finito/);
  assert.throws(() => latentTensor([], 2), /Nenhum/);
});

test('parity comparison applies the declared tolerances', () => {
  const tolerance = { generatorAbs: 1e-4, pixelMaxDifference: 1, pixelMismatchFraction: 0.002, logitAbs: 1e-4, logitRel: 1e-4 };
  const reference = new Float32Array(784).fill(0.25);
  assert.equal(compareGenerator(reference, reference.map(v => v + 5e-5), tolerance).passed, true);
  assert.equal(compareGenerator(reference, reference.map(v => v + 2e-4), tolerance).passed, false);
  assert.equal(compareGenerator(reference, new Float32Array(10), tolerance).passed, false);
  assert.equal(compareDiscriminator([3, -2], [3 + 1e-4, -2], tolerance).passed, true);
  assert.equal(compareDiscriminator([3, -2], [3.01, -2], tolerance).passed, false);
  // A sign change is accepted only inside the tolerance band around zero.
  assert.equal(compareDiscriminator([5e-5], [-4e-5], tolerance).passed, true);
  assert.equal(compareDiscriminator([1], [Number.NaN], tolerance).passed, false);
});

test('published manifest and export satisfy the contracts and link to the registered weights', async () => {
  const record = await readJson('onnx-export.json');
  const manifest = validateManifest(await readJson('model-manifest.json'));
  validateExport(record, manifest);
  await verifyBytes(await readBytes(record.manifest.path), record.manifest);
  const checkpoints = await readJson('checkpoints.json');
  assert.deepEqual(record.checkpoints.map(item => item.checkpointId), checkpoints.map(item => item.id));
  for (const item of record.checkpoints) {
    const registered = checkpoints.find(entry => entry.id === item.checkpointId);
    assert.equal(item.generator.sourceWeightsSha256, registered.generator.sha256);
    assert.equal(item.discriminator.sourceWeightsSha256, registered.discriminator.sha256);
    await verifyBytes(await readBytes(item.generator.asset.path), item.generator.asset);
    await verifyBytes(await readBytes(item.discriminator.asset.path), item.discriminator.asset);
  }
  assert.equal(manifest.activeCheckpointId, (await readJson('run.json')).activeCheckpointId);
});

test('contract validation rejects fixtures, tampering and mismatched weights', async () => {
  const record = await readJson('onnx-export.json');
  const manifest = await readJson('model-manifest.json');
  assert.throws(() => validateManifest({ ...clone(manifest), dataMode: 'fixture' }), /fixtures/);
  assert.throws(() => validateManifest({ ...clone(manifest), runtime: 'pytorch' }), /runtime/);
  assert.throws(() => validateManifest({ ...clone(manifest), extra: true }), /campos/);
  const reshaped = clone(manifest); reshaped.generator.input.shape = ['N', 32, 1, 1];
  assert.throws(() => validateManifest(reshaped), /tensor/);
  const swapped = clone(manifest); swapped.generator.asset = clone(record.checkpoints[0].generator.asset);
  assert.throws(() => validateExport(record, swapped), /pesos diferentes/);
  const failed = clone(record); failed.checkpoints[1].pythonParity.generatorFixedBatch.passed = false;
  assert.throws(() => validateExport(failed, manifest), /paridade/);
  const foreign = clone(record); foreign.checkpoints[0].generator.operations.push('Loop');
  assert.throws(() => validateExport(foreign, manifest), /operação/);
  const bytes = await readBytes(record.checkpoints[0].discriminator.asset.path);
  bytes[bytes.length - 1] ^= 1;
  await assert.rejects(verifyBytes(bytes, record.checkpoints[0].discriminator.asset), /SHA-256/);
});

test('onnxruntime-web reproduces the PyTorch references for every checkpoint within tolerance', async () => {
  const engine = createGanEngine({ ort, fetchBytes: readBytes });
  try {
    const record = await readJson('onnx-export.json');
    for (const item of record.checkpoints) {
      const result = await engine.verifyCheckpoint({ epoch: item.epoch });
      assert.equal(result.checkpointId, item.checkpointId);
      assert.ok(result.passed, JSON.stringify(result.parity));
      assert.ok(result.parity.generatorBatch.maxAbsError <= record.tolerance.generatorAbs);
      assert.equal(result.parity.discriminatorSynthetic.predictionChanges, 0);
    }
    // The registered PNG previews of the active checkpoint come back from G(z) as the same bytes (within tolerance).
    const active = record.checkpoints.at(-1);
    const sampled = await engine.sampleFixed({ checkpointId: active.checkpointId }, [0, 1, 2, 3]);
    const reference = new Float32Array((await readBytes(active.reference.generatorOutput.path)).buffer);
    sampled.samples.forEach((sample, index) => {
      const expected = quantizeImages(reference.subarray(index * 784, (index + 1) * 784));
      const difference = sample.pixels.reduce((max, value, i) => Math.max(max, Math.abs(value - expected[i])), 0);
      assert.ok(difference <= record.tolerance.pixelMaxDifference);
      assert.equal(sample.discriminator.status, 'ready');
      assert.equal(sample.discriminator.predictedOrigin, active.reference.discriminatorSyntheticLogits[index] >= 0 ? 'real' : 'synthetic');
    });
    await assert.rejects(engine.verifyCheckpoint({ epoch: 99 }), /não registrado/);
    await assert.rejects(engine.discriminate({ epoch: 8 }, new Float32Array(784).fill(2)), /intervalo/);
  } finally {
    await engine.dispose();
  }
});

test('engine refuses a bundle whose bytes changed', async () => {
  const engine = createGanEngine({
    ort,
    fetchBytes: async path => {
      const bytes = await readBytes(path);
      if (path.endsWith('epoch-004/generator.onnx')) bytes[100] ^= 1;
      return bytes;
    },
  });
  await engine.verifyCheckpoint({ epoch: 8 });
  await assert.rejects(engine.verifyCheckpoint({ epoch: 4 }), error => error.code === 'integrity');
  await engine.dispose();
});

class FakeWorker {
  constructor(handler) { this.handler = handler; this.terminated = false; this.onmessage = null; this.onerror = null; }
  postMessage(message) { queueMicrotask(() => this.handler(message, data => !this.terminated && this.onmessage?.({ data }), this)); }
  terminate() { this.terminated = true; }
}

test('client correlates replies, reports progress and rejects worker errors', async () => {
  const client = createInferenceClient({
    createWorker: () => new FakeWorker(({ id, type, payload }, reply) => {
      if (type === 'echo') { reply({ id, progress: 'weights' }); reply({ id, ok: true, result: payload }); }
      else reply({ id, ok: false, error: { message: 'Falhou', code: 'integrity' } });
    }),
  });
  const steps = [];
  assert.deepEqual(await client.request('echo', { a: 1 }, { onProgress: step => steps.push(step) }), { a: 1 });
  assert.deepEqual(steps, ['weights']);
  await assert.rejects(client.request('bad'), error => error instanceof InferenceError && error.code === 'integrity');
  client.terminate();
});

test('client times out, discards aborted replies and restarts a crashed worker', async () => {
  const workers = [];
  const client = createInferenceClient({
    timeoutMs: 30,
    createWorker: () => {
      const worker = new FakeWorker(({ id, type }, reply, self) => {
        if (type === 'slow') setTimeout(() => reply({ id, ok: true, result: 'late' }), 80);
        if (type === 'crash') self.onerror?.({ message: 'boom', preventDefault() {} });
        if (type === 'fast') reply({ id, ok: true, result: 'ok' });
      });
      workers.push(worker);
      return worker;
    },
  });
  await assert.rejects(client.request('slow'), error => error.code === 'timeout');
  assert.equal(workers[0].terminated, true, 'a stuck worker is terminated');
  const controller = new AbortController();
  const aborted = client.request('slow', {}, { signal: controller.signal, timeoutMs: 1000 });
  controller.abort();
  await assert.rejects(aborted, error => error.code === 'aborted');
  await assert.rejects(client.request('crash'), error => error.code === 'worker');
  assert.equal(await client.request('fast'), 'ok');
  assert.ok(workers.length >= 3, 'a new worker is created after timeout and crash');
  client.terminate();
});
