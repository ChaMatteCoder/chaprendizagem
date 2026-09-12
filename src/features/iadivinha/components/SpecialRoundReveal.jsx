import { useEffect, useRef } from 'react';
import ClassDoodle from './ClassDoodle.jsx';
import { classById } from '../data/classCatalog.js';
import { scheduleReveal, playUnlockSound } from '../lib/rareReveal.js';

export default function SpecialRoundReveal({ challenge, round, onComplete, audio }) {
  const soundPlayed = useRef(false);
  const item = classById(challenge.id);
  useEffect(() => {
    if (!soundPlayed.current) { soundPlayed.current = true; playUnlockSound(audio); }
    return scheduleReveal(() => onComplete(round), window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, [round, onComplete, audio]);
  return <section className="iad-rare-reveal" aria-label="Revelação da rodada rara">
    <p className="iad-sr-only" role="status" aria-live="polite" aria-atomic="true">Rodada rara! A Turma do “ÃO” chegou! {item.prompt}</p>
    <div className="iad-rare-card" style={{ '--iad-card-color': item.color }} aria-hidden="true">
      <span className="iad-rare-stamp">RODADA RARA!</span>
      <h1>A TURMA DO “ÃO” CHEGOU!</h1>
      <ClassDoodle kind={item.id} /><strong>{item.label}</strong>
      <p>Um rabisco especial foi desbloqueado</p>
      <p className="iad-rare-prompt">{item.prompt}</p>
      <svg className="iad-rare-flourish" viewBox="0 0 180 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="m18 17 31-2m82 0 31 2M90 3l4 9 11 4-11 4-4 9-4-9-11-4 11-4Z" /><path d="m59 9 3 4m56 0 3-4m-62 14 3-3m56 0 3 3" /></svg>
    </div>
  </section>;
}
