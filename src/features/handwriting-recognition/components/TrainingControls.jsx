import { Play, Sparkles } from 'lucide-react';

export default function TrainingControls({ disabled, isTraining, modeConfig, onTrain, pretrainedModelStatus = 'idle' }) {
  const hasPretrainedModel =
    (modeConfig.id === 'digits' && ['loaded-tfjs', 'loaded-json'].includes(pretrainedModelStatus)) ||
    (modeConfig.id === 'all' && pretrainedModelStatus === 'loaded-alphanumeric-json');

  return (
    <article className="tool-panel training-controls">
      <div className="panel-heading">
        <div>
          <h3>Treinamento didático</h3>
          <p>Treina uma MLP TensorFlow.js com subconjunto sintético reduzido para demonstrar o fluxo.</p>
        </div>
        <Sparkles size={26} />
      </div>
      <button className="button button--primary" disabled={disabled || isTraining} onClick={onTrain} type="button">
        {isTraining ? <span className="button-spinner" /> : <Play size={18} />}
        {isTraining ? 'Treinando...' : `Treinar modo ${modeConfig.shortLabel}`}
      </button>
      <p className="quiet-note">
        Treino didático: usa uma base pequena/sintética para demonstrar o funcionamento da MLP no navegador.
        {modeConfig.id === 'digits' ? ' Modelo MNIST: usa pesos treinados previamente com a base real MNIST.' : ''}
        {modeConfig.id === 'all'
          ? ' Modelo alfanumérico: usa pesos treinados previamente com MNIST e EMNIST Letters.'
          : ''}
      </p>
      {hasPretrainedModel ? (
        <p className="quiet-note">
          Como o modelo pré-treinado está carregado, a predição prioriza esse modelo. O treino didático continua
          disponível para observar loss e acurácia no navegador.
        </p>
      ) : null}
    </article>
  );
}
