/**
 * Geometric mean of positive values. Returns NaN when the list is empty or
 * holds a value that is not a positive finite number.
 */
export function geometricMean(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  if (values.some((value) => !(value > 0 && Number.isFinite(value)))) return NaN;
  const logSum = values.map((value) => Math.log(value)).reduce((sum, logValue) => sum + logValue, 0);
  return Math.exp(logSum / values.length);
}
