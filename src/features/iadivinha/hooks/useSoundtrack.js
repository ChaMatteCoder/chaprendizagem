import { useEffect, useRef, useState } from 'react';
import { attachSoundtrackGestures, createSoundtrack } from '../lib/soundtrack.js';

export default function useSoundtrack(phase) {
  const audioRef = useRef(null);
  const controller = useRef(null);
  const [status, setStatus] = useState({ muted: false, activated: false, failed: false, blocked: false });
  useEffect(() => {
    const music = createSoundtrack(audioRef.current, null, setStatus);
    controller.current = music;
    const detachGestures = attachSoundtrackGestures(document, music);
    return () => {
      detachGestures();
      music.dispose(); controller.current = null;
    };
  }, []);
  useEffect(() => { controller.current?.setPhase(phase); }, [phase]);
  return { audioRef, ...status, toggle: () => controller.current?.toggle() };
}
