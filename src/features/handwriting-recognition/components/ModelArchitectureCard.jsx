import { ArrowRight, Network } from 'lucide-react';

function getActiveModelLabel(activeModelType) {
  if (activeModelType === 'mnist-tfjs') return 'MNIST pré-treinado TensorFlow.js';
  if (activeModelType === 'mnist-json') return 'MNIST pré-treinado por pesos JSON';
  if (activeModelType === 'alphanumeric-json') return 'Alfanumérico por pesos JSON';
  if (activeModelType === 'didactic') return 'MLP didática local';
  return 'Nenhum modelo treinado ainda';
}

function getLayers(modeConfig) {
  const allClasses = modeConfig.id === 'all';

  return [
    { label: 'Entrada', value: '784 pixels' },
    { label: 'Oculta 1', value: `${allClasses ? 256 : 128} · ReLU` },
    { label: 'Oculta 2', value: `${allClasses ? 128 : 64} · ReLU` },
    { label: 'Saída', value: `${modeConfig.outputNeurons} · Softmax` },
  ];
}

export default function ModelArchitectureCard({ activeModelType = 'none', pretrainedModelStatus = 'idle', modeConfig }) {
  const layers = getLayers(modeConfig);
  const isDigits = modeConfig.id === 'digits';
  const isAll = modeConfig.id === 'all';

  return (
    <article className="tool-panel architecture-card">
      <div className="support-card-heading">
        <span className="support-card-step">1</span>
        <div>
          <small>Arquitetura</small>
          <h3>Como a MLP está organizada</h3>
          <p>{modeConfig.dataset}: {modeConfig.outputNeurons} classes possíveis na saída.</p>
        </div>
        <Network size={25} />
      </div>
      <div className="architecture-flow" aria-label="Camadas da rede neural">
        {layers.map((layer, index) => (
          <div className="architecture-flow__item" key={layer.label}>
            <div className="architecture-layer">
              <small>{layer.label}</small>
              <strong>{layer.value}</strong>
            </div>
            {index < layers.length - 1 ? <ArrowRight className="architecture-flow__arrow" size={17} /> : null}
          </div>
        ))}
      </div>
      <p className="architecture-explainer">
        As camadas ocultas combinam os 784 pixels; a Softmax converte a saída em probabilidades para cada classe.
      </p>
      <div className="model-status-card">
        <span>Modelo usado na predição</span>
        <strong>{getActiveModelLabel(activeModelType)}</strong>
        {isDigits && pretrainedModelStatus === 'loading' ? <p>Carregando modelo MNIST...</p> : null}
        {isAll && pretrainedModelStatus === 'loading' ? <p>Carregando modelo alfanumérico...</p> : null}
        {isDigits && ['loaded-tfjs', 'loaded-json'].includes(pretrainedModelStatus) ? (
          <p>Modelo treinado com imagens MNIST reais, priorizado para reconhecer os dígitos da lousa.</p>
        ) : null}
        {isAll && pretrainedModelStatus === 'loaded-alphanumeric-json' ? (
          <p>Modelo combinado com MNIST e EMNIST Letters para reconhecer números e letras.</p>
        ) : null}
        {isDigits && pretrainedModelStatus === 'missing' ? (
          <p>O modelo MNIST não foi encontrado. O treino didático abaixo continua disponível.</p>
        ) : null}
        {isAll && pretrainedModelStatus === 'missing-alphanumeric' ? (
          <p>O modelo alfanumérico não foi encontrado. O treino didático abaixo continua disponível.</p>
        ) : null}
      </div>
    </article>
  );
}
