import { safe } from "../../platform/scope/safe";
import type { Scope } from "../../platform/scope/scope.types";
import { ACTIVE_MS, WAKE_EVENTS } from "../budget.constants";
import type { BudgetState, FrameSampler } from "../budget-state.types";

function recordFrame(state: BudgetState, scope: Scope, sampler: FrameSampler, time: number): void {
  if (safe(() => scope.document?.visibilityState) === "hidden") {
    sampler.lastFrame = 0;
    return;
  }
  if (sampler.lastFrame !== 0 && state.governor) state.governor.report(time - sampler.lastFrame, "main");
  sampler.lastFrame = time;
}

/** Main-thread frames are sampled while the page is busy (start, interaction), not forever. */
export function startFrameSampler(state: BudgetState, scope: Scope, initialMs: number): void {
  const requestFrame = safe(() => scope.requestAnimationFrame?.bind(scope));
  if (!requestFrame) return;
  const sampler: FrameSampler = { lastFrame: 0, sampleUntil: 0, isRunning: false };
  const onFrame = (time: number): void => {
    recordFrame(state, scope, sampler, time);
    if (state.now() < sampler.sampleUntil) {
      requestFrame(onFrame);
      return;
    }
    sampler.isRunning = false;
    sampler.lastFrame = 0;
  };
  const wake = (durationMs: number): void => {
    sampler.sampleUntil = Math.max(sampler.sampleUntil, state.now() + durationMs);
    if (sampler.isRunning) return;
    sampler.isRunning = true;
    requestFrame(onFrame);
  };
  const onActivity = (): void => {
    wake(ACTIVE_MS);
  };
  for (const type of WAKE_EVENTS) {
    safe(() => {
      scope.addEventListener?.(type, onActivity, { passive: true, capture: true });
    });
  }
  wake(initialMs);
}
