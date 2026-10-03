import { SONAR_CLASS_ORDER } from '../../data/sonarSchema.js';
import { countSonarClasses, validateSonarSamples } from './sonarDataset.js';

export function createSeededRandom(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('Seed deve ser um inteiro entre 0 e 4294967295.');
  }
  let state = seed >>> 0;
  // Mulberry32: explicit unsigned 32-bit arithmetic, including seed zero.
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function classGroups(samples, seed) {
  validateSonarSamples(samples);
  const random = createSeededRandom(seed);
  // Canonical ID order makes membership independent of the caller's array order.
  const canonical = [...samples].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return SONAR_CLASS_ORDER.map(label => shuffle(canonical.filter(sample => sample.label === label), random));
}

/** Global rounded size, then largest remainders; ties follow R, M order. */
export function allocateHoldoutCounts(classCounts, ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) throw new Error('Proporção deve estar entre 0 e 1, sem extremos.');
  if (SONAR_CLASS_ORDER.some(label => !Number.isInteger(classCounts[label]) || classCounts[label] < 2)) {
    throw new Error('Cada classe precisa de pelo menos duas amostras.');
  }
  const total = SONAR_CLASS_ORDER.reduce((sum, label) => sum + classCounts[label], 0);
  const size = Math.round(total * ratio);
  const quotas = SONAR_CLASS_ORDER.map((label, index) => {
    const ideal = size * classCounts[label] / total;
    return { label, index, count: Math.floor(ideal), remainder: ideal - Math.floor(ideal) };
  });
  const remaining = size - quotas.reduce((sum, quota) => sum + quota.count, 0);
  const ranked = [...quotas].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < remaining; index++) ranked[index].count++;
  if (quotas.some(quota => quota.count === 0 || quota.count >= classCounts[quota.label])) {
    throw new Error('A proporção deixa uma classe sem exemplos no treino ou no holdout.');
  }
  return Object.fromEntries(quotas.map(quota => [quota.label, quota.count]));
}

/** @returns {{ trainIds: string[], holdoutIds: string[] }} */
export function stratifiedHoldout(samples, { ratio, seed }) {
  const groups = classGroups(samples, seed);
  const quotas = allocateHoldoutCounts(countSonarClasses(samples), ratio);
  const trainIds = [];
  const holdoutIds = [];
  groups.forEach((group, index) => {
    const count = quotas[SONAR_CLASS_ORDER[index]];
    holdoutIds.push(...group.slice(0, count).map(sample => sample.id));
    trainIds.push(...group.slice(count).map(sample => sample.id));
  });
  return { trainIds: trainIds.sort(), holdoutIds: holdoutIds.sort() };
}

export function stratifiedKFold(samples, { folds, seed }) {
  if (!Number.isInteger(folds) || folds < 2) throw new Error('Número de folds deve ser inteiro e pelo menos 2.');
  const groups = classGroups(samples, seed);
  if (groups.some(group => group.length < folds)) throw new Error('Cada classe precisa de pelo menos uma amostra por fold.');
  const validationSets = Array.from({ length: folds }, () => []);
  // Continue the cursor between classes to balance both total and per-class sizes.
  let cursor = 0;
  for (const group of groups) {
    for (const sample of group) validationSets[cursor++ % folds].push(sample.id);
  }
  const allIds = samples.map(sample => sample.id).sort();
  return validationSets.map((ids, index) => {
    const heldOut = new Set(ids);
    return {
      fold: index + 1,
      trainIds: allIds.filter(id => !heldOut.has(id)),
      validationIds: ids.sort(),
    };
  });
}
