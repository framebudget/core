import type { BenchResult } from "../benchmark/benchmark.types";
import type { CalibrationPatch } from "../core/calibration/calibration.types";
import type { Decision } from "../core/decision/decision.types";
import type { PressureState, ScoreSource } from "../core/device/device.types";
import type { Governor } from "../governor/governor.types";
import type { Scope } from "../platform/scope/scope.types";
import type { StartContext } from "../startup/startup.types";
import type { ChangeListener, ConfigureOptions, CreateBudgetOptions } from "./budget.types";

/** Everything one budget instance tracks. Shared by the budget modules; never exposed. */
export interface BudgetState {
  readonly init: CreateBudgetOptions;
  readonly listeners: Set<ChangeListener>;
  /** The site's calibration patches, in the order they were configured or registered. */
  readonly patches: CalibrationPatch[];
  readonly config: ConfigureOptions;
  /** Effects the governor stepped down on this page. */
  readonly stepped: string[];
  hasStarted: boolean;
  scope: Scope | undefined;
  context: StartContext | null;
  /** Calibration fetched on an earlier visit. */
  remote: CalibrationPatch | undefined;
  decision: Decision | null;
  /** The measured score (boot, cold, cached, fallback or warm). */
  score: number | null;
  source: ScoreSource | null;
  cold: BenchResult | null;
  warm: BenchResult | null;
  pressure: PressureState | undefined;
  learned: string[];
  governor: Governor | null;
  isLoaded: boolean;
  isSharingArmed: boolean;
  wasReported: boolean;
  now: () => number;
}

/** Where the first decision starts from: the measured score and the qualified effects for hysteresis. */
export interface StartingPoint {
  score: number;
  qualified: string[] | undefined;
}

/** Main-thread frame sampling: the previous frame time and how long to keep sampling. */
export interface FrameSampler {
  lastFrame: number;
  sampleUntil: number;
  isRunning: boolean;
}

/** Older Safari only has `addListener` on media query lists. */
export interface LegacyMediaQueryList {
  addEventListener?: (type: "change", listener: () => void) => void;
  addListener: (listener: () => void) => void;
}
