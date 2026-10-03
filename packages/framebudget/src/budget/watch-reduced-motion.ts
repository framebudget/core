import { REDUCED_MOTION_QUERY } from "../platform/hints/hints.constants";
import { readHints } from "../platform/hints/read-hints";
import { safe } from "../platform/scope/safe";
import type { Scope } from "../platform/scope/scope.types";
import type { StartContext } from "../startup/startup.types";
import type { BudgetState, LegacyMediaQueryList } from "./budget-state.types";
import { recomputeDecision } from "./recompute-decision";

export function watchReducedMotion(state: BudgetState, scope: Scope, context: StartContext): void {
  safe(() => {
    const mediaQuery = scope.matchMedia?.(REDUCED_MOTION_QUERY) as LegacyMediaQueryList | undefined;
    if (!mediaQuery) return;
    const onMotion = (): void => {
      context.hints = readHints(scope);
      recomputeDecision(state, "motion");
    };
    if (mediaQuery.addEventListener) mediaQuery.addEventListener("change", onMotion);
    else mediaQuery.addListener(onMotion);
  });
}
