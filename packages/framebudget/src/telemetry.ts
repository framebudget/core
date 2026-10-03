import type { BenchResult } from "./bench";
import type { Calibration, CalibrationPatch, KernelName } from "./calibration";
import { safe, type PressureState, type Scope } from "./env";
import type { Hints } from "./hints";
import { roundSignificant } from "./math";
import { saveState, type StoredState } from "./storage";
import type { Tier } from "./tiers";

/** Opt-in sharing, set by the site developer. There is no default endpoint. */
export interface ShareOptions {
  /** Receives one anonymous report per sampled page view, via navigator.sendBeacon. */
  endpoint: string;
  /** Fraction of page views that report, 0 to 1. Default 0.1. */
  sampleRate?: number;
  /**
   * Days a browser waits after a report before it reports again, so frequent
   * visitors do not outweigh the rest. A new calibration version reports at once.
   * Kept in localStorage; no identifier leaves the device. Default 7, 0 turns it off.
   */
  minIntervalDays?: number;
  /** JSON calibration patch fetched after load and used from the next visit. */
  calibrationUrl?: string;
}

/** The whole report. No identifiers, no URL, no user agent, no timestamps. */
export interface TelemetryReport {
  v: 1;
  /** Calibration version the scores were computed against. */
  cal: string;
  score: number;
  cold: number | null;
  warm: number | null;
  /** Work units per ms per kernel (warm run when present), 3 significant digits. */
  kernels: Partial<Record<KernelName, number>>;
  /** Clock resolution in ms. */
  tickMs: number | null;
  hints: { cores?: number; memoryGb?: number; pressure?: PressureState; reducedMotion: boolean };
  tier: Tier;
  effects: string[];
  /** Effects the governor stepped down on this page. */
  stepped: string[];
  /** Median frames per second per source ("main", "worker" or an effect name), whole numbers. */
  fps: Record<string, number>;
}

/** Sharing needs an endpoint and is never done under Global Privacy Control or Save-Data. */
export function sharingAllowed(share: ShareOptions | undefined, hints: Hints): share is ShareOptions {
  return !!share && typeof share.endpoint === "string" && share.endpoint !== "" && !hints.gpc && !hints.saveData;
}

export interface ReportInput {
  cal: Calibration;
  score: number;
  cold: BenchResult | null;
  warm: BenchResult | null;
  hints: Hints;
  pressure?: PressureState;
  tier: Tier;
  effects: string[];
  stepped: string[];
  fps: Record<string, number>;
}

export function buildReport(input: ReportInput): TelemetryReport {
  const bench = input.warm || input.cold;
  const kernels: Partial<Record<KernelName, number>> = {};
  if (bench) {
    for (const name of Object.keys(bench.rates) as KernelName[]) {
      kernels[name] = roundSignificant(bench.rates[name]!, 3);
    }
  }
  const fps: Record<string, number> = {};
  for (const name of Object.keys(input.fps)) fps[name] = Math.round(input.fps[name]!);
  return {
    v: 1,
    cal: input.cal.version,
    score: Math.round(input.score),
    cold: input.cold ? Math.round(input.cold.score) : null,
    warm: input.warm ? Math.round(input.warm.score) : null,
    kernels,
    tickMs: bench ? roundSignificant(bench.tickMs, 2) : null,
    hints: {
      cores: input.hints.cores,
      memoryGb: input.hints.memoryGb,
      pressure: input.pressure,
      reducedMotion: input.hints.reducedMotion,
    },
    tier: input.tier,
    effects: input.effects.slice().sort(),
    stepped: input.stepped.slice(),
    fps,
  };
}

const DEFAULT_INTERVAL_DAYS = 7;

/** Whether this browser may report again: never reported, a new calibration, or the interval has passed. */
export function reportDue(share: ShareOptions, state: StoredState, calVersion: string, nowMs: number): boolean {
  const days = typeof share.minIntervalDays === "number" && share.minIntervalDays >= 0 ? share.minIntervalDays : DEFAULT_INTERVAL_DAYS;
  if (state.reportedAt === undefined || state.reportedCal !== calVersion) return true;
  // a clock set back past the last report counts as due, so a broken clock never silences a device for good
  return nowMs - state.reportedAt >= days * 86400000 || nowMs < state.reportedAt;
}

/** Sends the report with sendBeacon. Returns whether the browser queued it. */
export function sendReport(scope: Scope, share: ShareOptions, report: TelemetryReport): boolean {
  const nav = safe(() => scope.navigator);
  if (!nav || typeof nav.sendBeacon !== "function") return false;
  return safe(() => nav.sendBeacon(share.endpoint, JSON.stringify(report))) === true;
}

const DAY_MS = 86400000;

/**
 * Fetches the calibration patch at most once a day and keeps it for the next
 * visit. Never awaited by anything on the page; failures are ignored.
 */
export function refreshCalibration(
  scope: Scope,
  url: string,
  state: StoredState,
  storage: Storage | null,
  nowMs: number,
): void {
  const f = safe(() => scope.fetch);
  if (!f || !storage || (state.remoteAt !== undefined && nowMs - state.remoteAt < DAY_MS)) return;
  safe(() =>
    f(url, { credentials: "omit" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: unknown) => {
        if (!body || typeof body !== "object") return;
        state.remote = body as CalibrationPatch;
        state.remoteAt = nowMs;
        saveState(storage, state);
      })
      .catch(() => undefined),
  );
}
