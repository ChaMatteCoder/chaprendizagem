export function buildIrisConfusionMatrix(actualLabels, predictedLabels, classCount = 3) {
  const matrix = Array.from({ length: classCount }, () => Array.from({ length: classCount }, () => 0));

  actualLabels.forEach((actual, index) => {
    const predicted = predictedLabels[index];
    if (Number.isInteger(actual) && Number.isInteger(predicted)) {
      matrix[actual][predicted] += 1;
    }
  });

  return matrix;
}
