/** The value when it is a finite number, undefined for anything else stored JSON may hold. */
export function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
