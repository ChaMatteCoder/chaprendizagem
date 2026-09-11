import ProbabilityBars from './ProbabilityBars.jsx';
import { isSpecial } from '../data/classCatalog.js';

export default function PredictionResult({ result, lastRound, onNext }) {
  return <div className="iad-result">
    {isSpecial(result.challenge) && <span className="iad-rare-badge">RARO</span>}
    <h1 className="iad-game-title">{result.empty ? 'CADÊ O RABISCO?' : result.correct ? 'ACERTOU!' : 'QUASE!'}</h1>
    <p className="iad-result-subtitle">{result.empty ? 'O tempo acabou sem desenho.' : <>
      {!result.correct && <>O desafio era <strong>{result.challenge.label.toUpperCase()}</strong><br /></>}
      O palpite foi <strong>{result.prediction.label.toUpperCase()}</strong>
    </>}</p>
    <div className="iad-result-grid">
      <div className="iad-result-image">{result.imageUrl ? <img src={result.imageUrl} alt={`Seu desenho na rodada de ${result.challenge.label}`} /> : <p>Uma folha em branco.<br />Na próxima, solte o traço!</p>}</div>
      <div className="iad-result-details">
        {result.prediction ? <>
          <p className="iad-confidence">{Math.round(result.prediction.confidence * 100)}% de confiança</p>
          <ProbabilityBars probabilities={result.prediction.probabilities} />
          <p className="iad-small-print">{result.prediction.simulated ? 'Palpite simulado para validar a interface; não mede reconhecimento.' : `Inferência local: ${result.prediction.inferenceMs.toFixed(1)} ms. A confiança é um palpite, não uma certeza.`}</p>
        </> : <p>Nenhuma imagem foi enviada ao classificador. Esta rodada vale zero pontos.</p>}
        <strong className="iad-points">+{result.points} PTS</strong>
      </div>
    </div>
    <button className="iad-primary iad-game-cta" type="button" onClick={onNext}>{lastRound ? 'VER PLACAR FINAL' : 'PRÓXIMA RODADA'}</button>
  </div>;
}
