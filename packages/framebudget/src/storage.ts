import type { CalibrationPatch } from "./calibration";
import { safe, type Scope } from "./env";

export const STORAGE_KEY = "framebudget";

export interface BlockEntry {
  /** Clean visits since the last stutter. */
  clean: number;
  /** Times the effect stuttered. Each one doubles the wait before a retry. */
  fails: number;
}

/** Everything framebudget keeps on the device (per origin, localStorage). */
export interface StoredState {
  v: 1;
  /** calibrationKey() of the calibration the score was measured against. */
  key?: string;
  /** Smoothed warm score from earlier pages. */
  score?: number;
  /** Date.now() when the score was stored. */
  at?: number;
  /** Effects that passed their threshold on the last page, for hysteresis. */
  qualified?: string[];
  /** Effects that stuttered (local learning). */
  blocked: Record<string, BlockEntry>;
  /** Calibration fetched from the site's calibration URL, used from the next visit. */
  remote?: CalibrationPatch;
  remoteAt?: number;
  /** Date.now() of the last report this browser sent, and its calibration version (telemetry throttle). */
  reportedAt?: number;
  reportedCal?: string;
}

/** A storage area, or null when it is missing or access throws (privacy modes, sandboxed frames). */
export function openStorage(scope: Scope, area: "localStorage" | "sessionStorage"): Storage | null {
  const storage = safe(() => scope[area]);
  return storage && typeof storage.getItem === "function" ? storage : null;
}

const num = (v: unknown): number | undefined => (typeof v === "number" && isFinite(v) ? v : undefined);

export function loadState(storage: Storage | null): StoredState {
  const raw = storage ? safe(() => storage.getItem(STORAGE_KEY)) : null;
  const parsed = raw ? (safe(() => JSON.parse(raw)) as Partial<StoredState> | undefined) : undefined;
  const state: StoredState = { v: 1, blocked: {} };
  if (!parsed || typeof parsed !== "object" || parsed.v !== 1) return state;
  if (typeof parsed.key === "string") state.key = parsed.key;
  state.score = num(parsed.score);
  state.at = num(parsed.at);
  if (Array.isArray(parsed.qualified)) state.qualified = parsed.qualified.filter((x) => typeof x === "string");
  if (parsed.blocked && typeof parsed.blocked === "object") {
    for (const name of Object.keys(parsed.blocked)) {
      const e = parsed.blocked[name];
      const clean = num(e && e.clean);
      const fails = num(e && e.fails);
      if (clean !== undefined && fails !== undefined) state.blocked[name] = { clean, fails };
    }
  }
  if (parsed.remote && typeof parsed.remote === "object") state.remote = parsed.remote;
  state.remoteAt = num(parsed.remoteAt);
  state.reportedAt = num(parsed.reportedAt);
  if (typeof parsed.reportedCal === "string") state.reportedCal = parsed.reportedCal;
  return state;
}

export function saveState(storage: Storage | null, state: StoredState): void {
  if (storage) safe(() => storage.setItem(STORAGE_KEY, JSON.stringify(state)));
}
