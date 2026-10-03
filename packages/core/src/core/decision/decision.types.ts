import type { Calibration } from "../calibration/calibration.types";
import type { Hints, PressureState } from "../device/device.types";
import type { Tier } from "../tier/tier.enum";

/** Why an effect is off. */
export type OffReason = "threshold" | "motion" | "data" | "learned" | "governor";

export interface DecideInput {
  calibration: Calibration;
  /** Measured or cached score (100 = reference device). */
  score: number;
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
