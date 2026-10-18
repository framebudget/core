import type { StoredState } from "../../src/core/state/stored-state.types";
import { STORAGE_KEY } from "../../src/platform/storage/storage.constants";
import type { FakeStorage } from "./fake-browser.types";

/** What framebudget stored in local storage. */
export function stored(local: FakeStorage): StoredState {
  return JSON.parse(local.getItem(STORAGE_KEY)!) as StoredState;
}
