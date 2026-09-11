import { useEffect, useRef, useState } from 'react';
import { createSoundtrack } from '../lib/soundtrack.js';

export default function useSoundtrack(phase) {
  const audioRef = useRef(null);
  const controller = useRef(null);
  const [status, setStatus] = useState({ muted: false, activated: false, failed: false });
  useEffect(() => {
    const music = createSoundtrack(audioRef.current, null, setStatus);
    controller.current = music;
    const activate = event => {
      if (!event.target.closest?.('[data-music-toggle]')) music.activate();
    };
    document.addEventListener('pointerdown', activate);
    document.addEventListener('click', activate);
    document.addEventListener('keydown', activate);
    return () => {
      document.removeEventListener('pointerdown', activate);
      document.removeEventListener('click', activate);
      document.removeEventListener('keydown', activate);
      music.dispose(); controller.current = null;
    };
  }, []);
  useEffect(() => { controller.current?.setPhase(phase); }, [phase]);
  return { audioRef, ...status, toggle: () => controller.current?.toggle() };
}
