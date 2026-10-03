import type { StoredState } from "../state/stored-state.types";
import { MAX_FAILS } from "./learning.constants";

/** The governor stepped this effect down: start without it on the next visits. Returns the new state. */
export function recordStutter(state: StoredState, effect: string): StoredState {
  const fails = Math.min((state.blocked[effect]?.fails ?? 0) + 1, MAX_FAILS);
  return { ...state, blocked: { ...state.blocked, [effect]: { clean: 0, fails } } };
}
