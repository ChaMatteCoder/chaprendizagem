export function roundNumber(value, digits = 6) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
}

export function calculateRegressionMetrics(rows) {
  const count = rows.length || 1;
  const totalSquaredError = rows.reduce((sum, row) => sum + row.error ** 2, 0);
  const mse = totalSquaredError / count;
  const rmse = Math.sqrt(mse);
  const mae = rows.reduce((sum, row) => sum + Math.abs(row.error), 0) / count;
  const absoluteErrors = rows.map((row) => Math.abs(row.error));
  const meanTarget = rows.reduce((sum, row) => sum + row.t, 0) / count;
  const totalVariation = rows.reduce((sum, row) => sum + (row.t - meanTarget) ** 2, 0);
  const rSquared = totalVariation <= 1e-12 ? 1 : 1 - totalSquaredError / totalVariation;

  return {
    totalSquaredError: roundNumber(totalSquaredError),
    mse: roundNumber(mse),
    rmse: roundNumber(rmse),
    mae: roundNumber(mae),
    maxAbsoluteError: roundNumber(Math.max(...absoluteErrors, 0)),
    minAbsoluteError: roundNumber(Math.min(...absoluteErrors, 0)),
    rSquared: roundNumber(rSquared),
  };
}

export function formatDecimal(value, digits = 4) {
  if (!Number.isFinite(value)) return '0';
  return Number(value).toFixed(digits).replace(/\.?0+$/, '');
}
