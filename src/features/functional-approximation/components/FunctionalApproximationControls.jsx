import { BrainCircuit, RefreshCcw, Sparkles, Zap } from 'lucide-react';

const presets = [
  {
    label: 'Modelo suave',
    values: { hiddenNeurons: 5, learningRate: 0.025, epochs: 1600, activation: 'tanh', seed: 42 },
  },
  {
    label: 'Aprendizado rapido',
    values: { hiddenNeurons: 8, learningRate: 0.08, epochs: 900, activation: 'tanh', seed: 12 },
  },
  {
    label: 'Aprendizado instavel',
    values: { hiddenNeurons: 10, learningRate: 0.32, epochs: 500, activation: 'tanh', seed: 7 },
  },
  {
    label: 'Mais neurônios',
    values: { hiddenNeurons: 14, learningRate: 0.018, epochs: 2200, activation: 'tanh', seed: 24 },
  },
  {
    label: 'Poucas épocas',
    values: { hiddenNeurons: 6, learningRate: 0.03, epochs: 120, activation: 'tanh', seed: 42 },
  },
];

export default function FunctionalApproximationControls({
  formError,
  onAddNoise,
  onApplyPreset,
  onRestore,
  onTrain,
  parameters,
  pointCount,
  setParameters,
  isTraining,
  warning,
}) {
  function updateParameter(key, value) {
    setParameters((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="tool-panel functional-controls">
      <div className="panel-heading">
        <div>
          <h2>Parâmetros da MLP</h2>
          <p>{pointCount} pontos de treinamento</p>
        </div>
        <BrainCircuit size={26} />
      </div>

      <div className="settings-grid">
        <label>
          Neurônios ocultos
          <input
            min="1"
            max="24"
            onChange={(event) => updateParameter('hiddenNeurons', event.target.value)}
            step="1"
            type="number"
            value={parameters.hiddenNeurons}
          />
        </label>
        <label>
          Taxa de aprendizagem
          <input
            min="0.0001"
            max="1"
            onChange={(event) => updateParameter('learningRate', event.target.value)}
            step="0.001"
            type="number"
            value={parameters.learningRate}
          />
        </label>
        <label>
          Épocas
          <input
            min="1"
            max="20000"
            onChange={(event) => updateParameter('epochs', event.target.value)}
            step="10"
            type="number"
            value={parameters.epochs}
          />
        </label>
        <label>
          Seed
          <input
            min="1"
            onChange={(event) => updateParameter('seed', event.target.value)}
            step="1"
            type="number"
            value={parameters.seed}
          />
        </label>
      </div>

      <label className="functional-select-label">
        Função de ativação oculta
        <select onChange={(event) => updateParameter('activation', event.target.value)} value={parameters.activation}>
          <option value="tanh">tanh</option>
          <option value="sigmoid">sigmoide</option>
          <option value="relu">ReLU</option>
        </select>
      </label>

      <div className="preset-list" aria-label="Presets de treinamento">
        {presets.map((preset) => (
          <button className="button button--ghost compact-button" key={preset.label} onClick={() => onApplyPreset(preset.values)} type="button">
            {preset.label}
          </button>
        ))}
      </div>

      {warning ? <p className="form-warning">{warning}</p> : null}
      {formError ? <p className="form-error">{formError}</p> : null}

      <div className="control-row functional-action-row">
        <button className="button button--primary" disabled={isTraining} onClick={onTrain} type="button">
          {isTraining ? <span className="button-spinner" aria-hidden="true" /> : <Zap size={17} />}
          {isTraining ? 'Treinando...' : 'Treinar MLP'}
        </button>
        <button className="button button--ghost" onClick={onRestore} type="button">
          <RefreshCcw size={17} /> Restaurar dados do professor
        </button>
        <button className="button button--ghost" onClick={onAddNoise} type="button">
          <Sparkles size={17} /> Adicionar ruído
        </button>
      </div>
    </section>
  );
}
