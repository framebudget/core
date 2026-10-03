import { fromEntries } from "../object/from-entries";
import type { BlockEntry, StoredState } from "../state/stored-state.types";

/**
 * The page ran smoothly long enough. A blocked effect that ran on it (a retry)
 * held up and is forgotten; the others count one more clean visit. Returns the new state.
 */
export function recordCleanVisit(state: StoredState, allowed: readonly string[]): StoredState {
  const blocked = Object.entries(state.blocked)
    .filter(([name]) => !allowed.includes(name))
    .map(([name, entry]): [string, BlockEntry] => [name, { ...entry, clean: entry.clean + 1 }]);
  return { ...state, blocked: fromEntries(blocked) };
}
