import { useMemo, useState } from 'react';

function formatPercent(value) {
  return `${(Number.isFinite(value) ? value * 100 : 0).toFixed(1)}%`;
}

function normalizeProbabilities(probabilities) {
  return probabilities
    .map((item) => ({
      label: String(item.label ?? '?'),
      probability: Number.isFinite(item.probability) ? item.probability : 0,
    }))
    .sort((a, b) => b.probability - a.probability);
}

export default function ProbabilityBars({ probabilities = [] }) {
  const [expanded, setExpanded] = useState(false);
  const sortedProbabilities = useMemo(() => normalizeProbabilities(probabilities), [probabilities]);

  if (!sortedProbabilities.length) {
    return <div className="probability-empty">As probabilidades aparecerão após a predição.</div>;
  }

  const collapsedLimit = 8;
  const shouldLimit = sortedProbabilities.length > collapsedLimit;
  const visibleProbabilities = shouldLimit && !expanded ? sortedProbabilities.slice(0, collapsedLimit) : sortedProbabilities;

  return (
    <div className="probability-bars">
      {shouldLimit ? (
        <div className="probability-bars__summary">
          <span>{expanded ? `Distribuição completa: ${sortedProbabilities.length} classes.` : `As ${collapsedLimit} classes mais prováveis.`}</span>
          <button
            aria-expanded={expanded}
            className="text-link probability-bars__toggle"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            {expanded ? 'Mostrar principais' : `Ver todas (${sortedProbabilities.length})`}
          </button>
        </div>
      ) : null}

      <div className="probability-bars__list">
        {visibleProbabilities.map((item) => (
          <div className="probability-row" key={item.label} title={`${item.label}: ${formatPercent(item.probability)}`}>
            <span className="probability-row__label">{item.label}</span>
            <div className="probability-row__track" aria-hidden="true">
              <i className="probability-row__fill" style={{ width: `${Math.max(0, Math.min(100, item.probability * 100))}%` }} />
            </div>
            <strong className="probability-row__value">{formatPercent(item.probability)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
