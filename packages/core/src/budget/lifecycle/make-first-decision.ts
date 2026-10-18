import { applyToDocument } from "../../platform/document/apply-to-document";
import type { Scope } from "../../platform/scope/scope.types";
import type { StartContext } from "../../startup/startup.types";
import type { BudgetState, StartingPoint } from "../budget-state.types";
import { decideForPage } from "../decision/decide-for-page";

export function makeFirstDecision(state: BudgetState, scope: Scope, context: StartContext, start: StartingPoint): void {
  const decision = decideForPage(state, context, start.score, start.qualified);
  state.decision = decision;
  applyToDocument(scope, decision.tier, decision.effects);
}
