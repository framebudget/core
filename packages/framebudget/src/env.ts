import type { BenchResult } from "./bench";
import type { Tier } from "./tiers";

export type PressureState = "nominal" | "fair" | "serious" | "critical";

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

export type ScoreSource = "cold" | "cached" | "warm" | "fallback" | "simulated";

interface PressureRecordLike {
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
  requestAnimationFrame?: (cb: (time: number) => void) => number;
  setTimeout?: (cb: () => void, ms?: number) => unknown;
  addEventListener?: Window["addEventListener"];
  OffscreenCanvas?: typeof OffscreenCanvas;
  PressureObserver?: new (cb: (records: PressureRecordLike[]) => void) => PressureObserverLike;
  fetch?: typeof fetch;
  __framebudget?: BootState;
}

/** The current window, or undefined outside a browser. */
export function getScope(): Scope | undefined {
  return typeof window !== "undefined" ? (window as unknown as Scope) : undefined;
}

/** Runs `fn`, turning any exception into undefined (storage, permissions, odd browsers). */
export function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

/** A clock that works without `performance`. */
export function clock(scope: Scope): () => number {
  const perf = safe(() => scope.performance);
  return perf && typeof perf.now === "function" ? () => perf.now() : () => Date.now();
}
