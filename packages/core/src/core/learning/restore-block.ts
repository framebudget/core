import { fromEntries } from "../object/from-entries";
import type { BlockEntry, StoredState } from "../state/stored-state.types";

/** Puts an effect's block back as it was before this page recorded a stutter (null: it had none). Returns the new state. */
export function restoreBlock(state: StoredState, effect: string, entry: BlockEntry | null): StoredState {
  const others = Object.entries(state.blocked).filter(([name]) => name !== effect);
  return { ...state, blocked: fromEntries(entry ? [...others, [effect, entry] as const] : others) };
}
