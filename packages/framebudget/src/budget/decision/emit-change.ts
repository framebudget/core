import type { ChangeReason } from "../budget.types";
import type { BudgetState } from "../budget-state.types";
import { buildSnapshot } from "./build-snapshot";

export function emitChange(state: BudgetState, reason: ChangeReason): void {
  if (state.listeners.size === 0) return;
  const snapshot = buildSnapshot(state);
  // A copy, so listeners added during the emit wait for the next change.
  const listeners = [...state.listeners];
  for (const listener of listeners) {
    try {
      listener(snapshot, reason);
    } catch (error) {
      // Surface the error without breaking the other listeners or the governor. The
      // rejection carries the error as thrown, whatever its type.
      const failure: Error = error as Error;
      void Promise.reject(failure);
    }
  }
}
