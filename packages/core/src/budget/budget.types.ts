import type { BenchResult } from "../benchmark/benchmark.types";
import type { Calibration, CalibrationPatch, EffectDefinition } from "../core/calibration/calibration.types";
import type { OffReason } from "../core/decision/decision.types";
import type { Hints, PressureState, ScoreSource } from "../core/device/device.types";
import type { ShareSetting } from "../core/telemetry/telemetry.types";
import type { Tier } from "../core/tier/tier.enum";
import type { GovernorOptions } from "../governor/governor.types";
import type { Scope } from "../platform/scope/scope.types";

export interface ConfigureOptions {
  /**
   * Your calibration values, below the calibration fetched while sharing (framebudget.dev or `share.calibrationUrl`):
   * the fetched calibration refines them. Appended in order; same patch format as `calibration`.
   */
  calibrationDefaults?: CalibrationPatch;
  /** Overrides part of the calibration (reference rates, thresholds, tiers, hysteresis). Wins over the fetched calibration. */
  calibration?: CalibrationPatch;
  /**
   * Opt-in anonymous sharing. Off by default; `true` or an options object turns it on and
   * sends sampled reports to framebudget.dev, `false` or `null` turns it off again.
   */
  share?: ShareSetting;
  /** Governor tuning. `auto: false` stops framebudget from sampling main-thread frames itself. */
  governor?: Partial<GovernorOptions> & { auto?: boolean };
  /** `false` ignores the `?framebudget` diagnostics panel parameter. */
  panel?: boolean;
}

export type ChangeReason = "warm" | "governor" | "pressure" | "motion" | "force" | "simulate" | "configure";

export interface BudgetSnapshot {
  tier: Tier;
  /** Effects allowed to run. */
  effects: string[];
  /** Score after pressure and hardware caps; null outside a browser. */
  score: number | null;
  /** Score before pressure and caps: the simulated one while simulating, else the measured one. */
  rawScore: number | null;
  source: ScoreSource | null;
  /** Debug and demo: the simulated score, or null on the real device. */
  simulated: number | null;
  cold: BenchResult | null;
  warm: BenchResult | null;
  hints: Hints | null;
  pressure: PressureState | undefined;
  forced: Tier | null;
  off: Record<string, OffReason>;
  /** Effects the governor stepped down on this page. */
  stepped: string[];
  /** Effects kept off because they stuttered on earlier visits. */
  learned: string[];
  /** Median frames per second per reported source. */
  fps: Record<string, number>;
  calibration: Calibration;
}

export type ChangeListener = (snapshot: BudgetSnapshot, reason: ChangeReason) => void;

export interface Budget {
  /** May this effect run on this device? Unknown effects and server rendering answer false. */
  allows(effect: string): boolean;
  readonly tier: Tier;
  readonly score: number | null;
  effects(): string[];
  snapshot(): BudgetSnapshot;
  /** Subscribes to budget changes. Returns the unsubscribe function. */
  on(type: "change", listener: ChangeListener): () => void;
  off(type: "change", listener: ChangeListener): void;
  /**
   * Reports the time between two frames. `source` is "main" (default),
   * "worker", or an effect name; strikes on an effect's own frames step that
   * effect down, strikes elsewhere step the most expensive effect down.
   */
  reportFrame(gapMs: number, source?: string): void;
  configure(options: ConfigureOptions): void;
  /** Adds an effect to the registry, or replaces an existing definition. */
  register(name: string, effect: EffectDefinition): void;
  /** Forces a tier for the session, or returns to automatic decisions with "auto". */
  force(tier: Tier | "auto"): void;
  /**
   * Debug and demo API. Simulates a device with this benchmark score for the
   * session (null returns to the real device). The score goes through the
   * normal thresholds, hysteresis, caps, preferences and governor, and always
   * emits "change" with reason "simulate". Nothing learned or measured while
   * simulating is stored, and no telemetry is sent.
   */
  simulate(score: number | null): void;
}

export interface CreateBudgetOptions {
  /** Browser globals; defaults to `window`. `null` behaves like server rendering. */
  scope?: Scope | null;
  /** Sampling source for telemetry. */
  random?: () => number;
  /** Yields between warm benchmark rounds. Defaults to a zero timeout. */
  pause?: () => Promise<unknown>;
}
