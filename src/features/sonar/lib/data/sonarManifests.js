import { SONAR_CLASSES, SONAR_CLASS_ORDER, SONAR_FEATURE_COUNT, SONAR_FEATURE_ORDER } from '../../data/sonarSchema.js';
import { countSonarClasses, selectSonarSamples, validateSonarDataset } from './sonarDataset.js';
import { allocateHoldoutCounts, stratifiedHoldout, stratifiedKFold } from './stratifiedSplit.js';

export const SONAR_PROTOCOL = Object.freeze({
  id: 'sonar-evaluation-v1',
  randomGenerator: 'mulberry32-v1',
  shuffle: 'fisher-yates; canonical IDs; sequential class order R,M',
  holdoutAllocation: 'round(N*ratio); largest remainders; ties R,M',
  foldAllocation: 'round-robin across shuffled classes; continuous cursor',
  testRatio: 0.2,
  testSeed: 42,
  folds: 5,
  foldsSeed: 43,
  labValidationRatio: 0.2,
  labSeed: 44,
  preprocessing: 'identity; original values in [0,1]',
  selectionData: 'development-cross-validation-only',
  testUsage: 'one final evaluation after selection; no tuning or early stopping',
  labUsage: 'development-only; separate from official cross-validation',
});

function assertHash(hash) {
  if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('SHA-256 inválido.');
}

function summary(samples, ids) {
  const selected = selectSonarSamples(samples, ids);
  return { total: selected.length, classCounts: countSonarClasses(selected) };
}

function checkSummary(reported, actual, context) {
  if (reported?.total !== actual.total || SONAR_CLASS_ORDER.some(label => reported?.classCounts?.[label] !== actual.classCounts[label])) {
    throw new Error(`${context}: contagens não correspondem aos IDs.`);
  }
}

function checkPair(first, second, universe, context) {
  if (!Array.isArray(first) || !Array.isArray(second) || first.length === 0 || second.length === 0) {
    throw new Error(`${context}: partições devem conter IDs.`);
  }
  const all = [...first, ...second];
  if (all.length !== universe.length || new Set(all).size !== all.length) {
    throw new Error(`${context}: partições sobrepostas, IDs repetidos ou cobertura incompleta.`);
  }
  const allowed = new Set(universe);
  if (all.some(id => !allowed.has(id))) throw new Error(`${context}: ID fora do conjunto autorizado.`);
}

function checkAllocation(samples, ids, ratio, reported, context) {
  const expected = allocateHoldoutCounts(countSonarClasses(selectSonarSamples(samples, ids)), ratio);
  if (SONAR_CLASS_ORDER.some(label => reported.classCounts[label] !== expected[label])) {
    throw new Error(`${context}: estratificação incompatível com a proporção.`);
  }
}

/** Validate a saved manifest without re-sampling its IDs. */
export function validateSonarPartitions(samples, manifest, datasetSha256) {
  validateSonarDataset(samples);
  assertHash(datasetSha256);
  if (manifest?.schemaVersion !== 1 || manifest.datasetSha256 !== datasetSha256 ||
      manifest.featureCount !== SONAR_FEATURE_COUNT || JSON.stringify(manifest.classOrder) !== JSON.stringify(SONAR_CLASS_ORDER)) {
    throw new Error('Manifesto incompatível com os dados, schema ou ordem das classes.');
  }
  if (Object.entries(SONAR_PROTOCOL).some(([key, value]) => manifest.protocol?.[key] !== value)) {
    throw new Error('Protocolo do manifesto incompatível.');
  }
  const allIds = samples.map(sample => sample.id);
  checkPair(manifest.developmentIds, manifest.testIds, allIds, 'Desenvolvimento/teste');
  const development = summary(samples, manifest.developmentIds);
  const test = summary(samples, manifest.testIds);
  checkSummary(manifest.counts?.development, development, 'Desenvolvimento');
  checkSummary(manifest.counts?.test, test, 'Teste');
  checkAllocation(samples, allIds, SONAR_PROTOCOL.testRatio, test, 'Teste');

  if (!Array.isArray(manifest.folds) || manifest.folds.length !== SONAR_PROTOCOL.folds) {
    throw new Error('Esperados cinco folds de desenvolvimento.');
  }
  const appearances = new Map(manifest.developmentIds.map(id => [id, 0]));
  const folds = manifest.folds.map((fold, index) => {
    if (fold.fold !== index + 1) throw new Error('Numeração inválida dos folds.');
    checkPair(fold.trainIds, fold.validationIds, manifest.developmentIds, `Fold ${index + 1}`);
    const train = summary(samples, fold.trainIds);
    const validation = summary(samples, fold.validationIds);
    checkSummary(fold.counts?.train, train, `Treino do fold ${index + 1}`);
    checkSummary(fold.counts?.validation, validation, `Validação do fold ${index + 1}`);
    for (const id of fold.validationIds) appearances.set(id, appearances.get(id) + 1);
    return { fold: index + 1, train, validation };
  });
  if ([...appearances.values()].some(count => count !== 1)) throw new Error('Cada ID deve validar exatamente uma vez na CV.');
  for (const key of ['total', ...SONAR_CLASS_ORDER]) {
    const values = folds.map(fold => key === 'total' ? fold.validation.total : fold.validation.classCounts[key]);
    if (Math.max(...values) - Math.min(...values) > 1 || Math.min(...values) < 1) {
      throw new Error('Folds não estão balanceados por tamanho e classe.');
    }
  }

  checkPair(manifest.lab?.trainIds, manifest.lab?.validationIds, manifest.developmentIds, 'Laboratório');
  const lab = {
    train: summary(samples, manifest.lab.trainIds),
    validation: summary(samples, manifest.lab.validationIds),
  };
  checkSummary(manifest.lab.counts?.train, lab.train, 'Treino do laboratório');
  checkSummary(manifest.lab.counts?.validation, lab.validation, 'Validação do laboratório');
  checkAllocation(samples, manifest.developmentIds, SONAR_PROTOCOL.labValidationRatio, lab.validation, 'Laboratório');
  return { development, test, folds, lab };
}

export function createSonarPartitions(samples, datasetSha256) {
  const validation = validateSonarDataset(samples);
  assertHash(datasetSha256);
  if (validation.duplicates.featureGroups.length > 0) {
    throw new Error('Vetores duplicados exigem uma política de grupos revisada antes de particionar; nenhuma linha foi removida.');
  }
  const split = stratifiedHoldout(samples, { ratio: SONAR_PROTOCOL.testRatio, seed: SONAR_PROTOCOL.testSeed });
  const development = selectSonarSamples(samples, split.trainIds);
  const folds = stratifiedKFold(development, { folds: SONAR_PROTOCOL.folds, seed: SONAR_PROTOCOL.foldsSeed });
  const lab = stratifiedHoldout(development, { ratio: SONAR_PROTOCOL.labValidationRatio, seed: SONAR_PROTOCOL.labSeed });
  const manifest = {
    schemaVersion: 1,
    datasetSha256,
    classOrder: [...SONAR_CLASS_ORDER],
    featureCount: SONAR_FEATURE_COUNT,
    protocol: { ...SONAR_PROTOCOL },
    developmentIds: split.trainIds,
    testIds: split.holdoutIds,
    counts: { development: summary(samples, split.trainIds), test: summary(samples, split.holdoutIds) },
    folds: folds.map(fold => ({ ...fold, counts: {
      train: summary(samples, fold.trainIds), validation: summary(samples, fold.validationIds),
    } })),
    lab: {
      trainIds: lab.trainIds,
      validationIds: lab.holdoutIds,
      counts: { train: summary(samples, lab.trainIds), validation: summary(samples, lab.holdoutIds) },
    },
  };
  validateSonarPartitions(samples, manifest, datasetSha256);
  return manifest;
}

export function createSonarProvenance(samples, source) {
  assertHash(source.sha256);
  return {
    schemaVersion: 1,
    datasetId: source.datasetId,
    title: source.title,
    source: { ...source },
    featureOrder: [...SONAR_FEATURE_ORDER],
    classOrder: [...SONAR_CLASS_ORDER],
    classes: SONAR_CLASSES.map(item => ({ ...item })),
    idPolicy: 'sonar-NNNN; one-based original row number; bound to source.sha256',
    labelColumn: 61,
    featureMeaning: 'Energy in frequency bands integrated over time intervals; not an audio recording or spatial coordinates.',
    metalMeaning: 'M (mine) denotes returns from a metal cylinder in this dataset.',
    transformations: [],
    parsing: 'Original bytes preserved; comma-separated decimal numbers parsed without rounding; optional terminal line ending is not a record.',
    preprocessing: SONAR_PROTOCOL.preprocessing,
    validation: validateSonarDataset(samples),
  };
}
