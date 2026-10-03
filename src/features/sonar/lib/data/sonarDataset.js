import {
  SONAR_CLASS_ORDER, SONAR_EXPECTED_COUNTS, SONAR_FEATURE_COUNT, SONAR_SAMPLE_COUNT,
  sonarLabelIndex,
} from '../../data/sonarSchema.js';

/** @typedef {{ id: string, features: number[], label: 'R' | 'M' }} SonarSample */

const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function validateSonarFeatures(features, context = 'Entrada') {
  if (!Array.isArray(features) || features.length !== SONAR_FEATURE_COUNT) {
    throw new Error(`${context}: esperados exatamente ${SONAR_FEATURE_COUNT} atributos.`);
  }
  for (let index = 0; index < features.length; index++) {
    const value = features[index];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`${context}, coluna ${index + 1}: esperado número finito em [0,1].`);
    }
  }
}

/** Parse all rows or fail; one terminal line ending is not an extra record. */
export function parseSonar(text) {
  if (typeof text !== 'string' || text.length === 0) throw new Error('Arquivo Sonar vazio.');
  const lines = text.split(/\r\n|\n|\r/);
  if (lines.at(-1) === '') lines.pop();
  return lines.map((line, index) => {
    const context = `Linha ${index + 1}`;
    if (!line.trim()) throw new Error(`${context}: linha vazia; nenhum registro será removido.`);
    const columns = line.split(',');
    if (columns.length !== SONAR_FEATURE_COUNT + 1) {
      throw new Error(`${context}: esperadas 61 colunas (60 atributos e rótulo); recebidas ${columns.length}.`);
    }
    const features = columns.slice(0, SONAR_FEATURE_COUNT).map((token, column) => {
      if (!DECIMAL.test(token.trim())) {
        throw new Error(`${context}, coluna ${column + 1}: número decimal inválido.`);
      }
      return Number(token.trim());
    });
    validateSonarFeatures(features, context);
    const label = columns[SONAR_FEATURE_COUNT].trim();
    if (!SONAR_CLASS_ORDER.includes(label)) {
      throw new Error(`${context}, coluna 61: rótulo inválido; esperado R ou M.`);
    }
    return { id: `sonar-${String(index + 1).padStart(4, '0')}`, features, label };
  });
}

/** Structural validation also supports subsets; expected corpus counts are separate. */
export function validateSonarSamples(samples) {
  if (!Array.isArray(samples) || samples.length === 0) throw new Error('Conjunto Sonar vazio.');
  const seen = new Set();
  for (const sample of samples) {
    if (!sample || typeof sample.id !== 'string' || !/^sonar-\d{4}$/.test(sample.id)) {
      throw new Error('Amostra com ID Sonar inválido.');
    }
    if (seen.has(sample.id)) throw new Error(`ID duplicado: ${sample.id}.`);
    seen.add(sample.id);
    validateSonarFeatures(sample.features, sample.id);
    sonarLabelIndex(sample.label);
  }
}

export function countSonarClasses(samples) {
  const counts = { R: 0, M: 0 };
  for (const sample of samples) {
    sonarLabelIndex(sample.label);
    counts[sample.label]++;
  }
  return counts;
}

/** Numeric equality catches repeated vectors even with different decimal spellings. */
export function auditSonarDuplicates(samples) {
  validateSonarSamples(samples);
  const rows = new Map();
  const vectors = new Map();
  for (const sample of samples) {
    const vectorKey = JSON.stringify(sample.features);
    const rowKey = `${vectorKey}:${sample.label}`;
    if (!vectors.has(vectorKey)) vectors.set(vectorKey, []);
    if (!rows.has(rowKey)) rows.set(rowKey, []);
    vectors.get(vectorKey).push(sample);
    rows.get(rowKey).push(sample.id);
  }
  const featureGroups = [...vectors.values()].filter(group => group.length > 1)
    .map(group => ({ ids: group.map(sample => sample.id), labels: [...new Set(group.map(sample => sample.label))] }));
  return {
    exactRowGroups: [...rows.values()].filter(ids => ids.length > 1),
    featureGroups,
    conflictingLabelGroups: featureGroups.filter(group => group.labels.length > 1),
  };
}

export function validateSonarDataset(samples) {
  validateSonarSamples(samples);
  if (samples.length !== SONAR_SAMPLE_COUNT) {
    throw new Error(`Esperados ${SONAR_SAMPLE_COUNT} registros; recebidos ${samples.length}.`);
  }
  const classCounts = countSonarClasses(samples);
  for (const label of SONAR_CLASS_ORDER) {
    if (classCounts[label] !== SONAR_EXPECTED_COUNTS[label]) {
      throw new Error(`Classe ${label}: esperados ${SONAR_EXPECTED_COUNTS[label]}; recebidos ${classCounts[label]}.`);
    }
  }
  let min = Infinity;
  let max = -Infinity;
  for (const sample of samples) {
    for (const value of sample.features) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  return {
    sampleCount: samples.length, featureCount: SONAR_FEATURE_COUNT, classCounts,
    observedRange: [min, max], duplicates: auditSonarDuplicates(samples),
  };
}

/** Fresh feature-only input; deliberately does not read id, label or other metadata. */
export function toSonarFeatureVector(sample) {
  validateSonarFeatures(sample?.features);
  return [...sample.features];
}

export function toSonarFeatureMatrix(samples) {
  if (!Array.isArray(samples) || samples.length === 0) throw new Error('Lote de entrada vazio.');
  return Array.from(samples, toSonarFeatureVector);
}

/** Resolve persisted IDs in their stored order; never silently drop an unknown ID. */
export function selectSonarSamples(samples, ids) {
  validateSonarSamples(samples);
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length) throw new Error('Lista de IDs inválida ou repetida.');
  const byId = new Map(samples.map(sample => [sample.id, sample]));
  return Array.from(ids, id => {
    if (!byId.has(id)) throw new Error(`ID desconhecido: ${String(id)}.`);
    return byId.get(id);
  });
}
