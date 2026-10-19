import type { Calibration, KernelRatios } from "../calibration/calibration.types";
import type { Hints, PressureState } from "../device/device.types";
import type { Tier } from "../tier/tier.enum";

/** Why an effect is off. */
export type OffReason = "threshold" | "motion" | "data" | "learned" | "governor";

export interface DecideInput {
  calibration: Calibration;
  /** Measured or cached score (100 = reference device). */
  score: number;
  /** Kernel ratios behind the score, for effects with kernel weights. Absent: every effect uses the score. */
  ratios?: KernelRatios;
  hints: Hints;
  pressure?: PressureState;
  /** Effects that passed their threshold last time. Absent means no history. */
  previous?: readonly string[];
  /** Effects that stuttered on earlier visits and are not up for a retry. */
  learned?: readonly string[];
  /** Effects the governor stepped down on this page. */
  stepped?: readonly string[];
  forced?: Tier | null;
}

/** What the core adds to a decision once the page runs: the effects it uses and the one it explores. */
export interface WidenInput extends DecideInput {
  /** Effects the page used. */
  used: readonly string[];
  /** Effect this page view explores below its threshold (telemetry), or null. */
  explored: string | null;
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
  /** Each effect's score (its kernel weights applied) after pressure and hardware caps. */
  scores: Record<string, number>;
  /** Effects on below their threshold because the page's load fits the capacity. */
  promoted: string[];
  /** Effect on below its threshold because this page view explores it, or null. */
  explored: string | null;
}
