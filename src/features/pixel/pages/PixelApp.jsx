import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PixelGameContext } from '../hooks/PixelGameContext.js';
import { loadPixelBundle } from '../lib/loadPixelArtifacts.js';
import { createPixelGame, EMPTY_PIXEL_GAME_STATE } from '../lib/pixelGame.js';
import PixelGamePage from './PixelGamePage.jsx';
import PixelLabPage from './PixelLabPage.jsx';
import PixelMenuPage from './PixelMenuPage.jsx';
import '../styles/pixel.css';

export default function PixelApp() {
  const [state, setState] = useState(EMPTY_PIXEL_GAME_STATE);
  const [initialized, setInitialized] = useState(false);
  const [labContext, setLabContext] = useState(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    const controller = createPixelGame({
      loadBundle: loadPixelBundle,
      onChange: setState,
    });
    sessionRef.current = controller;
    setInitialized(true);
    return () => {
      controller.dispose();
      if (sessionRef.current === controller) {
        sessionRef.current = null;
      }
    };
  }, []);

  const actions = useMemo(
    () => ({
      start: (options) => {
        setLabContext(null);
        return sessionRef.current?.start(options);
      },
      updateTools: (partial) => sessionRef.current?.updateTools(partial),
      resetTools: () => sessionRef.current?.resetTools(),
      testAdjustments: () => sessionRef.current?.testAdjustments(),
      retryRound: () => sessionRef.current?.retryRound(),
      concludeRound: () => sessionRef.current?.concludeRound(),
      nextRound: () => sessionRef.current?.nextRound(),
      openLabContext: (roundIdx) => {
        sessionRef.current?.openLabContext(roundIdx);
        setLabContext(sessionRef.current?.context ?? null);
      },
      clearLabContext: () => {
        sessionRef.current?.clearLabContext();
        setLabContext(null);
      },
      pause: () => sessionRef.current?.pause(),
      leave: () => {
        sessionRef.current?.leave();
        setLabContext(null);
      },
    }),
    [],
  );

  const contextValue = useMemo(
    () => ({
      ...actions,
      state,
      initialized,
      labContext,
    }),
    [actions, state, initialized, labContext],
  );

  return (
    <PixelGameContext.Provider value={contextValue}>
      <Routes>
        <Route index element={<PixelMenuPage />} />
        <Route path="jogo" element={<PixelGamePage />} />
        <Route path="lab" element={<PixelLabPage />} />
        <Route path="*" element={<Navigate to="/pixel" replace />} />
      </Routes>
    </PixelGameContext.Provider>
  );
}
