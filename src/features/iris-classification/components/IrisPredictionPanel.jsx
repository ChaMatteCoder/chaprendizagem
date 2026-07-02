import setosaImage from '../assets/iris-setosa.png';
import versicolorImage from '../assets/iris-versicolor.png';
import virginicaImage from '../assets/iris-virginica.png';

const speciesVisuals = {
  'Iris-setosa': {
    alt: 'Representação visual de uma flor Iris-setosa prevista pela MLP.',
    image: setosaImage,
    label: 'Iris-setosa',
    tone: 'setosa',
  },
  'Iris-versicolor': {
    alt: 'Representação visual de uma flor Iris-versicolor prevista pela MLP.',
    image: versicolorImage,
    label: 'Iris-versicolor',
    tone: 'versicolor',
  },
  'Iris-virginica': {
    alt: 'Representação visual de uma flor Iris-virginica prevista pela MLP.',
    image: virginicaImage,
    label: 'Iris-virginica',
    tone: 'virginica',
  },
};

function percent(value) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${(safeValue * 100).toFixed(1)}%`;
}

function buildInterpretation(prediction) {
  if (!prediction) return '';

  if (prediction.confidence < 0.62) {
    return 'A confiança está moderada. Versicolor e Virginica podem apresentar sobreposição em algumas medidas, especialmente nas pétalas.';
  }

  if (prediction.predictedClass === 'Iris-setosa') {
    return 'A amostra possui pétalas curtas e estreitas, característica frequentemente associada à classe Setosa.';
  }

  if (prediction.predictedClass === 'Iris-versicolor') {
    return 'Essa espécie costuma ocupar uma região intermediária entre Setosa e Virginica, especialmente nas medidas de pétala.';
  }

  return 'As medidas de pétala mais longas e largas aproximam a amostra do grupo Virginica.';
}

export default function IrisPredictionPanel({ isTraining, isUpdating, prediction, status }) {
  if (isTraining) {
    return (
      <section className="iris-prediction-panel iris-prediction-panel--empty">
        <h3>Consultando a MLP...</h3>
        <p>O modelo está ajustando os pesos. A predição será atualizada quando o treinamento terminar.</p>
      </section>
    );
  }

  if (!prediction) {
    return (
      <section className="iris-prediction-panel iris-prediction-panel--empty">
        <h3>Predição da MLP</h3>
        <p>Modelo ainda não treinado. Treine a MLP com a base Iris para testar uma flor pelos quatro atributos.</p>
      </section>
    );
  }

  const speciesVisual = speciesVisuals[prediction.predictedClass];

  return (
    <section className="iris-prediction-panel" aria-labelledby="iris-prediction-title" aria-live="polite">
      <div className="iris-prediction-panel__header">
        <div>
          <h3 id="iris-prediction-title">Predição da MLP</h3>
          <p>{status?.message ?? 'Ajuste os atributos para testar uma nova amostra.'}</p>
        </div>
        {isUpdating ? <span className="iris-prediction-panel__updating">Calculando probabilidades...</span> : null}
      </div>

      {speciesVisual ? (
        <figure
          className={`iris-prediction-panel__visual iris-prediction-panel__visual--${speciesVisual.tone} ${isUpdating ? 'iris-prediction-panel__visual--updating' : ''}`}
          key={prediction.predictedClass}
        >
          <img alt={speciesVisual.alt} decoding="async" loading="lazy" src={speciesVisual.image} />
          <figcaption>
            <small>Espécie identificada</small>
            <strong>{speciesVisual.label}</strong>
          </figcaption>
        </figure>
      ) : null}

      <div className="iris-prediction-panel__summary">
        <div className="iris-prediction-panel__summary-card iris-prediction-panel__species">
          <small>Espécie prevista</small>
          <strong>{prediction.predictedClass}</strong>
        </div>
        <div className="iris-prediction-panel__summary-card iris-prediction-panel__confidence">
          <small>Confiança</small>
          <strong>{percent(prediction.confidence)}</strong>
        </div>
      </div>

      <p className="iris-prediction-panel__comment">
        A flor foi classificada como <strong>{prediction.predictedClass}</strong>. {buildInterpretation(prediction)}
      </p>

      <div className="iris-probability-list" aria-label="Probabilidades por espécie">
        {prediction.ranked.map((item) => (
          <div className="iris-probability-row" key={item.label}>
            <span className="iris-probability-row__label">{item.label}</span>
            <div className="iris-probability-row__track">
              <i className="iris-probability-row__fill" style={{ width: `${Math.max(item.probability * 100, 1.5)}%` }} />
            </div>
            <strong className="iris-probability-row__value">{percent(item.probability)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
