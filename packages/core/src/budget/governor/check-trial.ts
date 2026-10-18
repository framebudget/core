import { MAX_GUESSES } from "../budget.constants";
import type { BudgetState } from "../budget-state.types";
import { recomputeDecision } from "../decision/recompute-decision";
import { confirmStep } from "./confirm-step";
import { restartStretch, unstep } from "./step-state";
import { stepOnGuess } from "./strike-out";

/**
 * Governor hook: the guesses were checked. Guesses that helped stay and are
 * learned. Otherwise one more used effect steps down, since one effect alone
 * may not move frames past a vsync, up to MAX_GUESSES. When they still do not
 * help, they all come back on, nothing is learned, and nothing more steps down
 * on this page: the stutter does not come from the effects. Returns true when
 * the check goes on.
 */
export function checkTrial(state: BudgetState, hasHelped: boolean): boolean {
  const { steps } = state;
  const guesses = [...steps.trial];
  if (guesses.length === 0) return false;
  if (!hasHelped && guesses.length < MAX_GUESSES && stepOnGuess(state)) return true;
  steps.trial = [];
  restartStretch(steps);
  if (hasHelped) {
    for (const name of guesses) confirmStep(state, name);
    return false;
  }
  steps.isHalted = true;
  for (const name of guesses) unstep(state.stepped, name);
  recomputeDecision(state, "governor");
  return false;
}
