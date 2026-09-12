import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createConfusionMatrixPng, getConfusionMatrixData } from '../src/features/iadivinha/lib/confusionMatrixExport.js';

const metrics = JSON.parse(readFileSync(new URL('../public/models/iadivinha/metrics.json', import.meta.url)));

test('Matriz: usa a ordem das classes e o modelo selecionado, com os 8.000 desenhos do teste', () => {
  const data = getConfusionMatrixData(metrics);
  assert.equal(data.model, 'cnn');
  assert.deepEqual(data.labels, ['Gato', 'Pato', 'Sapato', 'Pão', 'Mão', 'Balão', 'Avião', 'Violão']);
  assert.equal(data.samples, 8000);
  const hits = data.matrix.reduce((sum, row, index) => sum + row[index], 0);
  assert.equal(hits / data.samples, data.accuracy);
  const alternative = structuredClone(metrics);
  alternative.selection.model = 'mlp';
  assert.deepEqual(getConfusionMatrixData(alternative).matrix, metrics.models.mlp.test.confusion_matrix);
});

test('Matriz: rejeita resultados incompletos ou inconsistentes antes de gerar o relatório', () => {
  for (const corrupt of [
    value => { value.smoke = true; },
    value => { value.selection.model = 'missing'; },
    value => { value.classes.pop(); },
    value => { value.models.cnn.test.confusion_matrix[0].pop(); },
    value => { value.models.cnn.test.confusion_matrix[0][0] = -1; },
    value => { value.models.cnn.test.samples++; },
    value => { value.models.cnn.test.accuracy = NaN; },
  ]) {
    const broken = structuredClone(metrics);
    corrupt(broken);
    assert.throws(() => getConfusionMatrixData(broken));
  }
});

test('PNG: mantém contagens e eixos, inclusive zeros, com fundo branco e resolução independente da tela', () => {
  const text = [], backgrounds = [];
  const context = {
    fillText(value, x, y) { text.push({ value, x, y }); },
    fillRect(x, y, width, height) { backgrounds.push({ color: this.fillStyle, x, y, width, height }); },
    strokeRect() {}, save() {}, restore() {}, translate() {}, rotate() {},
  };
  const canvas = {
    getContext: () => context,
    toDataURL(type) { assert.equal(type, 'image/png'); return 'data:image/png;base64,test'; },
  };
  assert.equal(createConfusionMatrixPng(metrics, canvas), 'data:image/png;base64,test');
  assert.deepEqual([canvas.width, canvas.height], [1600, 1660]);
  assert.deepEqual(backgrounds[0], { color: '#ffffff', x: 0, y: 0, width: 1600, height: 1660 });
  const values = text.filter(item => /^\d+$/.test(item.value) && item.y > 320 && item.y < 1440);
  assert.deepEqual(values.map(item => Number(item.value)), metrics.models.cnn.test.confusion_matrix.flat());
  // Cat -> duck (15) and duck -> cat (42) must stay on opposite sides of the diagonal.
  assert.equal(values[1].value, '15');
  assert.equal(values[8].value, '42');
  assert.ok(values[1].x > values[8].x && values[1].y < values[8].y);
  for (const { label } of metrics.classes) assert.equal(text.filter(item => item.value === label).length, 2);
  assert.ok(text.some(item => item.value.includes('8.000 desenhos de teste')));
  assert.ok(text.some(item => item.value.includes('93,6%')));
  assert.ok(text.some(item => item.value.includes('FIGURA REAL (LINHAS)')));
  assert.ok(text.some(item => item.value.includes('PREVISÃO DA IA (COLUNAS)')));
  assert.throws(() => createConfusionMatrixPng(metrics, { getContext: () => null }));
});
