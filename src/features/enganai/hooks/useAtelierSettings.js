import { useEffect, useRef, useState } from "react";
import { createAtelierAudio } from "../lib/atelierAudio.js";
import {
  DEFAULT_PREFERENCES,
  readPreferences,
  writePreferences,
} from "../lib/atelierPreferences.js";

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export default function useAtelierSettings() {
  const [initial] = useState(() => readPreferences(storage()));
  const [preferences, setPreferences] = useState(initial.value);
  const [persistence, setPersistence] = useState(initial.persistence);
  const [systemReduced, setSystemReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [soundOn, setSoundOn] = useState(false);
  const [soundPending, setSoundPending] = useState(false);
  const [notice, setNotice] = useState("");
  const prefsRef = useRef(preferences);
  const persistenceRef = useRef(persistence);
  const soundRef = useRef(false);
  const audioRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const audio = createAtelierAudio(
      window.AudioContext || window.webkitAudioContext,
    );
    audioRef.current = audio;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(media.matches);
    media.addEventListener("change", update);
    return () => {
      mountedRef.current = false;
      audio.dispose();
      media.removeEventListener("change", update);
    };
  }, []);

  function updatePreferences(patch) {
    const next = { ...prefsRef.current, ...patch };
    const status = writePreferences(storage(), next, persistenceRef.current);
    prefsRef.current = next;
    persistenceRef.current = status;
    setPreferences(next);
    setPersistence(status);
  }

  async function toggleSound() {
    if (soundRef.current) {
      audioRef.current?.stop();
      soundRef.current = false;
      setSoundOn(false);
      updatePreferences({ soundEnabled: false });
      return;
    }
    setSoundPending(true);
    const active = await audioRef.current?.start();
    if (!mountedRef.current) return;
    setSoundPending(false);
    soundRef.current = Boolean(active);
    setSoundOn(Boolean(active));
    if (active) {
      updatePreferences({ soundEnabled: true });
      setNotice("Som ambiente ativado.");
    } else {
      setNotice(
        "O som não pôde ser iniciado neste navegador. Você pode continuar explorando.",
      );
    }
  }

  function resetPreferences() {
    try {
      storage()?.removeItem("enganai.preferences.v1");
    } catch {
      /* Memory preferences still work. */
    }
    persistenceRef.current = "ready";
    audioRef.current?.stop();
    soundRef.current = false;
    setSoundOn(false);
    updatePreferences({ ...DEFAULT_PREFERENCES });
    setNotice("Preferências redefinidas.");
  }

  return {
    preferences,
    persistence,
    reducedMotion: preferences.motion === "reduced" || systemReduced,
    soundOn,
    soundPending,
    notice,
    updatePreferences,
    toggleSound,
    resetPreferences,
  };
}
