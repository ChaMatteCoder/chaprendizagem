import { useEffect, useRef, useState } from 'react';
import { getRemainingSeconds } from '../lib/drawingImage.js';
import { ROUND_DURATION_MS } from '../lib/gameReducer.js';

export default function GameTimer({ deadline, onExpire }) {
  const progressRef = useRef(null);
  const [seconds, setSeconds] = useState(10);
  useEffect(() => {
    let expired = false;
    function tick() {
      const now = performance.now();
      const remaining = getRemainingSeconds(deadline, now);
      // The visual track follows the same absolute deadline, never a CSS clock.
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, (deadline - now) / ROUND_DURATION_MS))})`;
      setSeconds(remaining);
      if (!remaining && !expired) { expired = true; onExpire(); }
    }
    tick();
    const interval = window.setInterval(tick, 100);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', tick); };
  }, [deadline, onExpire]);
  return <>
    <span className={`iad-timer ${seconds <= 3 ? 'iad-timer-urgent' : ''}`} role="timer" aria-label={`${seconds} ${seconds === 1 ? 'segundo restante' : 'segundos restantes'}`}><span>{String(seconds).padStart(2, '0')}</span><span className="iad-timer-track" aria-hidden="true"><span ref={progressRef} /></span></span>
    <span className="iad-sr-only" role="status" aria-atomic="true">{seconds === 0 ? 'Tempo esgotado.' : seconds <= 3 ? 'Restam três segundos ou menos.' : 'Você tem dez segundos para desenhar.'}</span>
  </>;
}
