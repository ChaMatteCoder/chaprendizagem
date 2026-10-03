import { useEffect, useRef, useState } from 'react';
import { createSonarLabSession, EMPTY_LAB_STATE } from '../lib/lab/sonarLabSession.js';
import { loadSonarLabData } from '../lib/data/loadSonarLabData.js';
import { loadOfficialSonar } from '../lib/model/sonarArtifacts.js';
import { createSonarLabTrainer } from '../lib/model/trainLabModel.js';

export default function useSonarLab() {
  const [state, setState] = useState(EMPTY_LAB_STATE);
  const session = useRef(null);
  useEffect(() => {
    const current = createSonarLabSession({ loadData: loadSonarLabData, loadOfficial: loadOfficialSonar,
      makeTrainer: async data => {
        const tf = await import('@tensorflow/tfjs'); await tf.ready();
        return createSonarLabTrainer(tf, data.samples, data.partitions, data.datasetSha256);
      }, onChange: setState });
    session.current = current;
    current.load().then(() => current.inspect());
    return () => { current.dispose(); if (session.current === current) session.current = null; };
  }, []);
  return { state,
    retry: () => session.current?.load().then(() => session.current?.inspect()),
    select: (id, kind) => { session.current?.select(id, kind); session.current?.inspect(); },
    trace: () => session.current?.inspect({ trace: true }),
    train: config => session.current?.train(config), cancel: () => session.current?.cancelTraining() };
}
