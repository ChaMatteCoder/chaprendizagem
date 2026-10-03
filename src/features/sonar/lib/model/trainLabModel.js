import { selectSonarSamples } from '../data/sonarDataset.js';
import { validateSonarPartitions } from '../data/sonarManifests.js';
import { createSonarTrainer } from './trainSonarModel.js';
import { createSonarPredictor } from './predictSonar.js';
import { disposeSonarModel, validateTrainingConfig } from './createSonarModel.js';

/** Experimental facade fixes the lab split and never writes/replaces official artifacts. */
export function createSonarLabTrainer(tf, samples, partitions, verifiedDatasetSha256) {
  validateSonarPartitions(samples, partitions, verifiedDatasetSha256);
  const train = selectSonarSamples(samples, partitions.lab.trainIds);
  const validation = selectSonarSamples(samples, partitions.lab.validationIds);
  const trainer = createSonarTrainer(tf);
  return {
    get state() { return trainer.state; },
    cancel: () => trainer.cancel(),
    dispose: () => trainer.dispose(),
    async train({ config, signal, onEpoch }) {
      const settings = validateTrainingConfig(config);
      const result = await trainer.train({ trainSamples: train, validationSamples: validation, config: settings, signal, onEpoch });
      if (result.status !== 'completed') return result;
      const { model, ...record } = result;
      try {
        const predictor = createSonarPredictor(tf, model, { modelId: `experimental-${result.runId}`, kind: 'experimental',
          classOrder: ['R', 'M'], architecture: [60, ...settings.hiddenUnits, 2] });
        return { ...record, predictor };
      } catch (error) { disposeSonarModel(model); throw error; }
    },
  };
}
