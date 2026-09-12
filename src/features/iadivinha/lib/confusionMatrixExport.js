export const formatMetric = value => `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

export function getConfusionMatrixData(metrics) {
  const model = metrics?.selection?.model;
  const result = metrics?.models?.[model]?.test;
  const labels = metrics?.classes?.map(item => item.label);
  const matrix = result?.confusion_matrix;
  if (metrics?.smoke !== false || !labels?.length || labels.some(label => typeof label !== 'string' || !label.trim()) ||
    !Array.isArray(matrix) || matrix.length !== labels.length ||
    matrix.some(row => !Array.isArray(row) || row.length !== labels.length || row.some(count => !Number.isSafeInteger(count) || count < 0)) ||
    !Number.isSafeInteger(result.samples) || result.samples <= 0 || matrix.flat().reduce((total, count) => total + count, 0) !== result.samples ||
    ![result.accuracy, result.macro_f1].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) {
    throw new Error('Os dados da matriz de confusão estão incompletos.');
  }
  return { model, labels, matrix, samples: result.samples, accuracy: result.accuracy, macroF1: result.macro_f1 };
}

export function matrixCellColor(count, max) {
  const intensity = count / Math.max(1, max);
  const from = [239, 248, 247], to = [19, 100, 94];
  return `rgb(${from.map((value, index) => Math.round(value + (to[index] - value) * intensity)).join(', ')})`;
}

// Render from the evaluation data, independently of screen size and horizontal scrolling.
export function createConfusionMatrixPng(metrics, canvas = document.createElement('canvas')) {
  const { model, labels, matrix, samples, accuracy, macroF1 } = getConfusionMatrixData(metrics);
  canvas.width = 1600;
  canvas.height = 1660;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível criar a imagem.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#172a2d';
  ctx.font = '700 44px Arial, sans-serif';
  ctx.fillText('IAdivinha! · Matriz de confusão', 80, 90);
  ctx.font = '28px Arial, sans-serif';
  ctx.fillText(`Modelo ${model.toUpperCase()} · Quick, Draw! · ${samples.toLocaleString('pt-BR')} desenhos de teste`, 80, 143);
  ctx.fillText(`Acurácia: ${formatMetric(accuracy)}   |   F1 macro: ${formatMetric(macroF1)}`, 80, 186);

  const originX = 320, originY = 320, size = 1120, cell = size / labels.length;
  const max = Math.max(...matrix.flat());
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 28px Arial, sans-serif';
  ctx.fillText('PREVISÃO DA IA (COLUNAS)', originX + size / 2, 244);
  ctx.save();
  ctx.translate(92, originY + size / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('FIGURA REAL (LINHAS)', 0, 0);
  ctx.restore();
  labels.forEach((label, index) => {
    ctx.font = '700 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, originX + (index + 0.5) * cell, originY - 28, cell - 8);
    ctx.textAlign = 'right';
    ctx.fillText(label, originX - 24, originY + (index + 0.5) * cell, 174);
  });
  matrix.forEach((row, rowIndex) => row.forEach((count, columnIndex) => {
    const x = originX + columnIndex * cell, y = originY + rowIndex * cell;
    ctx.fillStyle = matrixCellColor(count, max);
    ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    if (rowIndex === columnIndex) {
      ctx.strokeStyle = '#172a2d';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
    }
    ctx.textAlign = 'center';
    ctx.font = '700 28px Arial, sans-serif';
    ctx.fillStyle = count / max > 0.6 ? '#ffffff' : '#172a2d';
    ctx.fillText(String(count), x + cell / 2, y + cell / 2);
  }));
  for (let step = 0; step < 100; step++) {
    ctx.fillStyle = matrixCellColor(step, 99);
    ctx.fillRect(originX + step * 4, 1470, 4, 20);
  }
  ctx.fillStyle = '#172a2d';
  ctx.font = '22px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('0', originX, 1510);
  ctx.textAlign = 'right';
  ctx.fillText(String(max), originX + 400, 1510);
  ctx.textAlign = 'left';
  ctx.fillText('Cor = quantidade de desenhos · Contorno = acertos na diagonal', 80, 1560);
  ctx.fillText('Fonte: avaliação em teste separado do treino. Estes dados não são o placar de uma partida.', 80, 1610);
  const url = canvas.toDataURL('image/png');
  if (!url.startsWith('data:image/png')) throw new Error('Não foi possível exportar o PNG.');
  return url;
}
