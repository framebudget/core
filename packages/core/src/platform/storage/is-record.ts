/** A non-null object, the only shape stored JSON values can be read from. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
