import { useCallback, useEffect, useRef, useState } from 'react';
import { attachSonarAudioGestures, createSonarSoundtrack, SONAR_TRACKS } from '../lib/audio/sonarSoundtrack.js';

export default function useSonarSound(pathname) {
  const [status, setStatus] = useState({ track: null, muted: false, playing: false, blocked: false, failed: false });
  const audioRef = useRef(null);
  const music = useRef(null);
  const audio = useRef(null);
  useEffect(() => {
    const current = createSonarSoundtrack(audioRef.current, setStatus);
    music.current = current;
    const detach = attachSonarAudioGestures(globalThis.document, current);
    return () => { detach(); current.dispose(); music.current = null; audio.current?.close(); audio.current = null; };
  }, []);
  useEffect(() => { music.current?.setPath(pathname); }, [pathname]);
  const ping = useCallback(async () => {
    if (status.muted || !status.playing) return;
    const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Audio) return;
    let context;
    try {
      audio.current ??= new Audio();
      context = audio.current;
      await context.resume();
      if (context.state !== 'running' || context !== audio.current || music.current?.muted) return;
    } catch { return; }
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, context.currentTime + 0.22);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(); oscillator.stop(context.currentTime + 0.25);
  }, [status.muted, status.playing]);
  const toggle = useCallback(() => {
    music.current?.toggle();
    if (music.current?.muted) audio.current?.suspend().catch(() => {});
  }, []);
  return { ...status, audioRef, enabled: !status.muted && status.playing, title: SONAR_TRACKS[status.track]?.title,
    error: status.failed ? 'Não foi possível tocar a música. Clique para tentar novamente.' : null, toggle, ping };
}
