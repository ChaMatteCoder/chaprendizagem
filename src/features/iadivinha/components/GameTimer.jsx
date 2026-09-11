import { useEffect, useState } from 'react';
import { getRemainingSeconds } from '../lib/drawingImage.js';

export default function GameTimer({ deadline, onExpire }) {
  const [seconds, setSeconds] = useState(10);
  useEffect(() => {
    let expired = false;
    function tick() {
      const remaining = getRemainingSeconds(deadline, performance.now());
      setSeconds(remaining);
      if (!remaining && !expired) { expired = true; onExpire(); }
    }
    tick();
    const interval = window.setInterval(tick, 100);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', tick); };
  }, [deadline, onExpire]);
  return <>
    <span className={`iad-timer ${seconds <= 3 ? 'iad-timer-urgent' : ''}`} role="timer" aria-label={`${seconds} ${seconds === 1 ? 'segundo restante' : 'segundos restantes'}`}>{String(seconds).padStart(2, '0')}</span>
    <span className="iad-sr-only" role="status" aria-atomic="true">{seconds === 0 ? 'Tempo esgotado.' : seconds <= 3 ? 'Restam três segundos ou menos.' : 'Você tem dez segundos para desenhar.'}</span>
  </>;
}
