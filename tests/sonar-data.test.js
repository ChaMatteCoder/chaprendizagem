import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { SONAR_CLASSES, SONAR_CLASS_ORDER, SONAR_FEATURE_ORDER, sonarLabelIndex } from '../src/features/sonar/data/sonarSchema.js';
import {
  auditSonarDuplicates, countSonarClasses, parseSonar, selectSonarSamples,
  toSonarFeatureMatrix, toSonarFeatureVector, validateSonarDataset,
  validateSonarFeatures, validateSonarSamples,
} from '../src/features/sonar/lib/data/sonarDataset.js';
import { allocateHoldoutCounts, createSeededRandom, stratifiedHoldout, stratifiedKFold } from '../src/features/sonar/lib/data/stratifiedSplit.js';
import { createSonarPartitions, createSonarProvenance, validateSonarPartitions } from '../src/features/sonar/lib/data/sonarManifests.js';
import { downloadSonarSource, verifySonarSource } from '../training/sonar/source-file.mjs';

const dataDirectory = new URL('../public/data/sonar/', import.meta.url);
const raw = await readFile(new URL('sonar.all-data', dataDirectory));
const source = JSON.parse(await readFile(new URL('../training/sonar/source.lock.json', import.meta.url), 'utf8'));
const provenanceText = await readFile(new URL('provenance.json', dataDirectory), 'utf8');
const partitionsText = await readFile(new URL('partitions.json', dataDirectory), 'utf8');
const partitions = JSON.parse(partitionsText);
const samples = parseSonar(raw.toString('utf8'));
const hash = createHash('sha256').update(raw).digest('hex');
const development = selectSonarSamples(samples, partitions.developmentIds);

function line({ count = 60, label = 'R', value = '0.5' } = {}) {
  return [...Array(count).fill(value), label].join(',');
}

function changedLine(column, value) {
  const columns = line().split(',');
  columns[column] = value;
  return columns.join(',');
}

function assertPartition(first, second, universe) {
  assert.equal(new Set([...first, ...second]).size, first.length + second.length);
  assert.deepEqual([...first, ...second].sort(), [...universe].sort());
}

test('Sonar original: hash, bytes, 208 × 60, limites e contagens reais', () => {
  assert.equal(raw.length, 87776);
  assert.equal(hash, 'e90434cdbf00fcf93ffa911fe447ae25606979658e60f1d32e155c3b5240234d');
  assert.equal(verifySonarSource(raw, source), hash);
  assert.deepEqual(validateSonarDataset(samples), {
    sampleCount: 208, featureCount: 60, classCounts: { R: 97, M: 111 },
    observedRange: [0, 1], duplicates: { exactRowGroups: [], featureGroups: [], conflictingLabelGroups: [] },
  });
  assert.equal(samples[0].id, 'sonar-0001');
  assert.equal(samples.at(-1).id, 'sonar-0208');
  assert.deepEqual(samples[0].features.slice(0, 3), [0.0200, 0.0371, 0.0428]);
  assert.equal(samples[0].features[59], 0.0032);
  assert.deepEqual(SONAR_CLASS_ORDER, ['R', 'M']);
  assert.deepEqual(SONAR_CLASSES.map(item => [item.index, item.label, item.name]), [[0, 'R', 'Rocha'], [1, 'M', 'Metal']]);
  assert.equal(sonarLabelIndex('R'), 0);
  assert.equal(sonarLabelIndex('M'), 1);
  assert.throws(() => sonarLabelIndex('metal'), /R ou M/);
  assert.deepEqual(SONAR_FEATURE_ORDER, Array.from({ length: 60 }, (_, index) => `Attribute${index + 1}`));
});

test('parser preserva ordem, valores e IDs sem exigir terminador final', () => {
  const content = `${line({ value: '0' })}\n${line({ label: 'M', value: '1' })}`;
  const expected = parseSonar(content);
  for (const separator of ['\n', '\r\n', '\r']) {
    for (const ending of ['', separator]) {
      assert.deepEqual(parseSonar(content.replaceAll('\n', separator) + ending), expected);
    }
  }
  assert.equal(expected[0].id, 'sonar-0001');
  assert.equal(expected[1].id, 'sonar-0002');
  assert.equal(expected[1].features[59], 1);
  assert.equal(parseSonar(line({ value: '1e-3' }))[0].features[0], 0.001);
});

test('parser rejeita linhas vazias e extras sem filtrá-las silenciosamente', () => {
  for (const input of ['', '\n', `\n${line()}`, `${line()}\n\n`, `${line()}\n \n${line()}`]) {
    assert.throws(() => parseSonar(input), /vazi/);
  }
  assert.throws(() => parseSonar(`${line()}\n${line({ count: 59 })}`), /Linha 2.*61 colunas/);
  for (const count of [0, 59, 61]) assert.throws(() => parseSonar(line({ count })), /61 colunas/);
});

test('parser rejeita campos faltantes, coerções indevidas, não finitos e fora de [0,1]', () => {
  for (const value of ['', ' ', '?', 'NaN', 'Infinity', '-Infinity', '1e999', '0x1', '0.5x', '-0.0001', '1.0001']) {
    assert.throws(() => parseSonar(changedLine(7, value)), /Linha 1, coluna 8/);
  }
  for (const label of ['', 'r', 'm', 'Rocha', '0', 'X']) {
    assert.throws(() => parseSonar(line({ label })), /Linha 1, coluna 61/);
  }
});

test('validação rejeita dimensões, números não tipados, arrays esparsos e IDs inválidos', () => {
  for (const features of [[], Array(59).fill(0), Array(61).fill(0), Array(60), Array(60).fill('0.5'), Array(60).fill(NaN)]) {
    assert.throws(() => validateSonarFeatures(features));
  }
  assert.throws(() => validateSonarSamples([]), /vazio/);
  assert.throws(() => validateSonarSamples([samples[0], samples[0]]), /ID duplicado/);
  assert.throws(() => validateSonarSamples([{ ...samples[0], id: undefined }]), /ID Sonar/);
  assert.throws(() => validateSonarDataset(samples.slice(1)), /208 registros/);
  assert.throws(() => validateSonarDataset(samples.map((sample, index) => index === 0 ? { ...sample, label: 'M' } : sample)), /Classe R/);
});

test('auditoria distingue repetição exata de vetores iguais com rótulos conflitantes', () => {
  const duplicates = parseSonar(`${line()}\n${line({ value: '0.500' })}\n${line({ label: 'M' })}`);
  const report = auditSonarDuplicates(duplicates);
  assert.deepEqual(report.exactRowGroups, [['sonar-0001', 'sonar-0002']]);
  assert.deepEqual(report.featureGroups, [{ ids: ['sonar-0001', 'sonar-0002', 'sonar-0003'], labels: ['R', 'M'] }]);
  assert.deepEqual(report.conflictingLabelGroups, report.featureGroups);
  assert.equal(duplicates.length, 3);
  const changed = samples.map((sample, index) => index === 1 ? { ...sample, features: [...samples[0].features] } : sample);
  assert.throws(() => createSonarPartitions(changed, hash), /duplicados.*nenhuma linha foi removida/);
});

test('entrada do classificador contém apenas 60 números e independe de rótulo, ID e metadados', () => {
  const expected = [...samples[0].features];
  const guarded = {
    features: samples[0].features,
    get label() { throw new Error('Não pode ler o rótulo.'); },
    get id() { throw new Error('Não pode ler o ID.'); },
  };
  assert.deepEqual(toSonarFeatureVector(guarded), expected);
  assert.deepEqual(toSonarFeatureMatrix([guarded, { features: expected, label: 'M', split: 'test', score: 5 }]), [expected, expected]);
  const vector = toSonarFeatureVector(samples[0]);
  vector[0] = 1;
  assert.equal(samples[0].features[0], 0.02);
  assert.throws(() => toSonarFeatureMatrix([]), /vazio/);
  assert.throws(() => toSonarFeatureMatrix(Array(2)), /60 atributos/);
});

test('teste reservado tem 42 IDs estratificados e desenvolvimento cobre os 166 restantes', () => {
  assertPartition(partitions.developmentIds, partitions.testIds, samples.map(sample => sample.id));
  assert.deepEqual(countSonarClasses(development), { R: 77, M: 89 });
  assert.deepEqual(countSonarClasses(selectSonarSamples(samples, partitions.testIds)), { R: 20, M: 22 });
  assert.equal(partitions.testIds.length, 42);
  assert.equal(partitions.developmentIds.length, 166);
  assert.equal(partitions.protocol.testSeed, 42);
});

test('cinco folds usam só desenvolvimento, cobrem cada ID uma vez e equilibram as classes', () => {
  const validationIds = [];
  const expected = [{ R: 16, M: 18 }, { R: 16, M: 17 }, ...Array(3).fill({ R: 15, M: 18 })];
  assert.equal(partitions.folds.length, 5);
  for (const [index, fold] of partitions.folds.entries()) {
    assertPartition(fold.trainIds, fold.validationIds, partitions.developmentIds);
    assert.deepEqual(countSonarClasses(selectSonarSamples(samples, fold.validationIds)), expected[index]);
    assert.equal(fold.validationIds.length, index === 0 ? 34 : 33);
    assert.ok([...fold.trainIds, ...fold.validationIds].every(id => !partitions.testIds.includes(id)));
    validationIds.push(...fold.validationIds);
  }
  assert.equal(new Set(validationIds).size, 166);
  assert.deepEqual(validationIds.sort(), [...partitions.developmentIds].sort());
});

test('holdout interativo do laboratório é distinto da CV e não contém teste', () => {
  assertPartition(partitions.lab.trainIds, partitions.lab.validationIds, partitions.developmentIds);
  assert.deepEqual(countSonarClasses(selectSonarSamples(samples, partitions.lab.trainIds)), { R: 62, M: 71 });
  assert.deepEqual(countSonarClasses(selectSonarSamples(samples, partitions.lab.validationIds)), { R: 15, M: 18 });
  assert.equal(partitions.lab.trainIds.length, 133);
  assert.equal(partitions.lab.validationIds.length, 33);
  for (const fold of partitions.folds) assert.notDeepEqual(partitions.lab.validationIds, fold.validationIds);
});

test('split reproduzível, sensível à seed e independente da ordem fornecida, sem mutação', () => {
  const snapshot = JSON.stringify(samples);
  const split = stratifiedHoldout(samples, { ratio: 0.2, seed: 42 });
  assert.deepEqual(split, stratifiedHoldout([...samples].reverse(), { ratio: 0.2, seed: 42 }));
  assert.notDeepEqual(split, stratifiedHoldout(samples, { ratio: 0.2, seed: 43 }));
  assert.deepEqual(createSonarPartitions(samples, hash), partitions);
  assert.deepEqual(createSonarPartitions([...samples].reverse(), hash), partitions);
  assert.equal(JSON.stringify(samples), snapshot);
});

test('estratificação preserva invariantes com múltiplas seeds, proporções e números de folds', () => {
  for (let seed = 0; seed < 24; seed++) {
    for (const ratio of [0.1, 0.2, 0.3, 0.5]) {
      const split = stratifiedHoldout(samples, { ratio, seed });
      assertPartition(split.trainIds, split.holdoutIds, samples.map(sample => sample.id));
      assert.equal(split.holdoutIds.length, Math.round(samples.length * ratio));
      const counts = countSonarClasses(selectSonarSamples(samples, split.holdoutIds));
      for (const label of SONAR_CLASS_ORDER) {
        assert.ok(Math.abs(counts[label] - split.holdoutIds.length * countSonarClasses(samples)[label] / samples.length) < 1);
      }
    }
    for (const number of [2, 3, 5, 7]) {
      const folds = stratifiedKFold(development, { folds: number, seed });
      const totals = folds.map(fold => fold.validationIds.length);
      assert.ok(Math.max(...totals) - Math.min(...totals) <= 1);
      const allValidation = folds.flatMap(fold => fold.validationIds);
      assert.equal(new Set(allValidation).size, development.length);
      for (const fold of folds) assertPartition(fold.trainIds, fold.validationIds, partitions.developmentIds);
      for (const label of SONAR_CLASS_ORDER) {
        const counts = folds.map(fold => countSonarClasses(selectSonarSamples(samples, fold.validationIds))[label]);
        assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
      }
    }
  }
});

test('parâmetros inválidos são rejeitados e desempate de cotas segue R,M', () => {
  assert.deepEqual(allocateHoldoutCounts({ R: 3, M: 3 }, 0.5), { R: 2, M: 1 });
  for (const ratio of [0, 1, -1, NaN, Infinity, 0.001, 0.999, '0.2']) {
    assert.throws(() => stratifiedHoldout(samples, { ratio, seed: 42 }));
  }
  for (const seed of [-1, 0.5, NaN, 4294967296, '42']) assert.throws(() => createSeededRandom(seed), /Seed/);
  for (const folds of [0, 1, 2.5, 78]) assert.throws(() => stratifiedKFold(development, { folds, seed: 43 }));
  assert.throws(() => stratifiedHoldout(samples.filter(sample => sample.label === 'R'), { ratio: 0.2, seed: 1 }), /duas amostras/);
  const a = createSeededRandom(0);
  const b = createSeededRandom(0);
  for (let i = 0; i < 30; i++) { const value = a(); assert.equal(value, b()); assert.ok(value >= 0 && value < 1); }
});

test('resolver IDs persistidos mantém sua ordem e rejeita desconhecidos ou repetidos', () => {
  assert.deepEqual(selectSonarSamples(samples, ['sonar-0208', 'sonar-0001']), [samples[207], samples[0]]);
  assert.throws(() => selectSonarSamples(samples, ['sonar-9999']), /desconhecido/);
  assert.throws(() => selectSonarSamples(samples, ['sonar-0001', 'sonar-0001']), /repetida/);
  assert.throws(() => selectSonarSamples(samples, Array(1)), /desconhecido/);
});

test('manifestos persistidos são reproduzidos byte a byte, com fonte e transformação documentadas', () => {
  assert.equal(`${JSON.stringify(createSonarPartitions(samples, hash), null, 2)}\n`, partitionsText);
  const provenance = createSonarProvenance(samples, source);
  assert.equal(`${JSON.stringify(provenance, null, 2)}\n`, provenanceText);
  assert.deepEqual(provenance.transformations, []);
  assert.equal(provenance.source.license.id, 'CC-BY-4.0');
  assert.equal(provenance.source.doi, '10.24432/C5T01Q');
  assert.equal(provenance.labelColumn, 61);
  assert.equal(provenance.featureOrder.length, 60);
  assert.deepEqual(validateSonarPartitions(samples, partitions, hash).test, { total: 42, classCounts: { R: 20, M: 22 } });
});

test('validador detecta manifesto corrompido, vazamento de teste e cobertura incompleta', () => {
  const changes = [
    value => { value.datasetSha256 = '0'.repeat(64); },
    value => { value.classOrder.reverse(); },
    value => { value.featureCount = 61; },
    value => { value.schemaVersion = 2; },
    value => { value.protocol.testSeed = 43; },
    value => { value.counts.test.classCounts.R++; },
    value => { value.testIds[0] = value.developmentIds[0]; },
    value => { value.developmentIds.pop(); },
    value => { value.folds.pop(); },
    value => { value.folds[0].validationIds[0] = value.testIds[0]; },
    value => { value.folds[0].trainIds[0] = value.folds[0].validationIds[0]; },
    value => { value.folds[0].counts.validation.total++; },
    value => { value.folds[1] = { ...structuredClone(value.folds[0]), fold: 2 }; },
    value => { value.lab.validationIds[0] = value.testIds[0]; },
    value => { value.lab.counts.train.classCounts.M++; },
  ];
  for (const change of changes) {
    const manifest = structuredClone(partitions);
    change(manifest);
    assert.throws(() => validateSonarPartitions(samples, manifest, hash));
  }
});

test('integridade da fonte rejeita alteração de conteúdo ou conversão de quebras de linha', () => {
  const modified = Buffer.from(raw);
  modified[0] = 49;
  assert.throws(() => verifySonarSource(modified, source), /diverge do lock/);
  assert.throws(() => verifySonarSource(Buffer.from(raw.toString('utf8').replaceAll('\n', '\r\n')), source), /diverge do lock/);
});

test('aquisição verifica resposta e hash antes de disponibilizar bytes', async () => {
  let requested;
  const downloaded = await downloadSonarSource(source, { fetchImpl: async (url, options) => {
    requested = url;
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(raw);
  } });
  assert.equal(requested, source.downloadUrl);
  assert.deepEqual(downloaded, raw);
  await assert.rejects(downloadSonarSource(source, { fetchImpl: async () => new Response('not found', { status: 404 }) }), /HTTP 404/);
  await assert.rejects(downloadSonarSource(source, { fetchImpl: async () => new Response('invalid') }), /diverge do lock/);
  await assert.rejects(downloadSonarSource(source, { fetchImpl: async () => { throw new Error('offline'); } }), /offline/);
});

test('CLI verifica offline de outro diretório e preparação repetida preserva os artefatos', async () => {
  const script = fileURLToPath(new URL('../training/sonar/prepare-data.mjs', import.meta.url));
  for (const args of [['--check'], []]) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: tmpdir(), encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.datasetSha256, hash);
    assert.equal(report.validation.sampleCount, 208);
  }
  assert.equal(await readFile(new URL('provenance.json', dataDirectory), 'utf8'), provenanceText);
  assert.equal(await readFile(new URL('partitions.json', dataDirectory), 'utf8'), partitionsText);
  assert.deepEqual(await readFile(new URL('sonar.all-data', dataDirectory)), raw);
  const invalid = spawnSync(process.execPath, [script, '--force'], { encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Uso:/);
});
