import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SonarMissionContext } from '../hooks/SonarMissionContext.js';
import { createSonarMission, EMPTY_MISSION } from '../lib/mission/sonarMission.js';
import { loadSonarLabData } from '../lib/data/loadSonarLabData.js';
import { loadOfficialSonar } from '../lib/model/sonarArtifacts.js';
import useSonarSound from '../hooks/useSonarSound.js';
import SonarMenuPage from './SonarMenuPage.jsx';
import SonarMissionPage from './SonarMissionPage.jsx';
import SonarLabPage from './SonarLabPage.jsx';
import '../styles/sonar.css';

export default function SonarApp() {
  const [state, setState] = useState(EMPTY_MISSION);
  const session = useRef(null);
  const [initialized, setInitialized] = useState(false);
  const { pathname } = useLocation();
  const sound = useSonarSound(pathname);
  useEffect(() => {
    const current = createSonarMission({ loadData: loadSonarLabData, loadOfficial: loadOfficialSonar, onChange: setState });
    session.current = current;
    setInitialized(true);
    return () => { current.dispose(); if (session.current === current) session.current = null; };
  }, []);
  const actions = useMemo(() => ({
    start: options => session.current?.start(options), guess: choice => session.current?.guess(choice),
    retry: () => session.current?.retryPrediction(), reveal: () => session.current?.reveal(), next: () => session.current?.next(),
    pause: () => session.current?.pause(), leave: () => session.current?.leave(), openContext: index => session.current?.openContext(index) }), []);
  return <SonarMissionContext.Provider value={{ ...actions, state, initialized, sound, context: session.current?.context ?? null }}><audio ref={sound.audioRef} hidden /><Routes>
    <Route index element={<SonarMenuPage />} />
    <Route path="missao" element={<SonarMissionPage />} />
    <Route path="lab" element={<SonarLabPage />} />
    <Route path="*" element={<Navigate to="/sonar" replace />} />
  </Routes></SonarMissionContext.Provider>;
}
