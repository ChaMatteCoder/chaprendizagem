import { useState } from 'react';
import { CircleStop, Play, Settings2 } from 'lucide-react';
import { validateTrainingConfig } from '../lib/model/createSonarModel.js';

const statusText = { idle: 'Aguardando seu primeiro experimento.', loading: 'Carregando o motor de treinamento…', training: 'Treinando a rede…', completed: 'Treinamento concluído. Modelo experimental disponível.', cancelled: 'Treinamento cancelado. Pesos parciais descartados.', error: 'O treinamento encontrou um erro.' };

export function TrainingPanel({ training, onTrain, onCancel, fields, onFields }) {
  const [error, setError] = useState(null);
  const busy = ['loading', 'training'].includes(training.status);
  function change(key, value) {
    onFields({ ...fields, [key]: value });
  }
  async function start(event) {
    event.preventDefault(); if (busy) return;
    try {
      const config = validateTrainingConfig({ hiddenUnits: fields.layers === '2' ? [Number(fields.first), Number(fields.second)] : [Number(fields.first)],
        learningRate: Number(fields.learningRate), epochs: Number(fields.epochs), seed: Number(fields.seed), batchSize: 16 });
      setError(null); await onTrain(config);
    } catch (failure) { setError(failure.message); }
  }
  return <article className="sonarlab-panel"><div className="sonarlab-panel-heading"><h2><Settings2 /> Configuração da MLP</h2><span className="sonarlab-badge">Experimento</span></div>
    <form onSubmit={start}>
      <fieldset disabled={busy} className="sonarlab-fields"><legend className="sonarlab-sr">Parâmetros experimentais</legend>
        <label>Camadas ocultas<select value={fields.layers} onChange={event => change('layers', event.target.value)}><option value="1">1 camada</option><option value="2">2 camadas</option></select></label>
        <div className="sonarlab-field-pair"><label>Neurônios · camada 1<input type="number" min="1" max="64" step="1" required value={fields.first} onChange={event => change('first', event.target.value)} /></label>
          {fields.layers === '2' && <label>Neurônios · camada 2<input type="number" min="1" max="64" step="1" required value={fields.second} onChange={event => change('second', event.target.value)} /></label>}</div>
        <div className="sonarlab-field-pair"><label>Taxa de aprendizado<input type="number" min="0.00001" max="0.1" step="any" required value={fields.learningRate} onChange={event => change('learningRate', event.target.value)} /></label>
          <label>Épocas<input type="number" min="1" max="500" step="1" required value={fields.epochs} onChange={event => change('epochs', event.target.value)} /></label></div>
        <label>Seed<input type="number" min="0" max="4294967295" step="1" required value={fields.seed} onChange={event => change('seed', event.target.value)} /></label>
      </fieldset>
      <p className="sonarlab-fixed">ReLU · Softmax (R, M) · Cross-entropy · Adam · Batch 16</p>
      <div className="sonarlab-action-row"><button className="sonarlab-button is-yellow" type="submit" disabled={busy}><Play size={19} /> {busy ? 'Treinando…' : 'Treinar rede'}</button>
        {busy && <button className="sonarlab-button is-outline" type="button" disabled={training.cancelRequested} onClick={onCancel}><CircleStop size={18} /> Cancelar</button>}</div>
    </form>
    <div className="sonarlab-status" role="status" aria-live="polite"><strong>{training.cancelRequested && busy ? 'Cancelando após o lote atual…' : statusText[training.status]}</strong>
      {!!training.history.length && <span>Época {training.history.length} de {training.settings.epochs}</span>}</div>
    {busy && <progress aria-label="Progresso do treinamento" value={training.history.length} max={training.settings.epochs} />}
    {(error || training.error) && <p role="alert" className="sonarlab-error">{error || training.error}</p>}
    <p className="sonarlab-caption">133 exemplos de treino · 33 de validação. Apenas desenvolvimento; o oficial permanece congelado.</p>
  </article>;
}

export function NetworkFlow({ hiddenUnits }) {
  const widths = hiddenUnits.every(n => Number.isInteger(n) && n >= 1 && n <= 64) ? hiddenUnits : [16];
  const layers = [60, ...widths, 2];
  return <article className="sonarlab-panel"><h2><Settings2 /> Fluxo da rede</h2>
    <div className="sonarlab-network" aria-label={`Arquitetura candidata ${layers.join(' para ')}`}>
      {layers.map((width, index) => <div className={`sonarlab-layer ${index === 0 ? 'is-input' : index === layers.length - 1 ? 'is-output' : ''}`} key={index}>
        <strong>{index === 0 ? 'Entrada' : index === layers.length - 1 ? 'Saída' : 'Oculta'} · {width}</strong>
        <div className="sonarlab-nodes" aria-hidden="true">{Array.from({ length: Math.min(4, width) }, (_, n) => <i key={n} />)}{width > 4 && <span>⋮</span>}</div>
        <span>{index === 0 ? 'Vetor do sonar' : index === layers.length - 1 ? 'Rocha / Metal' : 'Camada densa'}</span>
        <small>{index === 0 ? '60 dimensões' : index === layers.length - 1 ? 'Softmax' : 'ReLU'}</small>
      </div>)}
    </div><p className="sonarlab-caption">Arquitetura do formulário. A inspeção usa o modelo indicado no seletor.</p>
  </article>;
}
