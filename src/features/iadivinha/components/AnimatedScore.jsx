import { useEffect, useRef } from 'react';
import { animateScore } from '../lib/animateScore.js';

export default function AnimatedScore({ value }) {
  const numberRef = useRef(null);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const render = number => { if (numberRef.current) numberRef.current.textContent = String(number); };
    let stop = () => {};
    const finish = () => { stop(); render(value); };
    const onVisibility = () => { if (document.hidden) finish(); };
    if (!preference.matches && !document.hidden) {
      stop = animateScore(value, render, {
        requestFrame: callback => window.requestAnimationFrame(callback),
        cancelFrame: frame => window.cancelAnimationFrame(frame),
      });
    }
    preference.addEventListener('change', finish);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      preference.removeEventListener('change', finish);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [value]);
  return <><span className="iad-score-number" style={{ width: `${String(value).length}ch` }} aria-hidden="true" ref={numberRef}>{value}</span><span className="iad-sr-only">{value}</span></>;
}
