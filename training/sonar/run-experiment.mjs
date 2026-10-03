import { mkdir, open, unlink } from 'node:fs/promises';
import * as tf from '@tensorflow/tfjs';
import { selectSonarSamples } from '../../src/features/sonar/lib/data/sonarDataset.js';
import { createSonarTrainer } from '../../src/features/sonar/lib/model/trainSonarModel.js';
import { disposeSonarModel } from '../../src/features/sonar/lib/model/createSonarModel.js';
import { loadSonarModelArtifacts, serializeSonarModel } from '../../src/features/sonar/lib/model/sonarArtifacts.js';
import { evaluateSonarModel, meanAndSampleDeviation, selectOfficialCandidate } from '../../src/features/sonar/lib/evaluation/sonarMetrics.js';
import { encodeJson, hashBytes, readExperimentContext, readOptional, requireSameConfig, runDirectory, trainingSourceHashes, writeImmutable } from './experiment-io.mjs';

function predictionDifference(first, second) {
  if (first.length !== second.length || first.some((row, index) => row.id !== second[index].id)) throw new Error('Amostras de verificação divergentes.');
  return Math.max(...first.flatMap((row, index) => row.probabilities.map((value, output) => Math.abs(value - second[index].probabilities[output]))));
}

function cleanHistory(history) { return history.map(({ epoch, loss, accuracy, valLoss, valAccuracy }) => ({ epoch, loss, accuracy, valLoss, valAccuracy })); }

async function main() {
  const context = await readExperimentContext();
  const { config, samples, partitions } = context;
  const directory = runDirectory(process.argv.slice(2));
  const existing = await readOptional(new URL('development-report.json', directory));
  if (existing) {
    requireSameConfig(JSON.parse(existing), context);
    console.log('Comparação e modelo final já registrados neste diretório. Nenhum treino ou acesso ao teste foi repetido.');
    return;
  }
  if (tf.version.tfjs !== config.tensorflowjs || config.backend !== 'cpu') throw new Error('Runtime difere do protocolo.');
  await tf.setBackend('cpu'); await tf.ready();
  await mkdir(directory, { recursive: true });
  const lockUrl = new URL('training.lock', directory);
  const lock = await open(lockUrl, 'wx');
  let finalModel;
  const trainer = createSonarTrainer(tf);
  try {
    const sourceHashes = await trainingSourceHashes();
    const registration = { configSha256: context.configSha256, registeredAt: new Date().toISOString(), config,
      environment: { node: process.version, tensorflowjs: tf.version.tfjs, backend: tf.getBackend(), platform: process.platform, arch: process.arch },
      sourceHashes };
    if (await readOptional(new URL('registration.json', directory))) throw new Error('Execução incompleta já registrada. Use outro --run para reproduzir no desenvolvimento; não sobrescreva.');
    await writeImmutable(new URL('registration.json', directory), encodeJson(registration));
    await writeImmutable(new URL('config.json', directory), context.configBytes);
    const initialTensors = tf.memory().numTensors;
    const started = performance.now();
    async function train(candidate, trainIds, validationIds, seed, label) {
      console.log(`${label}: ${trainIds.length} treino / ${validationIds.length} validação, seed ${seed}`);
      const result = await trainer.train({
        trainSamples: selectSonarSamples(samples, trainIds),
        validationSamples: validationIds.length ? selectSonarSamples(samples, validationIds) : [],
        config: { hiddenUnits: candidate.hiddenUnits, epochs: config.training.epochs, batchSize: config.training.batchSize,
          learningRate: config.training.learningRate, seed },
        onEpoch: event => { if (event.epoch % 50 === 0) console.log(`${label}: época ${event.epoch}, loss ${event.loss.toFixed(5)}`); },
      });
      if (result.status !== 'completed' || result.completedEpochs !== config.training.epochs) throw new Error('Treinamento incompleto.');
      if (result.model.countParams() !== candidate.parameters) { disposeSonarModel(result.model); throw new Error('Número de parâmetros divergente.'); }
      return result;
    }
    const candidates = [];
    const histories = { crossValidation: [], finalTraining: null };
    for (const candidate of config.candidates) {
      const folds = [];
      for (const [index, fold] of partitions.folds.entries()) {
        const seed = config.foldSeedBase + index;
        const result = await train(candidate, fold.trainIds, fold.validationIds, seed, `${candidate.id}/fold-${fold.fold}`);
        try {
          const evaluation = await evaluateSonarModel(tf, result.model, selectSonarSamples(samples, fold.validationIds));
          const report = { fold: fold.fold, seed, ...evaluation };
          folds.push(report);
          const history = { candidateId: candidate.id, fold: fold.fold, seed, history: cleanHistory(result.history) };
          histories.crossValidation.push(history);
          await writeImmutable(new URL(`${candidate.id}-fold-${fold.fold}.json`, directory), encodeJson({ ...report, history: history.history }));
          console.log(`${candidate.id}/fold-${fold.fold}: macro-F1 ${evaluation.metrics.macroF1.toFixed(6)}`);
        } finally { disposeSonarModel(result.model); }
      }
      candidates.push({ ...candidate, folds,
        macroF1: meanAndSampleDeviation(folds.map(fold => fold.metrics.macroF1)),
        accuracy: meanAndSampleDeviation(folds.map(fold => fold.metrics.accuracy)) });
    }
    const selected = selectOfficialCandidate(candidates, config.selection);
    console.log(`Selecionada somente pela CV: ${selected.id}, macro-F1 média ${selected.macroF1.mean.toFixed(6)}`);
    await writeImmutable(new URL('selection.json', directory), encodeJson({ configSha256: context.configSha256,
      selectedId: selected.id, policy: config.selection, candidates }));

    // Reproducibility checks only the development fold, before ever reading test predictions.
    const firstFold = partitions.folds[0];
    const repeated = await train(selected, firstFold.trainIds, firstFold.validationIds, config.foldSeedBase, 'reprodução/fold-1');
    let reproducibility;
    try {
      const evaluation = await evaluateSonarModel(tf, repeated.model, selectSonarSamples(samples, firstFold.validationIds));
      const maxProbabilityError = predictionDifference(selected.folds[0].records, evaluation.records);
      const reference = histories.crossValidation.find(item => item.candidateId === selected.id && item.fold === 1).history;
      const history = cleanHistory(repeated.history);
      const maxHistoryError = Math.max(...history.flatMap((epoch, index) => ['loss', 'accuracy', 'valLoss', 'valAccuracy'].map(key => Math.abs(epoch[key] - reference[index][key]))));
      if (maxProbabilityError > config.parityTolerance || maxHistoryError > config.parityTolerance) throw new Error('Reprodução CPU excedeu a tolerância.');
      reproducibility = { candidateId: selected.id, fold: 1, seed: config.foldSeedBase, epochs: config.training.epochs,
        maxProbabilityError, maxHistoryError, tolerance: config.parityTolerance, backend: 'cpu', history };
    } finally { disposeSonarModel(repeated.model); }

    const final = await train(selected, partitions.developmentIds, [], config.finalSeed, 'modelo-final');
    finalModel = final.model;
    histories.finalTraining = { candidateId: selected.id, seed: config.finalSeed, history: cleanHistory(final.history) };
    const development = selectSonarSamples(samples, partitions.developmentIds);
    const reference = await evaluateSonarModel(tf, finalModel, development);
    const serialized = await serializeSonarModel(tf, finalModel);
    const modelBytes = encodeJson(serialized.modelJson);
    const weightBytes = Buffer.from(serialized.weightData);
    const modelId = `sonar-${selected.id}-${hashBytes(weightBytes).slice(0, 12)}`;
    const metadata = { modelId, kind: 'official', classOrder: ['R', 'M'], architecture: [60, ...selected.hiddenUnits, 2],
      files: { 'model.json': { byteLength: modelBytes.length, sha256: hashBytes(modelBytes) },
        'weights.bin': { byteLength: weightBytes.length, sha256: hashBytes(weightBytes) } } };
    const restored = await loadSonarModelArtifacts(tf, metadata, modelBytes, weightBytes);
    let parity;
    try {
      const evaluation = await evaluateSonarModel(tf, restored, development);
      const error = predictionDifference(reference.records, evaluation.records);
      const argmaxIdentical = reference.records.every((row, index) => row.predictedIndex === evaluation.records[index].predictedIndex);
      if (error > config.parityTolerance || !argmaxIdentical) throw new Error('Exportação diverge do modelo original.');
      parity = { sampleSet: 'development', sampleCount: development.length, maxProbabilityError: error, argmaxIdentical, tolerance: config.parityTolerance };
    } finally { disposeSonarModel(restored); }
    disposeSonarModel(finalModel); finalModel = null;
    if (tf.memory().numTensors !== initialTensors) throw new Error('Tensores retidos ao terminar a execução.');
    if (JSON.stringify(await trainingSourceHashes()) !== JSON.stringify(sourceHashes)) throw new Error('Código de treinamento mudou durante a execução.');
    const report = { status: 'development-completed', configSha256: context.configSha256, modelId, selectedId: selected.id,
      architecture: metadata.architecture, parameters: selected.parameters, crossValidation: candidates,
      finalTraining: { seed: config.finalSeed, epochs: config.training.epochs, sampleCount: development.length,
        developmentResubstitution: reference.metrics },
      parity, tensorLeak: false, elapsedSeconds: (performance.now() - started) / 1000, completedAt: new Date().toISOString() };
    for (const [name, bytes] of [
      ['model.json', modelBytes], ['weights.bin', weightBytes], ['model-metadata.json', encodeJson(metadata)],
      ['history.json', encodeJson(histories)], ['reproducibility.json', encodeJson(reproducibility)],
      ['parity-fixtures.json', encodeJson({ modelId, sampleSet: 'development', records: reference.records })],
      ['development-report.json', encodeJson(report)],
    ]) await writeImmutable(new URL(name, directory), bytes);
    // No test evaluation occurs in this script, even for reproduction runs.
    console.log(JSON.stringify({ modelId, selectedId: selected.id, crossValidation: candidates.map(({ id, macroF1, accuracy }) => ({ id, macroF1, accuracy })), parity, tensorLeak: false }, null, 2));
  } finally {
    trainer.dispose(); disposeSonarModel(finalModel);
    await lock.close(); await unlink(lockUrl);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
