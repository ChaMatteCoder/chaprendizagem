import React from 'react';
import { Download } from 'lucide-react';

function getHeatColor(value, max) {
  const intensity = value / Math.max(1, max);
  return `rgba(0, 87, 91, ${0.08 + intensity * 0.82})`;
}

function createMatrixPngDataUrl(labels, matrix, title) {
  const scale = 2;
  const cellSize = labels.length > 10 ? 28 : 38;
  const labelSize = labels.length > 10 ? 38 : 48;
  const padding = 28;
  const titleHeight = 76;
  const width = padding * 2 + labelSize + labels.length * cellSize;
  const height = padding * 2 + titleHeight + labelSize + labels.length * cellSize;
  const max = Math.max(1, ...matrix.flat());
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = width * scale;
  canvas.height = height * scale;
  context.scale(scale, scale);
  context.fillStyle = '#f8f9f6';
  context.fillRect(0, 0, width, height);

  context.fillStyle = '#141b1d';
  context.font = '700 18px sans-serif';
  context.fillText(title, padding, padding + 22, width - padding * 2);
  context.fillStyle = '#52615d';
  context.font = '600 11px sans-serif';
  context.fillText('Linhas: classe real · Colunas: classe prevista', padding, padding + 45);

  const originX = padding + labelSize;
  const originY = padding + titleHeight + labelSize;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `700 ${labels.length > 10 ? 10 : 12}px sans-serif`;

  labels.forEach((label, index) => {
    context.fillStyle = '#00575b';
    context.fillText(label, originX + index * cellSize + cellSize / 2, originY - labelSize / 2);
    context.fillText(label, originX - labelSize / 2, originY + index * cellSize + cellSize / 2);
  });

  matrix.forEach((row, rowIndex) => {
    labels.forEach((_, colIndex) => {
      const value = row?.[colIndex] ?? 0;
      const x = originX + colIndex * cellSize;
      const y = originY + rowIndex * cellSize;
      const intensity = value / max;
      context.fillStyle = getHeatColor(value, max);
      context.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      if (rowIndex === colIndex) {
        context.strokeStyle = '#d89b18';
        context.lineWidth = 2;
        context.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
      }
      if (value !== 0) {
        context.fillStyle = intensity > 0.42 ? '#ffffff' : '#23302d';
        context.fillText(String(value), x + cellSize / 2, y + cellSize / 2);
      }
    });
  });

  return canvas.toDataURL('image/png');
}

function getTopConfusions(labels, matrix, limit) {
  return matrix
    .flatMap((row, rowIndex) =>
      row.map((value, colIndex) => ({
        actual: labels[rowIndex],
        predicted: labels[colIndex],
        value,
        isDiagonal: rowIndex === colIndex,
      })),
    )
    .filter((item) => !item.isDiagonal && item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function getEmptyText(source) {
  if (source === 'mnist-missing') {
    return 'A matriz de confusão será exibida após carregar os resultados do treino MNIST em public/models/digits/mnist_metrics.json.';
  }
  if (source === 'alphanumeric-missing') {
    return 'A matriz de confusão será exibida após carregar public/models/alphanumeric/alphanumeric_metrics.json.';
  }

  return 'A matriz de confusão será exibida após avaliar o modelo em uma base de teste ou após treinar a MLP didática.';
}

export default function ConfusionMatrixHeatmap({ labels = [], matrix = [], source = 'empty' }) {
  if (!matrix) {
    return (
      <article className="wide-panel confusion-panel">
        <div className="section-heading">
          <p className="eyebrow">Matriz de confusão</p>
          <h2>Aguardando avaliação do modelo.</h2>
          <p>{getEmptyText(source)}</p>
        </div>
        <div className="confusion-empty-state">Aguardando treinamento do modo atual.</div>
      </article>
    );
  }

  const isAlphanumeric = labels.length === 36 || source === 'alphanumeric';
  const max = Math.max(1, ...matrix.flat());
  const topConfusions = getTopConfusions(labels, matrix, isAlphanumeric ? 8 : 3);
  const cellSize = isAlphanumeric ? 18 : 30;
  const labelSize = isAlphanumeric ? 26 : 38;
  const heading =
    source === 'alphanumeric'
      ? 'Matriz de confusão alfanumérica — baseada nos resultados exportados do treino MNIST + EMNIST.'
      : source === 'mnist'
        ? 'Matriz de confusão MNIST — baseada nos resultados exportados do treino Python.'
        : 'Matriz de confusão didática — baseada no subconjunto local usado na simulação.';

  return (
    <article className="wide-panel confusion-panel">
      <div className="confusion-panel__header">
        <div className="section-heading">
          <p className="eyebrow">Matriz de confusão</p>
          <h2>{heading}</h2>
          <p>
            {isAlphanumeric
              ? 'A diagonal principal representa acertos; pontos fora da diagonal mostram confusões entre números e letras.'
              : 'Linhas são classes reais; colunas são classes previstas. A diagonal principal representa acertos.'}
          </p>
        </div>
        <a
          aria-label="Baixar matriz de confusão como PNG"
          className="confusion-download"
          download={`matriz-confusao-${source}.png`}
          href="data:,"
          onClick={(event) => {
            event.currentTarget.href = createMatrixPngDataUrl(labels, matrix, heading);
          }}
          title="Baixar matriz como PNG"
        >
          <Download size={18} />
          <span>Baixar PNG</span>
        </a>
      </div>
      <div className="confusion-legend" aria-hidden="true">
        <span>Real ↓</span>
        <span>Previsto →</span>
        <span><i /> Acertos na diagonal</span>
      </div>
      <div className="confusion-scroll">
        <div
          className={`confusion-matrix ${isAlphanumeric ? 'confusion-matrix--compact' : ''}`}
          style={{
            '--confusion-cell-size': `${cellSize}px`,
            '--confusion-font-size': isAlphanumeric ? '0.62rem' : '0.74rem',
            gridTemplateColumns: `${labelSize}px repeat(${labels.length}, ${cellSize}px)`,
          }}
        >
          <strong className="confusion-matrix__corner">R/P</strong>
          {labels.map((label) => <strong key={`h-${label}`}>{label}</strong>)}
          {labels.map((actual, rowIndex) => (
            <React.Fragment key={`row-${actual}`}>
              <strong key={`r-${actual}`}>{actual}</strong>
              {labels.map((predicted, colIndex) => {
                const value = matrix[rowIndex]?.[colIndex] ?? 0;
                const intensity = value / max;
                return (
                  <span
                    className={rowIndex === colIndex ? 'is-diagonal' : ''}
                    key={`${actual}-${predicted}`}
                    aria-label={`Real ${actual}, previsto ${predicted}: ${value}`}
                    style={{
                      backgroundColor: getHeatColor(value, max),
                      color: intensity > 0.42 ? '#ffffff' : '#23302d',
                    }}
                    title={`Real ${actual}, previsto ${predicted}: ${value}`}
                  >
                    {value === 0 && isAlphanumeric ? '' : value}
                  </span>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="confusion-insights">
        <h3>Principais confusões</h3>
        {topConfusions.length ? (
          topConfusions.map((item) => (
            <p key={`${item.actual}-${item.predicted}`}>
              {item.actual} confundido com {item.predicted}: <strong>{item.value}</strong> casos
            </p>
          ))
        ) : (
          <p>Nenhuma confusão fora da diagonal foi detectada nesta matriz.</p>
        )}
      </div>
    </article>
  );
}
