import type { BenchResult } from "../../benchmark/benchmark.types";
import type { Calibration, KernelName } from "../calibration/calibration.types";
import type { Hints, PressureState } from "../device/device.types";
import type { Tier } from "../tier/tier.enum";

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

export interface ReportInput {
  calibration: Calibration;
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
