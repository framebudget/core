import type { EffectDefinition } from "../../core/calibration/calibration.types";
import type { ConfigureOptions } from "../budget.types";
import type { BudgetState } from "../budget-state.types";
import { recalibrate } from "../decision/recalibrate";
import { recomputeDecision } from "../decision/recompute-decision";
import { startSharing } from "../sharing/start-sharing";

/** Options are stored before `start` so the first decision already uses them. */
export function configureBudget(state: BudgetState, options: ConfigureOptions, start: () => void): void {
  const { calibrationDefaults, calibration } = options;
  if (calibrationDefaults) state.defaults.push(calibrationDefaults);
  if (calibration) state.patches.push(calibration);
  if (options.share !== undefined) state.config.share = options.share;
  if (options.governor) state.config.governor = { ...state.config.governor, ...options.governor };
  if (options.panel !== undefined) state.config.panel = options.panel;
  start();
  if (calibrationDefaults || calibration) {
    recalibrate(state);
    recomputeDecision(state, "configure");
  }
  if (options.share) startSharing(state);
}

export function registerEffect(state: BudgetState, name: string, effect: EffectDefinition, start: () => void): void {
  state.patches.push({ effects: { [name]: effect } });
  start();
  recalibrate(state);
  recomputeDecision(state, "configure");
}
