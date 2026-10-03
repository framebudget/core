import { tierEffects, type Calibration } from "./calibration";
import type { PressureState } from "./env";
import type { Hints } from "./hints";
import { TIERS, Tier } from "./tiers";

/** Why an effect is off. */
export type OffReason = "threshold" | "motion" | "data" | "learned" | "governor";

export interface DecideInput {
  cal: Calibration;
  /** Measured or cached score (100 = reference device). */
  score: number;
  hints: Hints;
  pressure?: PressureState;
  /** Effects that passed their threshold last time. Absent means no history. */
  prev?: readonly string[];
  /** Effects that stuttered on earlier visits and are not up for a retry. */
  learned?: readonly string[];
  /** Effects the governor stepped down on this page. */
  stepped?: readonly string[];
  forced?: Tier | null;
}

export interface Decision {
  tier: Tier;
  /** Effects allowed to run. */
  effects: string[];
  /** Effects that passed their threshold, before preferences and learning. */
  qualified: string[];
  off: Record<string, OffReason>;
  /** Score after pressure and hardware caps. */
  score: number;
}

/** Score after Compute Pressure and the low-end hardware caps. */
export function effectiveScore(cal: Calibration, score: number, hints: Hints, pressure?: PressureState): number {
  let s = score;
  if (pressure === "serious") s *= cal.pressure.serious;
  if (pressure === "critical") s *= cal.pressure.critical;
  const lowMemory = hints.memoryGb !== undefined && hints.memoryGb <= cal.caps.lowMemoryGb;
  const lowCores = hints.cores !== undefined && hints.cores <= cal.caps.lowCores;
  if (lowMemory || lowCores) s = Math.min(s, cal.caps.lowScore);
  return s;
}

/**
 * Threshold with hysteresis. An effect that was on stays on down to
 * threshold * (1 - margin); one that was off needs threshold * (1 + margin).
 * Without history the plain threshold decides.
 */
export function passes(score: number, threshold: number, margin: number, wasOn: boolean | undefined): boolean {
  if (wasOn === undefined) return score >= threshold;
  return score >= threshold * (wasOn ? 1 - margin : 1 + margin);
}

export function decide(input: DecideInput): Decision {
  const { cal, hints, forced } = input;
  const score = effectiveScore(cal, input.score, hints, input.pressure);
  const off: Record<string, OffReason> = {};
  let qualified: string[];

  if (forced) {
    qualified = tierEffects(cal, forced);
  } else {
    const prev = input.prev;
    qualified = [];
    for (const name of Object.keys(cal.effects)) {
      const wasOn = prev ? prev.includes(name) : undefined;
      if (passes(score, cal.effects[name]!.threshold, cal.hysteresis, wasOn)) qualified.push(name);
    }
  }

  const effects: string[] = [];
  for (const name of Object.keys(cal.effects)) {
    const def = cal.effects[name]!;
    if (!qualified.includes(name)) off[name] = "threshold";
    else if (def.motion && hints.reducedMotion) off[name] = "motion";
    else if (def.data && (hints.saveData || hints.slowNetwork)) off[name] = "data";
    else if (!forced && input.stepped && input.stepped.includes(name)) off[name] = "governor";
    else if (!forced && input.learned && input.learned.includes(name)) off[name] = "learned";
    else effects.push(name);
  }

  // Preferences do not lower the tier; thresholds, learning and the governor do.
  let tier: Tier = forced || Tier.Lite;
  if (!forced) {
    for (const t of TIERS) {
      const ok = tierEffects(cal, t).every((name) => {
        const reason = off[name];
        return reason === undefined || reason === "motion" || reason === "data";
      });
      if (ok) {
        tier = t;
        break;
      }
    }
  }
  return { tier, effects, qualified, off, score };
}
