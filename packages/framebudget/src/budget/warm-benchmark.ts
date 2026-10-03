import type { BenchResult } from "../benchmark/benchmark.types";
import { runBenchmarkAsync } from "../benchmark/run-benchmark-async";
import { calibrationKey } from "../core/calibration/calibration-key";
import type { Scope } from "../platform/scope/scope.types";
import { cachedScore } from "../startup/cached-score";
import { createBenchOptions } from "../startup/create-bench-options";
import type { StartContext } from "../startup/startup.types";
import { WARM_MS } from "./budget.constants";
import type { BudgetState } from "./budget-state.types";
import { persistState } from "./persist-state";
import { recomputeDecision } from "./recompute-decision";

function zeroTimeoutPause(scope: Scope): () => Promise<void> {
  return () =>
    new Promise<void>((resolve) => {
      if (scope.setTimeout) scope.setTimeout(resolve, 0);
      else resolve();
    });
}

/** Smooths the warm score with the cached one, so one noisy page moves the tier less. */
function storeWarmScore(state: BudgetState, context: StartContext, score: number): void {
  const nowMs = Date.now();
  const cached = cachedScore(context, nowMs);
  context.stored = {
    ...context.stored,
    score: cached === undefined ? score : (cached + score) / 2,
    key: calibrationKey(context.calibration),
    at: nowMs,
  };
  persistState(state);
}

function applyWarmResult(state: BudgetState, context: StartContext, result: BenchResult): void {
  state.warm = result;
  if (context.simulated === null) storeWarmScore(state, context, result.score);
  state.score = result.score;
  state.source = "warm";
  recomputeDecision(state, "warm");
}

/** Measures again after load, in slices between pauses. Settles once the result is applied or the run failed. */
export async function runWarmBenchmark(state: BudgetState, scope: Scope, context: StartContext): Promise<void> {
  const pause = state.init.pause ?? zeroTimeoutPause(scope);
  try {
    const result = await runBenchmarkAsync(createBenchOptions(scope, context.calibration, WARM_MS, true), pause);
    if (result) applyWarmResult(state, context, result);
  } catch {
    // A failed warm run keeps the first decision.
  }
}
