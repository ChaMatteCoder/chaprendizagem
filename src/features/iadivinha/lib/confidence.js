// Integer game points use nearest-percent rounding. This is a game rule, not accuracy.
export function confidencePoints(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1 ? Math.round(value * 100) : 0;
}

// Do not turn a near-one softmax output into a claim of absolute certainty.
export function formatConfidence(value) {
  if (!Number.isFinite(value) || value < 0 || value > 1) return '—';
  if (value === 1) return '≈100%';
  if (value >= .9995) return '>99,9%';
  if (value > 0 && value < .0005) return '<0,1%';
  return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}
