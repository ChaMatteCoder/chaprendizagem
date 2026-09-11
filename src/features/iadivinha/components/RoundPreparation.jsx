import ClassDoodle from './ClassDoodle.jsx';
import { classById, isSpecial } from '../data/classCatalog.js';

export default function RoundPreparation({ state, onBegin }) {
  const challenge = state.sequence[state.round];
  return <div className="iad-preparation">
    <p className="iad-round-label">RODADA {state.round + 1} DE 6 <span>· {state.score} PTS</span></p>
    <h1 className="iad-game-title">{isSpecial(challenge) ? 'UM RABISCO SURPRESA!' : classById(challenge.id).prompt}</h1>
    <div className={`iad-preparation-doodle iad-${challenge.id}`}>{isSpecial(challenge) ? <span className="iad-mystery" aria-hidden="true">?</span> : <ClassDoodle kind={challenge.id} />}</div>
    <p>Você tem <strong>10 segundos</strong>. Pronto para rabiscar?</p>
    <button className="iad-primary iad-game-cta" type="button" onClick={onBegin}>VAMOS LÁ!</button>
    <p className="iad-small-print">{isSpecial(challenge) ? 'O tempo começa após a revelação da surpresa.' : 'O tempo começa ao ativar “Vamos lá!”.'} Use mouse, toque ou caneta. No teclado: Tab até a folha, setas movem e Espaço inicia ou encerra um traço. Shift + seta move mais rápido.</p>
  </div>;
}
