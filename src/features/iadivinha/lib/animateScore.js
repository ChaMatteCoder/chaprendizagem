// Presentation only: never feeds the game score back into state.
export function animateScore(value, render, { requestFrame, cancelFrame, duration = 650 }) {
  let frame;
  let start;
  let stopped = false;
  function tick(now) {
    if (stopped) return;
    start ??= now;
    const progress = Math.min(1, Math.max(0, (now - start) / duration));
    render(Math.round(value * (1 - (1 - progress) ** 3)));
    if (progress < 1) frame = requestFrame(tick);
  }
  frame = requestFrame(tick);
  return () => { stopped = true; cancelFrame(frame); };
}
