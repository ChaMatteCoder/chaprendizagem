import { Check, X } from 'lucide-react';
import { isSpecial } from '../data/classCatalog.js';
import AnimatedScore from './AnimatedScore.jsx';
import ClassDoodle from './ClassDoodle.jsx';

export default function FinalScore({ state, onRestart, onHome, onPerformance }) {
  const correct = state.results.filter((result) => result.correct).length;
  return <div className="iad-final">
    <h1 className="iad-game-title">FIM DE JOGO!</h1>
    <p className="iad-final-score"><AnimatedScore value={state.score} /> / 600 PTS</p>
    <p className="iad-result-subtitle">Você acertou <strong>{correct} de 6</strong> desenhos!</p>
    <ol className="iad-final-cards">
      {state.results.map((result, index) => <li key={index} style={{ '--iad-entry-delay': `${index * 80}ms` }} className={isSpecial(result.challenge) ? 'iad-final-rare' : undefined}>
        {isSpecial(result.challenge) && <span className="iad-rare-badge">★ RARO</span>}
        {result.imageUrl ? <img src={result.imageUrl} alt={`Seu desenho de ${result.challenge.label}`} /> : <span className="iad-empty-thumbnail">Sem desenho</span>}
        <span>Rodada {index + 1}</span><strong className="iad-final-label">{isSpecial(result.challenge) && <ClassDoodle kind={result.challenge.id} />}{result.challenge.label}</strong>
        <span className={`iad-outcome ${result.correct ? 'iad-outcome-correct' : ''}`} aria-label={`${result.correct ? 'Acerto' : 'Sem acerto'}: ${result.points} pontos`}>{result.correct ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}</span>
        <span className="iad-round-points">+{result.points} PTS</span>
      </li>)}
    </ol>
    <div className="iad-final-actions"><button className="iad-primary iad-game-cta" type="button" onClick={onRestart}>JOGAR NOVAMENTE</button><button className="iad-tool" type="button" onClick={onHome}>VOLTAR AO INÍCIO</button></div>
    <button className="iad-tool" type="button" onClick={onPerformance}>VER DESEMPENHO</button>
    <p>Nada mal para dez segundos de arte!</p>
    <p className="iad-small-print">Nos acertos, a confiança da IA vira pontos arredondados. O placar não mede sua habilidade artística.</p>
  </div>;
}
