import type { Decision } from "../../core/decision/decision.types";
import { pickVictim } from "../../core/step-down/pick-victim";
import type { StepKind } from "../../governor/governor.types";
import type { StartContext } from "../../startup/startup.types";
import type { BudgetState } from "../budget-state.types";
import { pageUses } from "../decision/current-fps";
import { recomputeDecision } from "../decision/recompute-decision";
import { confirmStep } from "./confirm-step";
import { restartStretch } from "./step-state";

/**
 * Riskiest first: the in-page retry, the explored effect, promoted effects,
 * used effects back after earlier stutters, then the other used effects. The
 * allowed effects the page never reported come last: an effect gated only in
 * CSS still runs. Without any use reported, every allowed effect counts as used.
 */
function suspects(state: BudgetState, context: StartContext, decision: Decision): string[][] {
  const reported = pageUses(state);
  const uses = reported.length > 0 ? reported : decision.effects;
  return [
    state.steps.retry === null ? [] : [state.steps.retry],
    state.explored === null ? [] : [state.explored],
    decision.promoted,
    Object.keys(context.stored.blocked).filter((name) => uses.includes(name)),
    uses,
  ];
}

/** Steps the likeliest allowed effect down on a guess, added to the trial. Returns false when none is left. */
export function stepOnGuess(state: BudgetState): boolean {
  const { context, decision, steps } = state;
  if (!context || !decision || context.forced) return false;
  const victim = pickVictim(context.calibration, decision.effects, suspects(state, context, decision));
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
