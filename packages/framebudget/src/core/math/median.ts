/** Median of a list. Returns NaN for an empty list. Does not mutate the input. */
export function median(values: readonly number[]): number {
  const count = values.length;
  if (count === 0) return NaN;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = count >> 1;
  const upper = sorted[middle] ?? NaN;
  return count % 2 ? upper : ((sorted[middle - 1] ?? NaN) + upper) / 2;
}
