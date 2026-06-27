export function calculateIrisMetrics(confusionMatrix) {
  const total = confusionMatrix.flat().reduce((sum, value) => sum + value, 0);
  const correct = confusionMatrix.reduce((sum, row, index) => sum + row[index], 0);

  const perClass = confusionMatrix.map((row, classIndex) => {
    const truePositive = row[classIndex];
    const falseNegative = row.reduce((sum, value) => sum + value, 0) - truePositive;
    const falsePositive = confusionMatrix.reduce((sum, matrixRow, rowIndex) => {
      return rowIndex === classIndex ? sum : sum + matrixRow[classIndex];
    }, 0);
    const precision = truePositive + falsePositive > 0 ? truePositive / (truePositive + falsePositive) : 0;
    const recall = truePositive + falseNegative > 0 ? truePositive / (truePositive + falseNegative) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return { precision, recall, f1, support: truePositive + falseNegative };
  });

  return {
    accuracy: total > 0 ? correct / total : 0,
    correct,
    errors: Math.max(total - correct, 0),
    total,
    perClass,
  };
}
