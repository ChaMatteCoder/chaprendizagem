export function calculateTrainingMetrics(history, modeConfig, sampleCount, trainTimeMs) {
  const last = history.at(-1) ?? { loss: 0, accuracy: 0, epoch: 0 };

  return {
    finalLoss: last.loss,
    finalAccuracy: last.accuracy,
    epochs: history.length,
    classCount: modeConfig.classes.length,
    sampleCount,
    trainTimeMs,
  };
}
