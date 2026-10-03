import { createBudget, type Budget, type ConfigureOptions } from "./budget";

/** The page's budget. Starts on first use; safe to import during server rendering. */
export const budget: Budget = /* #__PURE__ */ createBudget();

/** Same as `budget.configure`. */
export function configure(options: ConfigureOptions): void {
  budget.configure(options);
}

export { createBudget };
export type {
  Budget,
  BudgetSnapshot,
  ChangeListener,
  ChangeReason,
  ConfigureOptions,
  CreateBudgetOptions,
} from "./budget";
export { Tier, TIERS } from "./tiers";
export { defaultCalibration, mergeCalibration, tierEffects } from "./calibration";
export type { Calibration, CalibrationPatch, EffectDefinition, KernelName } from "./calibration";
export { defaultGovernorOptions } from "./governor";
export type { GovernorOptions } from "./governor";
export type { BenchResult } from "./bench";
export type { Hints } from "./hints";
export type { OffReason } from "./decide";
export type { PressureState, ScoreSource } from "./env";
export type { ShareOptions, TelemetryReport } from "./telemetry";
