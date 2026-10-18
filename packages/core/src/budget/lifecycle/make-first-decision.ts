import { decide } from "../../core/decision/decide";
import { applyToDocument } from "../../platform/document/apply-to-document";
import type { Scope } from "../../platform/scope/scope.types";
import type { StartContext } from "../../startup/startup.types";
import type { BudgetState, StartingPoint } from "../budget-state.types";
import { pageInput } from "../decision/decide-for-page";

/**
 * The thresholds alone, as the boot script decides, so both agree before the
 * first paint. Uses declared with `configure` widen it in the same call.
 */
export function makeFirstDecision(state: BudgetState, scope: Scope, context: StartContext, start: StartingPoint): void {
  const decision = decide(pageInput(state, context, start.score, start.qualified));
  state.decision = decision;
  applyToDocument(scope, decision.tier, decision.effects);
}
