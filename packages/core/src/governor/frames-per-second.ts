import { median } from "../core/math/median";
import type { SourceState } from "./governor.types";

/** Median frame rate per source over its recent windows; sources with no window are left out. */
export function framesPerSecond(sources: Readonly<Record<string, SourceState>>): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const [name, source] of Object.entries(sources)) {
    const medianGap = median(source.medians);
    if (medianGap > 0) rates[name] = 1000 / medianGap;
  }
  return rates;
}
