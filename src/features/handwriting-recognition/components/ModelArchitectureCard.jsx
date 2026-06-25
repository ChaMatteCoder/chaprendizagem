import { Network } from 'lucide-react';

function getActiveModelLabel(activeModelType) {
  if (activeModelType === 'mnist-tfjs') return 'Modelo ativo: MNIST pré-treinado TensorFlow.js';
  if (activeModelType === 'mnist-json') return 'Modelo ativo: MNIST pré-treinado por pesos JSON';
  if (activeModelType === 'alphanumeric-json') return 'Modelo ativo: alfanumérico por pesos JSON';
  if (activeModelType === 'didactic') return 'Modelo ativo: MLP didática local';
  return 'Modelo ativo: nenhum modelo treinado ainda';
}

function getLayers(modeConfig) {
  if (modeConfig.id === 'all') {
    return ['784 entradas', '256 ReLU', '128 ReLU', '36 softmax'];
  }

  return ['784 entradas', '128 ReLU', '64 ReLU', `${modeConfig.outputNeurons} softmax`];
}

export default function ModelArchitectureCard({ activeModelType = 'none', pretrainedModelStatus = 'idle', modeConfig }) {
  const layers = getLayers(modeConfig);
  const isDigits = modeConfig.id === 'digits';
  const isAll = modeConfig.id === 'all';

  return (
    <article className="tool-panel architecture-card">
      <div className="panel-heading">
        <div>
          <h3>Arquitetura da MLP</h3>
          <p>{modeConfig.dataset}: {modeConfig.outputNeurons} neurônios na camada de saída.</p>
        </div>
        <Network size={28} />
      </div>
      <div className="architecture-flow">
        {layers.map((layer, index) => (
          <span key={layer}>
            {layer}
            {index < layers.length - 1 ? <i>{'->'}</i> : null}
          </span>
        ))}
      </div>
      <p>
        As camadas densas aprendem combinações dos 784 pixels. A softmax transforma a saída final em probabilidades por
        classe.
      </p>
      <div className="model-status-card">
        <strong>{getActiveModelLabel(activeModelType)}</strong>
        {isDigits && pretrainedModelStatus === 'loading' ? <p>Carregando modelo MNIST...</p> : null}
        {isAll && pretrainedModelStatus === 'loading' ? <p>Carregando modelo alfanumérico...</p> : null}
        {isDigits && ['loaded-tfjs', 'loaded-json'].includes(pretrainedModelStatus) ? (
          <p>
            O modelo MNIST pré-treinado foi treinado em milhares de imagens 28×28 de dígitos manuscritos. Ele tende a
            reconhecer melhor números desenhados na lousa do que o modelo didático sintético.
          </p>
        ) : null}
        {isAll && pretrainedModelStatus === 'loaded-alphanumeric-json' ? (
          <p>
            O modelo alfanumérico combina MNIST e EMNIST Letters para classificar 36 classes: números de 0 a 9 e letras de
            A a Z.
          </p>
        ) : null}
        {isDigits && pretrainedModelStatus === 'loaded-json' ? (
          <p>Este modelo foi reconstruído no navegador a partir de public/models/digits/mnist_mlp_weights.json.</p>
        ) : null}
        {isAll && pretrainedModelStatus === 'loaded-alphanumeric-json' ? (
          <p>Este modelo foi reconstruído no navegador a partir de public/models/alphanumeric/alphanumeric_mlp_weights.json.</p>
        ) : null}
        {isDigits && pretrainedModelStatus === 'missing' ? (
          <p>
            Modelo MNIST ainda não encontrado. Você pode treinar e converter o modelo seguindo as instruções em
            training/README.md.
          </p>
        ) : null}
        {isAll && pretrainedModelStatus === 'missing-alphanumeric' ? (
          <p>Modelo alfanumérico ainda não encontrado. Treine e exporte os pesos seguindo o README de treinamento.</p>
        ) : null}
      </div>
    </article>
  );
}
