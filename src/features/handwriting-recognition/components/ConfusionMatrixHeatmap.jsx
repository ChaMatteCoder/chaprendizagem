import React from 'react';

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
  const heading =
    source === 'alphanumeric'
      ? 'Matriz de confusão alfanumérica — baseada nos resultados exportados do treino MNIST + EMNIST.'
      : source === 'mnist'
        ? 'Matriz de confusão MNIST — baseada nos resultados exportados do treino Python.'
        : 'Matriz de confusão didática — baseada no subconjunto local usado na simulação.';

  return (
    <article className="wide-panel confusion-panel">
      <div className="section-heading">
        <p className="eyebrow">Matriz de confusão</p>
        <h2>{heading}</h2>
        <p>
          {isAlphanumeric
            ? 'Como há 36 classes, a matriz é maior. A diagonal principal representa acertos; pontos fora da diagonal mostram confusões entre números e letras.'
            : 'Linhas são classes reais; colunas são classes previstas. A diagonal principal representa acertos.'}
        </p>
      </div>
      <div className="confusion-scroll">
        <div className="confusion-matrix" style={{ gridTemplateColumns: `42px repeat(${labels.length}, 34px)` }}>
          <span />
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
                    style={{ backgroundColor: `rgba(0, 87, 91, ${0.08 + intensity * 0.82})` }}
                    title={`Real ${actual}, previsto ${predicted}: ${value}`}
                  >
                    {value}
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
