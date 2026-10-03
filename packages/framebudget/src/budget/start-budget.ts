import { learnedBlocks } from "../core/learning/learned-blocks";
import { createClock } from "../platform/scope/create-clock";
import { getScope } from "../platform/scope/get-scope";
import type { Scope } from "../platform/scope/scope.types";
import { loadContext } from "../startup/load-context";
import { adoptInitialScore } from "./adopt-initial-score";
import type { Budget, CreateBudgetOptions } from "./budget.types";
import type { BudgetState } from "./budget-state.types";
import { makeFirstDecision } from "./make-first-decision";
import { watchPressure } from "./watch-pressure";
import { watchReducedMotion } from "./watch-reduced-motion";
import { wireLoad } from "./wire-load";

/** An explicit `null` scope behaves like server rendering. */
function resolveScope(init: CreateBudgetOptions): Scope | undefined {
  return init.scope === undefined ? getScope() : (init.scope ?? undefined);
}

/** Starts on first use: reads the page, makes the first decision and watches what can change it. */
export function startBudget(state: BudgetState, budget: Budget): void {
  if (state.hasStarted) return;
  state.hasStarted = true;
  const scope = resolveScope(state.init);
  state.scope = scope;
  if (!scope) return;
  state.now = createClock(scope);
  const context = loadContext(scope, state.patches);
  state.context = context;
  state.remote = context.stored.remote;
  state.learned = learnedBlocks(context.stored, context.calibration);
  makeFirstDecision(state, scope, context, adoptInitialScore(state, scope, context));
  watchReducedMotion(state, scope, context);
  watchPressure(state, scope);
  wireLoad(state, scope, budget);
}
