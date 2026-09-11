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
      <span className="iad-rare-confetti">✦ · ✧ · ✦</span>
    </div>
  </section>;
}
