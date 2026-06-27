import { memo } from 'react';
import { irisClasses } from '../data/irisDataset.js';

function IrisConfusionMatrix({ matrix }) {
  const max = Math.max(...(matrix?.flat() ?? [0]), 1);

  return (
    <section className="iris-control-panel iris-confusion-panel reveal-up" aria-labelledby="iris-confusion-title">
      <div className="panel-heading">
        <div>
          <h3 id="iris-confusion-title">Matriz de confusão</h3>
          <p>Linhas representam classes reais; colunas representam classes previstas. A diagonal principal indica acertos.</p>
        </div>
      </div>

      {matrix ? (
        <div className="iris-confusion-matrix" role="table" aria-label="Matriz de confusão Iris">
          <span />
          {irisClasses.map((label) => (
            <strong key={`col-${label}`}>{label.replace('Iris-', '')}</strong>
          ))}
          {matrix.map((row, rowIndex) => (
            <div className="iris-confusion-row" key={irisClasses[rowIndex]} role="row">
              <strong>{irisClasses[rowIndex].replace('Iris-', '')}</strong>
              {row.map((value, colIndex) => {
                const intensity = value / max;
                return (
                  <span
                    className={rowIndex === colIndex ? 'is-diagonal' : ''}
                    key={`${rowIndex}-${colIndex}`}
                    style={{ '--intensity': intensity }}
                    title={`${irisClasses[rowIndex]} prevista como ${irisClasses[colIndex]}: ${value}`}
                  >
                    {value}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state-card">
          <h4>Matriz ainda não gerada</h4>
          <p>Treine a MLP para avaliar o conjunto de teste e preencher a matriz 3×3.</p>
        </div>
      )}
    </section>
  );
}

export default memo(IrisConfusionMatrix);
