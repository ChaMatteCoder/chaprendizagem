import { BadgeCheck, HelpCircle } from 'lucide-react';
import ProbabilityBars from './ProbabilityBars.jsx';

function formatPercent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '0.0%';
}

function getModelLabel(activeModelType) {
  if (activeModelType === 'mnist-tfjs') return 'MNIST pré-treinado TensorFlow.js';
  if (activeModelType === 'mnist-json') return 'MNIST pré-treinado por pesos JSON';
  if (activeModelType === 'alphanumeric-json') return 'MNIST + EMNIST por pesos JSON';
  if (activeModelType === 'didactic') return 'MLP didática local';
  return 'Nenhum modelo ativo';
}

function getNarrative(prediction) {
  if (!prediction) {
    return 'Desenhe um caractere ou envie uma imagem para ver a distribuição de probabilidades da MLP.';
  }

  if (prediction.confidence >= 0.8) {
    return 'A rede encontrou um padrão bem definido para esta classe.';
  }

  if (prediction.confidence >= 0.5) {
    return 'A previsão é plausível, mas existem classes visualmente parecidas competindo.';
  }

  return 'A confiança está baixa. Tente centralizar o caractere ou usar um traço mais firme.';
}

function getModeHint(activeModelType, topThree) {
  if (activeModelType !== 'alphanumeric-json' || topThree.length < 2) return null;

  return 'No modo Todos, letras e números parecidos podem competir entre si, como 8/B, 0/O, 1/I, 5/S e 2/Z.';
}

function sanitizeRanked(prediction) {
  if (!prediction?.ranked?.length) return [];

  return [...prediction.ranked]
    .map((item) => ({
      label: String(item.label ?? '?'),
      probability: Number.isFinite(item.probability) ? item.probability : 0,
    }))
    .sort((a, b) => b.probability - a.probability);
}

export default function PredictionResultCard({ activeModelType = 'none', prediction }) {
  const ranked = sanitizeRanked(prediction);
  const topThree = ranked.slice(0, 3);
  const modelLabel = getModelLabel(activeModelType);
  const narrative = getNarrative(prediction);
  const modeHint = getModeHint(activeModelType, topThree);
  const predictedLabel = prediction?.label ?? topThree[0]?.label ?? '?';
  const confidence = Number.isFinite(prediction?.confidence) ? prediction.confidence : topThree[0]?.probability;

  if (!prediction) {
    return (
      <article className="result-panel prediction-card prediction-card--empty">
        <div className="prediction-card__header">
          <div>
            <h3>Predição da MLP</h3>
            <p>{modelLabel}</p>
          </div>
          <HelpCircle size={26} />
        </div>
        <div className="prediction-empty-state">
          <strong>Nenhuma predição ainda.</strong>
          <p>{narrative}</p>
        </div>
        <ProbabilityBars probabilities={[]} />
      </article>
    );
  }

  return (
    <article className="result-panel prediction-card">
      <div className="prediction-card__header">
        <div>
          <h3>Predição da MLP</h3>
          <p>{modelLabel}</p>
        </div>
        <BadgeCheck size={26} />
      </div>

      <div className="prediction-card__summary">
        <div className="prediction-card__class">
          <small>Classe prevista</small>
          <strong>{predictedLabel}</strong>
        </div>
        <div className="prediction-card__confidence">
          <small>Confiança</small>
          <strong>{formatPercent(confidence)}</strong>
          <span>{modelLabel}</span>
        </div>
      </div>

      <p className="prediction-card__narrative">
        A rede classificou o caractere como <strong>{predictedLabel}</strong> com maior probabilidade. {narrative}
      </p>
      {modeHint ? <p className="prediction-card__hint">{modeHint}</p> : null}

      <div className="prediction-card__details">
        <section className="prediction-card__top-list" aria-labelledby="prediction-top-title">
          <h4 id="prediction-top-title">Top 3 palpites</h4>
          <ol>
            {topThree.map((item, index) => (
              <li className={index === 0 ? 'is-best' : ''} key={`${item.label}-${index}`}>
                <span className="prediction-card__rank">{index + 1}</span>
                <strong>{item.label}</strong>
                <span>{formatPercent(item.probability)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="prediction-card__probabilities" aria-labelledby="prediction-probabilities-title">
          <h4 id="prediction-probabilities-title">Distribuição de probabilidades</h4>
          <ProbabilityBars probabilities={prediction.probabilities ?? ranked} />
        </section>
      </div>
    </article>
  );
}
