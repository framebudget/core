import type { BenchResult } from "../benchmark/benchmark.types";
import type { Calibration } from "../core/calibration/calibration.types";
import type { Hints, ScoreSource } from "../core/device/device.types";
import type { StoredState } from "../core/state/stored-state.types";
import type { Tier } from "../core/tier/tier.enum";

/** Shared by the boot script and the core, so both reach the same first decision. */
export interface StartContext {
  storage: Storage | null;
  stored: StoredState;
  calibration: Calibration;
  hints: Hints;
  forced: Tier | null;
  /** Debug and demo: a score that replaces the measured one for the session. */
  simulated: number | null;
}

export interface InitialScore {
  score: number;
  source: ScoreSource;
  cold: BenchResult | null;
}
