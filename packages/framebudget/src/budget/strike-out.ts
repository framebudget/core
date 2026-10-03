import type { Calibration } from "../core/calibration/calibration.types";
import { recordStutter } from "../core/learning/record-stutter";
import type { BudgetState } from "./budget-state.types";
import { recomputeDecision } from "./recompute-decision";

/** The most expensive effect first; between equal costs, the one with the higher threshold. */
function mostExpensive(calibration: Calibration, allowed: readonly string[]): string | undefined {
  const cost = (name: string): number => calibration.effects[name]?.cost ?? 0;
  const threshold = (name: string): number => calibration.effects[name]?.threshold ?? 0;
  return [...allowed].sort((left, right) => cost(right) - cost(left) || threshold(right) - threshold(left))[0];
}

/** Governor hook: `frameSource` struck out. Steps its own effect down, else the most expensive one. */
export function strikeOut(state: BudgetState, frameSource: string): boolean {
  const { context, decision } = state;
  if (!context || !decision || context.forced) return false;
  const allowed = decision.effects;
  const victim = allowed.includes(frameSource) ? frameSource : mostExpensive(context.calibration, allowed);
  if (!victim) return false;
  state.stepped.push(victim);
  if (context.simulated === null) context.stored = recordStutter(context.stored, victim); // recompute persists it
  recomputeDecision(state, "governor");
  return true;
}
