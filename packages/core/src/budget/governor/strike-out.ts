import type { Decision } from "../../core/decision/decision.types";
import { pickVictim } from "../../core/step-down/pick-victim";
import type { StepKind } from "../../governor/governor.types";
import type { StartContext } from "../../startup/startup.types";
import type { BudgetState } from "../budget-state.types";
import { pageUses } from "../decision/current-fps";
import { recomputeDecision } from "../decision/recompute-decision";
import { confirmStep } from "./confirm-step";
import { restartStretch } from "./step-state";

/** Effects that may step down: the allowed ones the page uses, or every allowed one when the page reported no use. */
function steppable(state: BudgetState, decision: Decision): string[] {
  const uses = pageUses(state);
  return uses.length > 0 ? decision.effects.filter((name) => uses.includes(name)) : decision.effects;
}

/** Riskiest first: the in-page retry, the explored effect, promoted effects, effects back after earlier stutters. */
function suspects(state: BudgetState, context: StartContext, decision: Decision): string[][] {
  return [
    state.steps.retry === null ? [] : [state.steps.retry],
    state.explored === null ? [] : [state.explored],
    decision.promoted,
    Object.keys(context.stored.blocked),
  ];
}

/** Steps the likeliest used effect down on a guess, added to the trial. Returns false when none is left. */
export function stepOnGuess(state: BudgetState): boolean {
  const { context, decision, steps } = state;
  if (!context || !decision || context.forced) return false;
  const victim = pickVictim(context.calibration, steppable(state, decision), suspects(state, context, decision));
  if (victim === undefined) return false;
  state.stepped.push(victim);
  steps.trial.push(victim);
  restartStretch(steps);
  recomputeDecision(state, "governor");
  return true;
}

/**
 * Governor hook: `frameSource` struck out. An effect's own frames step that
 * effect down for good; frames of an effect already off step nothing down.
 * Other frames step the likeliest used effect down on a guess the governor
 * then checks, unless earlier guesses did not help. Nothing steps down while
 * a tier is forced.
 */
export function strikeOut(state: BudgetState, frameSource: string): StepKind | null {
  const { context, decision, steps } = state;
  if (!context || !decision || context.forced) return null;
  if (!Object.keys(context.calibration.effects).includes(frameSource)) {
    if (steps.isHalted || !stepOnGuess(state)) return null;
    steps.trialSource = frameSource;
    return "trial";
  }
  if (!decision.effects.includes(frameSource)) return null;
  state.stepped.push(frameSource);
  restartStretch(steps);
  confirmStep(state, frameSource);
  recomputeDecision(state, "governor");
  return "kept";
}
