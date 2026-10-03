import { createBudget } from "../src/budget";
import type { BootState, Scope } from "../src/env";

export class FakeStorage {
  data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

export interface FakeBrowserOptions {
  search?: string;
  gpc?: boolean;
  saveData?: boolean;
  reducedMotion?: boolean;
  deviceMemory?: number;
  local?: FakeStorage;
  session?: FakeStorage;
  fetch?: (url: string, init?: RequestInit) => Promise<unknown>;
}

/**
 * A small browser: a document root that records attributes, storage, a fake
 * clock that advances a little on every read (like a real one), manual timers
 * and recorded event listeners. No requestAnimationFrame, no OffscreenCanvas.
 */
export function fakeBrowser(options: FakeBrowserOptions = {}) {
  const attrs: Record<string, string> = {};
  const listeners: Record<string, (() => void)[]> = {};
  const timers: (() => void)[] = [];
  const beacons: { url: string; body: string }[] = [];
  const clock = { t: 1000 };
  const navigator = {
    hardwareConcurrency: 8,
    deviceMemory: options.deviceMemory ?? 8,
    globalPrivacyControl: options.gpc ?? false,
    connection: { saveData: options.saveData ?? false, effectiveType: "4g" },
    sendBeacon(url: string, body: string) {
      beacons.push({ url, body });
      return true;
    },
  };
  const document = {
    readyState: "complete",
    visibilityState: "visible",
    documentElement: {
      setAttribute(name: string, value: string) {
        attrs[name] = value;
      },
    },
    addEventListener(type: string, fn: () => void) {
      (listeners["document:" + type] ||= []).push(fn);
    },
  };
  const local = options.local ?? new FakeStorage();
  const session = options.session ?? new FakeStorage();
  const scope = {
    document,
    navigator,
    location: { search: options.search ?? "" },
    localStorage: local,
    sessionStorage: session,
    performance: {
      now() {
        clock.t += 0.01;
        return clock.t;
      },
    },
    matchMedia: (query: string) => ({
      matches: query.includes("reduced-motion") && options.reducedMotion === true,
      addEventListener() {},
    }),
    setTimeout(fn: () => void) {
      timers.push(fn);
      return timers.length;
    },
    addEventListener(type: string, fn: () => void) {
      (listeners[type] ||= []).push(fn);
    },
    fetch: options.fetch,
  } as unknown as Scope;

  return {
    scope,
    attrs,
    navigator,
    document,
    beacons,
    local,
    session,
    clock,
    /** Runs pending timers, then lets promise chains (warm benchmark, fetch) settle. */
    async settle(): Promise<void> {
      for (let i = 0; i < 5; i++) {
        while (timers.length) timers.shift()!();
        const { promise, resolve } = Promise.withResolvers<void>();
        setTimeout(resolve, 0);
        await promise;
      }
    },
    fire(type: string): void {
      for (const fn of listeners[type] || []) fn();
    },
  };
}

/** A page whose boot script measured `score`; the warm benchmark never finishes. */
export function bootedPage(score: number, local = new FakeStorage(), session = new FakeStorage()) {
  const browser = fakeBrowser({ local, session });
  const boot: BootState = {
    v: 1,
    score,
    source: "cold",
    cold: null,
    tier: "Full",
    effects: [],
    qualified: [],
    forced: null,
  };
  browser.scope.__framebudget = boot;
  const b = createBudget({ scope: browser.scope, pause: () => new Promise(() => {}) });
  b.configure({ governor: { auto: false, warmupMs: 0, cooldownMs: 0, windowFrames: 2, strikes: 1, cleanWindows: 2 } });
  return { browser, b, local, session };
}
