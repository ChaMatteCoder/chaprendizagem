import { CIFAR10_CLASSES } from '../data/cifar10Schema.js';
import { formatPixelNumber } from '../lib/cnnMath.js';

export default function PixelPrediction({
  prediction,
  title = 'Palpite da CNN',
  trueIndex = null,
  compact = false,
}) {
  if (!prediction) return null;
  return (
    <div className={`pixel-prediction${compact ? ' is-compact' : ''}`}>
      <div className="pixel-prediction__headline">
        <div>
          <small>{title}</small>
          <strong>{prediction.winnerClass.pt}</strong>
        </div>
        <div>
          <strong>
            {formatPixelNumber(prediction.confidence * 100, 1)}
            <small>%</small>
          </strong>
          <span>
            {trueIndex === null
              ? 'confiança'
              : prediction.winnerIndex === trueIndex
                ? 'Acertou'
                : 'Errou'}
          </span>
        </div>
      </div>
      {!compact && (
        <div className="pixel-pred-top3">
          {prediction.top3.map((item) => (
            <div className="pixel-top3-item" key={item.id}>
              <div>
                <span>{item.pt}</span>
                <span>{formatPixelNumber(item.probability * 100, 1)}%</span>
              </div>
              <div className="pixel-prob-row__track">
                <span style={{ width: `${item.probability * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {!compact && (
        <details className="pixel-details is-subtle">
          <summary>Ver as 10 probabilidades</summary>
          <div className="pixel-mini-probs">
            {CIFAR10_CLASSES.map((cls) => (
              <div key={cls.id}>
                <span>{cls.pt}</span>
                <strong>
                  {formatPixelNumber(
                    prediction.probabilities[cls.index] * 100,
                    1,
                  )}
                  %
                </strong>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
