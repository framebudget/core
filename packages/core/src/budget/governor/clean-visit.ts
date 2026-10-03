import { recordCleanVisit } from "../../core/learning/record-clean-visit";
import type { BudgetState } from "../budget-state.types";
import { persistState } from "../decision/persist-state";

/** Governor hook: the visit ran smoothly, so blocked effects come closer to a retry. */
export function markCleanVisit(state: BudgetState): void {
  const { context, decision } = state;
  if (!context || !decision || context.forced || context.simulated !== null) return;
  context.stored = recordCleanVisit(context.stored, decision.effects);
  persistState(state);
}
