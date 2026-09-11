import { Check, X } from 'lucide-react';
import { isSpecial } from '../data/classCatalog.js';

export default function FinalScore({ state, onRestart, onHome, onPerformance }) {
  const correct = state.results.filter((result) => result.correct).length;
  return <div className="iad-final">
    <h1 className="iad-game-title">FIM DE JOGO!</h1>
    <p className="iad-final-score">{state.score} / 600 PTS</p>
    <p className="iad-result-subtitle">Você acertou <strong>{correct} de 6</strong> desenhos!</p>
    <ol className="iad-final-cards">
      {state.results.map((result, index) => <li key={index} className={isSpecial(result.challenge) ? 'iad-final-rare' : undefined}>
        {isSpecial(result.challenge) && <span className="iad-rare-badge">★ RARO</span>}
        {result.imageUrl ? <img src={result.imageUrl} alt={`Seu desenho de ${result.challenge.label}`} /> : <span className="iad-empty-thumbnail">Sem desenho</span>}
        <span>Rodada {index + 1}</span><strong>{result.challenge.label}</strong>
        <span className={`iad-outcome ${result.correct ? 'iad-outcome-correct' : ''}`} aria-label={result.correct ? 'Acerto: 100 pontos' : 'Sem acerto: zero pontos'}>{result.correct ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}</span>
      </li>)}
    </ol>
    <div className="iad-final-actions"><button className="iad-primary iad-game-cta" type="button" onClick={onRestart}>JOGAR NOVAMENTE</button><button className="iad-tool" type="button" onClick={onHome}>VOLTAR AO INÍCIO</button></div>
    <button className="iad-tool" type="button" onClick={onPerformance}>VER DESEMPENHO</button>
    <p>Nada mal para dez segundos de arte!</p>
    <p className="iad-small-print">Este placar conta os acertos da partida. Ele não mede sua habilidade artística.</p>
  </div>;
}
