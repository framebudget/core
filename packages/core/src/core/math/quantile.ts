/** The q-quantile of a list (q from 0 to 1), nearest rank below. NaN for an empty list. Does not mutate the input. */
export function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(q * (sorted.length - 1))] ?? NaN;
}
