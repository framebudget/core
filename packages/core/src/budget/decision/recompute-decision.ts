import type { Decision } from "../../core/decision/decision.types";
import { applyToDocument } from "../../platform/document/apply-to-document";
import type { StartContext } from "../../startup/startup.types";
import type { ChangeReason } from "../budget.types";
import type { BudgetState } from "../budget-state.types";
import { decideForPage } from "./decide-for-page";
import { emitChange } from "./emit-change";
import { persistState } from "./persist-state";

function decideAgain(state: BudgetState, context: StartContext, score: number): Decision {
  const previous = state.decision;
  return decideForPage(state, context, score, previous ? previous.qualified : context.stored.qualified);
}

function hasDecisionChanged(previous: Decision, next: Decision): boolean {
  return previous.tier !== next.tier || previous.effects.join(",") !== next.effects.join(",");
}

/** Decides again and applies the result. Emits only when the tier or the effects changed, unless asked to always. */
export function recomputeDecision(state: BudgetState, reason: ChangeReason, shouldAlwaysEmit = false): void {
  const { context, scope, score } = state;
  if (!context || !scope || score === null) return;
  const previous = state.decision;
  const decision = decideAgain(state, context, score);
  state.decision = decision;
  applyToDocument(scope, decision.tier, decision.effects);
  // A forced tier or a simulated device says nothing about what this device qualifies for.
  if (!context.forced && context.simulated === null) {
    context.stored = { ...context.stored, qualified: decision.qualified };
    persistState(state);
  }
  if (shouldAlwaysEmit || (previous && hasDecisionChanged(previous, decision))) emitChange(state, reason);
}
