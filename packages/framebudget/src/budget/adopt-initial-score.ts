import { safe } from "../platform/scope/safe";
import type { BootState, Scope } from "../platform/scope/scope.types";
import { COLD_MS } from "../startup/startup.constants";
import { initialScore } from "../startup/initial-score";
import type { StartContext } from "../startup/startup.types";
import type { BudgetState, StartingPoint } from "./budget-state.types";

/** The hand-off is written by a boot script that may be another version; check it before use. */
function isBootHandOff(value: unknown): value is BootState {
  const candidate = value as Partial<BootState> | null | undefined;
  return !!candidate && candidate.v === 1 && typeof candidate.score === "number";
}

/** Takes the boot script's measurement when it ran, so both reach the same first decision; else measures. */
export function adoptInitialScore(state: BudgetState, scope: Scope, context: StartContext): StartingPoint {
  const boot = safe(() => scope.__framebudget);
  if (isBootHandOff(boot)) {
    state.score = boot.score;
    state.source = boot.source;
    state.cold = boot.cold;
    return { score: boot.score, qualified: boot.qualified };
  }
  const first = initialScore(scope, context, COLD_MS);
  state.score = first.score;
  state.source = first.source;
  state.cold = first.cold;
  return { score: first.score, qualified: context.stored.qualified };
}
