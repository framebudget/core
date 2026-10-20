import { MAX_PENDING_FRAMES } from "../../budget.constants";
import type { BudgetState } from "../../budget-state.types";

/**
 * Hands a reported frame to the governor. Before load there is no governor
 * yet, so the frame waits in a bounded queue: effects that run while the page
 * loads (a draw-in, a page transition) are judged too. Outside a browser,
 * frames are dropped.
 */
export function takeFrame(state: BudgetState, gapMs: number, source: string | undefined): void {
  if (state.governor) {
    state.governor.report(gapMs, source);
    state.runWatch?.touch();
    return;
  }
  if (state.scope && state.pendingFrames.length < MAX_PENDING_FRAMES) state.pendingFrames.push({ gapMs, source });
}

/** Hands the frames queued before load to the governor that just started, in order. */
export function replayFrames(state: BudgetState): void {
  for (const { gapMs, source } of state.pendingFrames.splice(0)) takeFrame(state, gapMs, source);
}
