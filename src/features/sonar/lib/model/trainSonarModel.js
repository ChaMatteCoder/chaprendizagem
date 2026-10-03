import { sonarLabelIndex } from '../../data/sonarSchema.js';
import { toSonarFeatureMatrix, validateSonarSamples } from '../data/sonarDataset.js';
import { createSeededRandom } from '../data/stratifiedSplit.js';
import { createSonarModel, disposeSonarModel, releaseSonarOptimizer, validateTrainingConfig } from './createSonarModel.js';

let activeTraining = false;
let nextRunId = 0;

function shuffledIndices(size, seed) {
  const indices = Array.from({ length: size }, (_, index) => index);
  const random = createSeededRandom(seed);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

function snapshot(samples) {
  validateSonarSamples(samples);
  return { xs: toSonarFeatureMatrix(samples), ys: samples.map(sample => sonarLabelIndex(sample.label)) };
}

function tensors(tf, values) {
  return tf.tidy(() => ({
    xs: tf.tensor2d(values.xs, [values.xs.length, 60]),
    ys: tf.oneHot(tf.tensor1d(values.ys, 'int32'), 2),
  }));
}

function finiteMetric(value, name) {
  if (!Number.isFinite(value)) throw new Error(`Treinamento retornou ${name} não finito.`);
  return value;
}

/** Owns training jobs, not completed models. dispose() cancels and suppresses late events. */
export function createSonarTrainer(tf) {
  let closed = false;
  let job = null;
  let state = 'idle';
  return {
    get state() { return state; },
    cancel() { if (job) job.cancelled = true; },
    dispose() { closed = true; if (job) job.cancelled = true; },
    async train({ trainSamples, validationSamples = [], config, signal, onEpoch }) {
      if (closed) throw new Error('Treinador encerrado.');
      if (activeTraining || job) throw new Error('Já existe um treinamento Sonar em andamento.');
      const settings = validateTrainingConfig(config);
      const trainValues = snapshot(trainSamples);
      const validationValues = validationSamples.length ? snapshot(validationSamples) : null;
      const trainIds = new Set(trainSamples.map(sample => sample.id));
      if (validationSamples.some(sample => trainIds.has(sample.id))) throw new Error('Treino e validação se sobrepõem.');
      const current = { id: `sonar-run-${++nextRunId}`, cancelled: false };
      job = current;
      activeTraining = true;
      state = 'loading';
      const interrupted = () => closed || current.cancelled || signal?.aborted;
      const history = [];
      let model, train, validation;
      try {
        await tf.ready(); // Do not change the shared browser backend.
        if (!interrupted()) {
          model = createSonarModel(tf, settings);
          train = tensors(tf, trainValues);
          validation = validationValues ? tensors(tf, validationValues) : null;
          state = 'training';
          for (let epoch = 0; epoch < settings.epochs && !interrupted(); epoch++) {
            const shuffled = tf.tidy(() => {
              const indices = tf.tensor1d(shuffledIndices(trainValues.xs.length, (settings.seed + epoch) >>> 0), 'int32');
              return { xs: tf.gather(train.xs, indices), ys: tf.gather(train.ys, indices) };
            });
            let fitted;
            try {
              fitted = await model.fit(shuffled.xs, shuffled.ys, {
                epochs: 1, batchSize: settings.batchSize, shuffle: false, verbose: 0,
                ...(validation ? { validationData: [validation.xs, validation.ys] } : {}),
                yieldEvery: 'batch',
                callbacks: { onBatchEnd: () => { if (interrupted()) model.stopTraining = true; } },
              });
            } finally { tf.dispose(shuffled); }
            if (interrupted()) break;
            const logs = fitted.history;
            const event = {
              runId: current.id, epoch: epoch + 1,
              loss: finiteMetric(logs.loss?.[0], 'loss'),
              accuracy: finiteMetric((logs.acc ?? logs.accuracy)?.[0], 'accuracy'),
              valLoss: validation ? finiteMetric(logs.val_loss?.[0], 'valLoss') : null,
              valAccuracy: validation ? finiteMetric((logs.val_acc ?? logs.val_accuracy)?.[0], 'valAccuracy') : null,
            };
            history.push(event);
            if (!interrupted()) await onEpoch?.({ ...event });
          }
        }
        if (interrupted()) {
          state = 'cancelled';
          return { status: state, runId: current.id, history, completedEpochs: history.length };
        }
        state = 'completed';
        releaseSonarOptimizer(model); // No optimizer slots retained for inference-only models.
        const completed = model;
        model = null; // Ownership transfers to caller only after the full budget.
        return { status: state, runId: current.id, history, completedEpochs: history.length, model: completed };
      } catch (error) {
        state = 'error';
        throw error;
      } finally {
        tf.dispose(train);
        tf.dispose(validation);
        disposeSonarModel(model);
        job = null;
        activeTraining = false;
      }
    },
  };
}
