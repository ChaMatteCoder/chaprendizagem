import { memo } from 'react';
import { irisClasses, irisFeatures } from '../data/irisDataset.js';

function percent(value) {
  return `${((Number(value) || 0) * 100).toFixed(1)}%`;
}

function IrisMetricsCards({ result }) {
  const summary = result?.summary;
  const metrics = result?.metrics;

  const cards = [
    { label: 'Acurácia de treino', value: summary ? percent(summary.trainAccuracy) : '—' },
    { label: 'Acurácia de teste', value: summary ? percent(summary.testAccuracy) : '—' },
    { label: 'Loss final', value: summary ? summary.finalLoss.toFixed(4) : '—' },
    { label: 'Épocas', value: summary?.epochs ?? '—' },
    { label: 'Amostras de treino', value: summary?.trainSamples ?? '—' },
    { label: 'Amostras de teste', value: summary?.testSamples ?? '—' },
    { label: 'Classes', value: irisClasses.length },
    { label: 'Atributos', value: irisFeatures.length },
  ];

  return (
    <section className="iris-metrics-section reveal-up">
      <div className="iris-metrics-grid">
        {cards.map((card) => (
          <article className="metric-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      {metrics ? (
        <div className="iris-class-metrics">
          {metrics.perClass.map((item, index) => (
            <article key={irisClasses[index]}>
              <h4>{irisClasses[index]}</h4>
              <span>Precision: {percent(item.precision)}</span>
              <span>Recall: {percent(item.recall)}</span>
              <span>F1-score: {percent(item.f1)}</span>
              <small>Suporte: {item.support} amostras</small>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default memo(IrisMetricsCards);
