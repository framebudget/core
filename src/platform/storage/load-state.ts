import type { StoredState } from "../../core/state/stored-state.types";
import { safe } from "../scope/safe";
import { parseStoredState } from "./parse-stored-state";
import { STORAGE_KEY } from "./storage.constants";

export function loadState(storage: Storage | null): StoredState {
  const raw = storage ? safe(() => storage.getItem(STORAGE_KEY)) : null;
  const parsed = raw ? safe((): unknown => JSON.parse(raw)) : undefined;
  return parseStoredState(parsed);
}
