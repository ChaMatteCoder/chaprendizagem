import { memo } from 'react';
import { irisFeatures } from '../data/irisDataset.js';

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function IrisFeatureControls({ disabled, sample, onChange }) {
  return (
    <section className="iris-control-panel" aria-labelledby="iris-simulator-title">
      <div className="panel-heading">
        <div>
          <h3 id="iris-simulator-title">Teste uma nova flor</h3>
          <p>Ajuste as quatro medidas. A predição acompanha os controles com um pequeno atraso para manter a interface fluida.</p>
        </div>
      </div>

      <div className="iris-feature-controls">
        {irisFeatures.map((feature) => {
          const value = Number(sample[feature.id] ?? feature.min).toFixed(1);
          const commitValue = (rawValue) => onChange(feature.id, clamp(Number(rawValue), feature.min, feature.max));

          return (
            <label className="iris-feature-control" key={feature.id}>
              <span className="iris-feature-control__header">
                <strong>{feature.name}</strong>
                <em>{feature.label}</em>
              </span>
              <input
                aria-label={`${feature.name} em escala deslizante`}
                disabled={disabled}
                max={feature.max}
                min={feature.min}
                onChange={(event) => commitValue(event.target.value)}
                step={feature.step}
                type="range"
                value={value}
              />
              <div className="iris-feature-control__value">
                <input
                  aria-label={`${feature.name} em centímetros`}
                  disabled={disabled}
                  max={feature.max}
                  min={feature.min}
                  onChange={(event) => commitValue(event.target.value)}
                  step={feature.step}
                  type="number"
                  value={value}
                />
                <small>{feature.unit}</small>
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default memo(IrisFeatureControls);
