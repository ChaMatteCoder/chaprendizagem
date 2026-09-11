export const MUSIC_TRACKS = { menu: '/audio/iadivinha/menu.mp3', gameplay: '/audio/iadivinha/gameplay.mp3', finale: '/audio/iadivinha/finale.mp3' };
export const musicForPhase = phase => phase === 'home' ? 'menu' : phase === 'finished' ? 'finale' : 'gameplay';

export function createSoundtrack(audio, _storage, notify = () => {}) {
  // A new visit starts with sound enabled; mute lasts for this mounted game.
  let muted = false, activated = false, disposed = false, track, failed = false, blocked = false, ended = false, pending = false, request = 0;
  audio.muted = false;
  audio.preload = 'none';
  audio.volume = 0.35;
  const report = () => { if (!disposed) notify({ muted, activated, failed, blocked }); };
  function play() {
    if (disposed || muted || !track || ended || pending) return;
    const token = ++request;
    failed = false; blocked = false; pending = true;
    function reject(error) {
      if (disposed || token !== request) return;
      pending = false;
      if (error?.name === 'NotAllowedError') blocked = true;
      else if (error?.name !== 'AbortError') failed = true;
      report();
    }
    try {
      Promise.resolve(audio.play()).then(() => {
        if (disposed || token !== request) return;
        pending = false; activated = true; report();
      }, reject);
    } catch (error) { reject(error); }
    report();
  }
  const onError = () => { failed = true; pending = false; report(); };
  const onEnded = () => { if (track === 'finale') ended = true; };
  audio.addEventListener('error', onError);
  audio.addEventListener('ended', onEnded);
  report();
  return {
    setPhase(phase) {
      const next = musicForPhase(phase);
      if (disposed || next === track) return;
      request++; pending = false;
      audio.pause(); track = next; ended = false;
      audio.loop = next !== 'finale'; audio.src = MUSIC_TRACKS[next];
      audio.currentTime = 0;
      failed = false; play(); report();
    },
    activate() { if (!activated || blocked || failed) play(); },
    toggle() {
      if (disposed) return;
      if (blocked || failed) muted = false; else muted = !muted;
      audio.muted = muted;
      if (muted) { request++; pending = false; audio.pause(); } else play();
      report();
    },
    dispose() {
      disposed = true; request++; audio.pause();
      audio.removeEventListener('error', onError); audio.removeEventListener('ended', onEnded);
      audio.removeAttribute('src'); audio.load();
    },
  };
}
