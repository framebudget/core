/** Rounds to a number of significant digits (keeps payloads coarse). */
export function roundSignificant(value: number, digits: number): number {
  if (value === 0 || !Number.isFinite(value)) return value;
  const magnitude = Math.ceil(Math.log10(Math.abs(value)));
  const scale = Math.pow(10, digits - magnitude);
  return Math.round(value * scale) / scale;
}
