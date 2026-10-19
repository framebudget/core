import { decide } from "../../core/decision/decide";
import type { DecideInput, Decision } from "../../core/decision/decision.types";
import { widenDecision } from "../../core/decision/widen-decision";
import type { StartContext } from "../../startup/startup.types";
import type { BudgetState } from "../budget-state.types";
import { pageUses } from "./current-fps";

/** What the thresholds decide on: a simulated device has no kernel ratios and no history. */
export function pageInput(
  state: BudgetState,
  context: StartContext,
  score: number,
  previous: readonly string[] | undefined,
): DecideInput {
  const isSimulated = context.simulated !== null;
  return {
    calibration: context.calibration,
    score: context.simulated ?? score,
    ratios: isSimulated ? undefined : state.ratios,
    hints: context.hints,
    pressure: state.pressure,
    previous,
    learned: isSimulated ? [] : state.learned,
    stepped: state.stepped,
    forced: context.forced,
  };
}

/**
 * The thresholds' decision, widened by the capacity and the explored effect.
 * A forced tier stays exactly its set. An explored effect that now passes its
 * threshold on its own, on the real device, is no longer explored.
 */
export function decideForPage(
  state: BudgetState,
  context: StartContext,
  score: number,
  previous: readonly string[] | undefined,
): Decision {
  const input = pageInput(state, context, score, previous);
  const decision = decide(input);
  const isReal = !context.forced && context.simulated === null;
  if (isReal && state.explored !== null && decision.qualified.includes(state.explored)) state.explored = null;
  return context.forced
    ? decision
    : widenDecision({ ...input, used: pageUses(state), explored: state.explored }, decision);
}
