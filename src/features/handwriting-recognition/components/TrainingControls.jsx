import { Cpu, Database, Play, RotateCw, Sparkles } from 'lucide-react';

export default function TrainingControls({ disabled, isTraining, modeConfig, onTrain, pretrainedModelStatus = 'idle' }) {
  const hasPretrainedModel =
    (modeConfig.id === 'digits' && ['loaded-tfjs', 'loaded-json'].includes(pretrainedModelStatus)) ||
    (modeConfig.id === 'all' && pretrainedModelStatus === 'loaded-alphanumeric-json');

  return (
    <article className="tool-panel training-controls">
      <div className="support-card-heading">
        <span className="support-card-step">2</span>
        <div>
          <small>Experimentação</small>
          <h3>Treinamento didático</h3>
          <p>Treine uma rede pequena no navegador e acompanhe loss e acurácia.</p>
        </div>
        <Sparkles size={25} />
      </div>

      <div className="training-facts" aria-label="Configuração do treinamento didático">
        <span><RotateCw size={17} /><strong>18</strong><small>épocas</small></span>
        <span><Database size={17} /><strong>Base</strong><small>sintética</small></span>
        <span><Cpu size={17} /><strong>Treino</strong><small>no navegador</small></span>
      </div>

      <div className={`training-guidance ${hasPretrainedModel ? 'training-guidance--optional' : ''}`}>
        <strong>{hasPretrainedModel ? 'Treinamento opcional' : 'Pronto para treinar'}</strong>
        <p>
          {hasPretrainedModel
            ? 'Um modelo pré-treinado já está ativo. Use este treino apenas para observar como a MLP aprende.'
            : `O modo ${modeConfig.shortLabel} usará uma amostra reduzida para demonstrar o aprendizado local.`}
        </p>
      </div>

      <button className="button button--primary training-action" disabled={disabled || isTraining} onClick={onTrain} type="button">
        {isTraining ? <span className="button-spinner" /> : <Play size={18} />}
        {isTraining ? 'Treinando a MLP...' : `Iniciar treino de ${modeConfig.shortLabel}`}
      </button>
      <p className="quiet-note training-footnote">Nada é enviado para um servidor: o experimento acontece neste navegador.</p>
    </article>
  );
}
