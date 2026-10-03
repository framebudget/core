import vm from "node:vm";
import { calibrationKey } from "../../src/core/calibration/calibration-key";
import { defaultCalibration } from "../../src/core/calibration/default-calibration";
import { STORAGE_KEY } from "../../src/platform/storage/storage.constants";
import type { FakeStorage } from "../support/fake-browser.types";
import { createFakeStorage } from "../support/fake-storage";
import type { BootSandbox } from "./boot-sandbox.types";

/** Runs the script the way a browser runs an inline <script>: as a classic script against `window`. */
export function runBoot(source: string, globals: Record<string, unknown> = {}, hasDocument = true): BootSandbox {
  const attributes: Record<string, string> = {};
  const documentElement = {
    setAttribute: (name: string, value: unknown) => {
      attributes[name] = String(value);
    },
  };
  const window: Record<string, unknown> = hasDocument ? { document: { documentElement } } : {};
  Object.defineProperties(window, Object.getOwnPropertyDescriptors(globals));
  window.window = window;
  vm.createContext(window);
  vm.runInContext(source, window);
  return { attributes, window };
}

export const throwing = (): never => {
  throw new Error("SecurityError");
};

/** Local storage holding a warm score measured on an earlier page. */
export function cached(score: number, extra: Record<string, unknown> = {}): FakeStorage {
  const local = createFakeStorage();
  local.setItem(
    STORAGE_KEY,
    JSON.stringify({ v: 1, key: calibrationKey(defaultCalibration), score, at: Date.now(), blocked: {}, ...extra }),
  );
  return local;
}
