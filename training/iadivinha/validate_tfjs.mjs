/** Independent runtime check: deserialize both models and compare to Python. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as tf from '@tensorflow/tfjs';

const run = path.resolve(process.argv[2] || 'training/iadivinha/runs/full');
const fixtures = JSON.parse(await readFile(path.join(run, 'parity-fixtures.json'), 'utf8'));
await tf.setBackend('cpu');
await tf.ready();
const initialTensors = tf.memory().numTensors;
const results = {};
for (const name of ['mlp', 'cnn']) {
  const directory = path.join(run, 'tfjs', name);
  const artifact = JSON.parse(await readFile(path.join(directory, 'model.json'), 'utf8'));
  const weights = await readFile(path.join(directory, 'weights.bin'));
  const specs = artifact.weightsManifest.flatMap(group => group.weights);
  assert.equal(weights.byteLength, specs.reduce((total, spec) => total + spec.shape.reduce((a, b) => a * b, 1) * 4, 0));
  const model = await tf.loadLayersModel(tf.io.fromMemory({
    modelTopology: artifact.modelTopology, weightSpecs: specs,
    weightData: weights.buffer.slice(weights.byteOffset, weights.byteOffset + weights.byteLength),
  }));
  assert.deepEqual(model.inputs[0].shape, [null, 28, 28, 1]);
  assert.deepEqual(model.outputs[0].shape, [null, fixtures.predictions[name][0].length]);
  const input = tf.tensor4d(fixtures.images, fixtures.shape);
  const expected = fixtures.predictions[name];
  let maxAbsoluteError = 0;
  let tensorCount;
  for (let repeat = 0; repeat < 3; repeat++) {
    const output = model.predict(input);
    const actual = await output.array();
    assert.equal(actual.length, expected.length);
    for (let row = 0; row < actual.length; row++) {
      assert.ok(Math.abs(actual[row].reduce((a, b) => a + b, 0) - 1) < 1e-5);
      assert.equal(actual[row].indexOf(Math.max(...actual[row])), expected[row].indexOf(Math.max(...expected[row])));
      for (let column = 0; column < expected[row].length; column++) {
        const error = Math.abs(actual[row][column] - expected[row][column]);
        assert.ok(Number.isFinite(error) && error <= 1e-4, `${name} probability differs: ${error}`);
        maxAbsoluteError = Math.max(maxAbsoluteError, error);
      }
    }
    output.dispose();
    if (tensorCount !== undefined) assert.equal(tf.memory().numTensors, tensorCount);
    tensorCount = tf.memory().numTensors;
  }
  input.dispose();
  model.dispose();
  results[name] = { samples: expected.length, repeats: 3, max_absolute_error: maxAbsoluteError,
    tolerance: 1e-4, argmax_identical: true, tensor_leak: false };
}
assert.equal(tf.memory().numTensors, initialTensors);
const report = { runtime: `Node ${process.version}`, tensorflowjs: tf.version.tfjs,
  backend: tf.getBackend(), browser_test: false, models: results };
await writeFile(path.join(run, 'export-validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
