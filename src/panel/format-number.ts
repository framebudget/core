export function formatNumber(value: number | null | undefined, digits = 0): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}
