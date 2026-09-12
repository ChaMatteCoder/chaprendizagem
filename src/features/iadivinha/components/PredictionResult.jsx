import ProbabilityBars from './ProbabilityBars.jsx';
import { isSpecial } from '../data/classCatalog.js';
import { formatConfidence } from '../lib/confidence.js';

export default function PredictionResult({ result, lastRound, onNext }) {
  return <div className={`iad-result iad-result--${result.correct ? "correct" : result.empty ? "empty" : "miss"}`}>
    {result.correct && <div className="iad-confetti" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ "--iad-confetti-index": i }} />)}</div>}
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
          <p className="iad-confidence">{formatConfidence(result.prediction.confidence)} de confiança</p>
          <ProbabilityBars probabilities={result.prediction.probabilities} />
          <p className="iad-small-print">{result.prediction.simulated ? 'Palpite simulado para validar a interface; não mede reconhecimento.' : 'A confiança mostra o quanto a IA apostou nesse palpite. Ela também pode se enganar!'}</p>
        </> : <p>Dessa vez não deu tempo. Na próxima, vale até um rabisco!</p>}
        <strong className="iad-points">+{result.points} PTS</strong>
        {result.prediction && <p className="iad-scoring-note">{result.correct ? 'Mais confiança no acerto, mais pontos para você!' : 'A IA pensou em outra figura. Sem pontos desta vez, mas a arte valeu!'}</p>}
      </div>
    </div>
    <button className="iad-primary iad-game-cta" type="button" onClick={onNext}>{lastRound ? 'VER PLACAR FINAL' : 'PRÓXIMA RODADA'}</button>
  </div>;
}
