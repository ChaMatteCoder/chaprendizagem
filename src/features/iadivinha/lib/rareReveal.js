export const revealDuration = reducedMotion => reducedMotion ? 700 : 2400;

export function scheduleReveal(callback, reducedMotion, timers = globalThis) {
  const timer = timers.setTimeout(callback, revealDuration(reducedMotion));
  return () => timers.clearTimeout(timer);
}

// Optional host audio adapter; no files, autoplay, or audio dependency in the game.
export function playUnlockSound(audio) {
  if (!audio?.enabled || audio.muted || !audio.userActivated) return;
  try { Promise.resolve(audio.playUnlock?.({ duckGameplay: true })).catch(() => {}); } catch { /* Sound must never block a round. */ }
}
