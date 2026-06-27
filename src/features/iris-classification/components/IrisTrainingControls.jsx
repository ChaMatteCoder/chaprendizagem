import { Play, RefreshCw } from 'lucide-react';

export default function IrisTrainingControls({ config, disabled, hasResult, isTraining, onChange, onTrain, status }) {
  return (
    <section className="iris-control-panel iris-training-panel" aria-labelledby="iris-training-title">
      <div className="panel-heading">
        <div>
          <h3 id="iris-training-title">Treine a MLP</h3>
          <p>Configure a divisão treino/teste, as camadas ocultas e acompanhe o treinamento no navegador.</p>
        </div>
      </div>

      <div className="iris-training-grid">
        <label>
          Épocas
          <input
            disabled={isTraining}
            max="180"
            min="20"
            onChange={(event) => onChange('epochs', Number(event.target.value))}
            step="10"
            type="number"
            value={config.epochs}
          />
        </label>
        <label>
          1ª camada
          <input
            disabled={isTraining}
            max="24"
            min="4"
            onChange={(event) => onChange('hiddenUnits1', Number(event.target.value))}
            step="1"
            type="number"
            value={config.hiddenUnits1}
          />
        </label>
        <label>
          2ª camada
          <input
            disabled={isTraining}
            max="18"
            min="3"
            onChange={(event) => onChange('hiddenUnits2', Number(event.target.value))}
            step="1"
            type="number"
            value={config.hiddenUnits2}
          />
        </label>
        <label>
          Taxa de aprendizagem
          <input
            disabled={isTraining}
            max="0.08"
            min="0.005"
            onChange={(event) => onChange('learningRate', Number(event.target.value))}
            step="0.005"
            type="number"
            value={config.learningRate}
          />
        </label>
        <label>
          Teste
          <select
            disabled={isTraining}
            onChange={(event) => onChange('testRatio', Number(event.target.value))}
            value={config.testRatio}
          >
            <option value={0.2}>80% treino / 20% teste</option>
            <option value={0.3}>70% treino / 30% teste</option>
          </select>
        </label>
      </div>

      <div className="iris-training-footer">
        <p className={`iris-training-status iris-training-status--${status.kind}`}>{status.message}</p>
        <button className="button button--primary" disabled={disabled || isTraining} onClick={onTrain} type="button">
          {isTraining ? <RefreshCw className="spin" size={18} /> : <Play size={18} />}
          {isTraining ? 'Treinando...' : hasResult ? 'Treinar novamente' : 'Treinar modelo'}
        </button>
      </div>
    </section>
  );
}
