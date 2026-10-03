/** Median of a list. Returns NaN for an empty list. Does not mutate the input. */
export function median(values: readonly number[]): number {
  const n = values.length;
  if (n === 0) return NaN;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = n >> 1;
  return n % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Geometric mean of positive values. Returns NaN when the list is empty or
 * holds a value that is not a positive finite number.
 */
export function geomean(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  let logSum = 0;
  for (const v of values) {
    if (!(v > 0) || !isFinite(v)) return NaN;
    logSum += Math.log(v);
  }
  return Math.exp(logSum / values.length);
}

/** Rounds to a number of significant digits (keeps payloads coarse). */
export function roundSignificant(value: number, digits: number): number {
  if (value === 0 || !isFinite(value)) return value;
  const scale = Math.pow(10, digits - Math.ceil(Math.log10(Math.abs(value))));
  return Math.round(value * scale) / scale;
}
