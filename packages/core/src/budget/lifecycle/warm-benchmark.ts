import type { BenchResult } from "../../benchmark/benchmark.types";
import { runBenchmarkAsync } from "../../benchmark/run-benchmark-async";
import { calibrationKey } from "../../core/calibration/calibration-key";
import type { KernelRatios } from "../../core/calibration/calibration.types";
import { blendRatios, kernelRatios } from "../../core/score/kernel-ratios";
import type { Scope } from "../../platform/scope/scope.types";
import { cachedScore } from "../../startup/cached-score";
import { createBenchOptions } from "../../startup/create-bench-options";
import type { StartContext } from "../../startup/startup.types";
import { WARM_MS } from "../budget.constants";
import type { BudgetState } from "../budget-state.types";
import { persistState } from "../decision/persist-state";
import { recomputeDecision } from "../decision/recompute-decision";

function zeroTimeoutPause(scope: Scope): () => Promise<void> {
  return () =>
    new Promise<void>((resolve) => {
      if (scope.setTimeout) scope.setTimeout(resolve, 0);
      else resolve();
    });
}

/** Smooths the warm score and its kernel ratios with the cached ones, so one noisy page moves the tier less. */
function storeWarmScore(state: BudgetState, context: StartContext, score: number, ratios: KernelRatios): void {
  const nowMs = Date.now();
  const cached = cachedScore(context, nowMs);
  context.stored = {
    ...context.stored,
    score: cached === undefined ? score : (cached + score) / 2,
    ratios: blendRatios(cached === undefined ? undefined : context.stored.ratios, ratios),
    key: calibrationKey(context.calibration),
    at: nowMs,
  };
  persistState(state);
}

function applyWarmResult(state: BudgetState, context: StartContext, result: BenchResult): void {
  const ratios = kernelRatios(result.rates, context.calibration.reference);
  state.warm = result;
  if (context.simulated === null) storeWarmScore(state, context, result.score, ratios);
  state.score = result.score;
  state.source = "warm";
  state.ratios = ratios;
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
