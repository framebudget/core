import type { BenchResult } from "../../benchmark/benchmark.types";
import type { PressureState, ScoreSource } from "../../core/device/device.types";
import type { Tier } from "../../core/tier/tier.enum";

/** What the boot script leaves on `window.__framebudget` for the core. */
export interface BootState {
  v: 1;
  /** Measured (or cached, or fallback) score. A simulated score is read from the session instead. */
  score: number;
  source: ScoreSource;
  cold: BenchResult | null;
  tier: Tier;
  effects: string[];
  /** Effects that passed their threshold, before preferences and learning. */
  qualified: string[];
  forced: Tier | null;
}

export interface PressureRecordLike {
  state: PressureState;
}

export interface PressureObserverLike {
  observe(source: "cpu"): Promise<void> | void;
  disconnect(): void;
}

/**
 * The browser globals framebudget reads. Every member is optional: the boot
 * script and the core must work when any of them is missing or throws.
 */
export interface Scope {
  document?: Document;
  navigator?: Navigator;
  location?: Location;
  localStorage?: Storage;
  sessionStorage?: Storage;
  performance?: { now(): number };
  matchMedia?: (query: string) => MediaQueryList;
  requestAnimationFrame?: (callback: (time: number) => void) => number;
  setTimeout?: (callback: () => void, delayMs?: number) => unknown;
  addEventListener?: Window["addEventListener"];
  OffscreenCanvas?: typeof OffscreenCanvas;
  PressureObserver?: new (callback: (records: PressureRecordLike[]) => void) => PressureObserverLike;
  fetch?: typeof fetch;
  __framebudget?: BootState;
}
