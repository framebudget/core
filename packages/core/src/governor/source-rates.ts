import type { SourceState, WindowStats } from "./governor.types";

/** One figure per source over its recent judged windows; sources with no judged window are left out. */
export function sourceRates(
  sources: Readonly<Record<string, SourceState>>,
  rate: (windows: readonly WindowStats[]) => number,
): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const [name, source] of Object.entries(sources)) {
    if (source.windows.length > 0) rates[name] = rate(source.windows);
  }
  return rates;
}
