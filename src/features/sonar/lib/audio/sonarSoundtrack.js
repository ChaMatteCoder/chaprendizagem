export const SONAR_TRACKS = {
  menu: { src: '/audio/sonar/menu.mp3', title: 'Maré de Curiosidade' },
  gameplay: { src: '/audio/sonar/gameplay.mp3', title: 'Eco ou Engano' },
  lab: { src: '/audio/sonar/lab.mp3', title: 'Pensamentos Submersos' },
};

export function sonarTrackForPath(path) {
  if (/^\/sonar\/lab(?:\/|$)/.test(path)) return 'lab';
  if (/^\/sonar\/missao(?:\/|$)/.test(path)) return 'gameplay';
  return 'menu';
}

export function attachSonarAudioGestures(target, music) {
  const activate = event => {
    if (!event.target?.closest?.('[data-sonar-sound-toggle]')) music.activate();
  };
  const events = ['pointerup', 'touchend', 'click', 'keydown'];
  const options = { capture: true, passive: true };
  events.forEach(name => target.addEventListener(name, activate, options));
  return () => events.forEach(name => target.removeEventListener(name, activate, options));
}

/** One audio element for all Sonar routes; mute survives route and section changes. */
export function createSonarSoundtrack(audio, notify = () => {}) {
  let track = null, muted = false, blocked = false, failed = false, playing = false;
  let disposed = false, pending = false, request = 0;
  audio.preload = 'none'; audio.volume = 0.3; audio.muted = false; audio.loop = true;
  const report = () => { if (!disposed) notify({ track, muted, blocked, failed, playing }); };
  function play(fromGesture = false) {
    if (disposed || muted || !track || (pending && !fromGesture)) return;
    const token = ++request;
    blocked = false; failed = false; pending = true;
    function reject(error) {
      if (disposed || token !== request) return;
      pending = false; playing = false;
      blocked = error?.name === 'NotAllowedError';
      failed = !blocked && error?.name !== 'AbortError';
      report();
    }
    try {
      Promise.resolve(audio.play()).then(() => {
        if (disposed || token !== request) return;
        pending = false; playing = true; report();
      }, reject);
    } catch (error) { reject(error); }
    report();
  }
  const onError = () => {
    if (disposed || !track) return;
    request++; pending = false; playing = false; failed = true; blocked = false; report();
  };
  audio.addEventListener('error', onError);
  report();
  return {
    get muted() { return muted; },
    setPath(path) {
      const next = sonarTrackForPath(path);
      if (disposed || next === track) return;
      request++; pending = false; playing = false;
      audio.pause(); track = next; audio.src = SONAR_TRACKS[next].src; audio.currentTime = 0;
      blocked = false; failed = false;
      if (!muted) play();
      report();
    },
    activate() {
      // Retry inside the first touch even if an autoplay promise is still pending.
      if (!playing || blocked || failed || audio.paused) play(true);
    },
    toggle() {
      if (disposed) return;
      if (!muted && (blocked || failed || !playing)) { play(true); return; }
      muted = !muted; audio.muted = muted;
      if (muted) { request++; pending = false; playing = false; audio.pause(); }
      else play(true);
      report();
    },
    dispose() {
      if (disposed) return;
      disposed = true; request++; audio.pause();
      audio.removeEventListener('error', onError); audio.removeAttribute('src'); audio.load();
    },
  };
}
