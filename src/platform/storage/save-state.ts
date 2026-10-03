import type { StoredState } from "../../core/state/stored-state.types";
import { safe } from "../scope/safe";
import { STORAGE_KEY } from "./storage.constants";

export function saveState(storage: Storage | null, state: StoredState): void {
  if (storage) {
    safe(() => {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  }
}
