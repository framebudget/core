import type { BenchResult } from "../benchmark/benchmark.types";
import type { CalibrationPatch, KernelRatios } from "../core/calibration/calibration.types";
import type { Decision } from "../core/decision/decision.types";
import type { PressureState, ScoreSource } from "../core/device/device.types";
import type { BlockEntry } from "../core/state/stored-state.types";
import type { Governor } from "../governor/governor.types";
import type { Scope } from "../platform/scope/scope.types";
import type { StartContext } from "../startup/startup.types";
import type { ChangeListener, ConfigureOptions, CreateBudgetOptions } from "./budget.types";

/** Everything one budget instance tracks. Shared by the budget modules; never exposed. */
export interface BudgetState {
  readonly init: CreateBudgetOptions;
  readonly listeners: Set<ChangeListener>;
  /** The site's calibration defaults, in the order they were configured; the fetched calibration refines them. */
  readonly defaults: CalibrationPatch[];
  /** The site's calibration patches, in the order they were configured or registered. */
  readonly patches: CalibrationPatch[];
  readonly config: ConfigureOptions;
  /** Effects the governor stepped down on this page and that are still off (the trial included). */
  readonly stepped: string[];
  /** Effects the page used: asked with allows(), reported frames for, or declared with `uses`. */
  readonly used: Set<string>;
  readonly steps: StepState;
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
  /** Kernel ratios behind `score`, for effects with kernel weights. */
  ratios: KernelRatios | undefined;
  warm: BenchResult | null;
  pressure: PressureState | undefined;
  learned: string[];
  /** Effect this page view explores below its threshold (telemetry), or null. */
  explored: string | null;
  /** A decision for newly used effects is queued (capacity). */
  isCapacityPending: boolean;
  governor: Governor | null;
  isLoaded: boolean;
  isSharingArmed: boolean;
  wasReported: boolean;
  now: () => number;
}

/** What the governor did on this page: its trial, in-page retries and the counts behind a clean visit. */
export interface StepState {
  /** Effects stepped down on a guess, in order, until the governor has checked them. Empty: no trial. */
  trial: string[];
  /** The frame source whose strike-out started the guesses. */
  trialSource: string | null;
  /** Guesses that did not help: the stutter is not the effects', so no more guesses on this page. */
  isHalted: boolean;
  /** Effects whose stutter this page recorded, with their block before it (null: none). */
  recorded: Record<string, BlockEntry | null>;
  /** Effect turned back on for its in-page retry. */
  retry: string | null;
  /** Effects already retried on this page; each gets one retry. */
  retried: string[];
  /** A retried effect stuttered again: the stutter is real, so nothing else is retried on this page. */
  hasRetryFailed: boolean;
  /** Windows judged on this page, and the good ones. */
  judged: number;
  good: number;
  /** Windows judged since the last step, check or retry, and the good ones. */
  recentJudged: number;
  recentGood: number;
  isCleanMarked: boolean;
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
