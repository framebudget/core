import { decide } from "../../core/decision/decide";
import { applyToDocument } from "../../platform/document/apply-to-document";
import type { Scope } from "../../platform/scope/scope.types";
import type { StartContext } from "../../startup/startup.types";
import type { BudgetState, StartingPoint } from "../budget-state.types";

export function makeFirstDecision(state: BudgetState, scope: Scope, context: StartContext, start: StartingPoint): void {
  const decision = decide({
    calibration: context.calibration,
    score: context.simulated ?? start.score,
    hints: context.hints,
    previous: start.qualified,
    learned: context.simulated === null ? state.learned : [], // a simulated device has no history
    forced: context.forced,
  });
  state.decision = decision;
  applyToDocument(scope, decision.tier, decision.effects);
}
