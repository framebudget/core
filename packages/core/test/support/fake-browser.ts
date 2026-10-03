import type { Scope } from "../../src/platform/scope/scope.types";
import type { Beacon, FakeBrowser, FakeBrowserOptions, ListenerMap } from "./fake-browser.types";
import { fakeDocument, fakeNavigator } from "./fake-dom";
import { createFakeStorage } from "./fake-storage";

async function settleTimers(timers: (() => void)[]): Promise<void> {
  for (let round = 0; round < 5; round++) {
    while (timers.length > 0) timers.shift()!();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function fireListeners(listeners: ListenerMap, type: string): void {
  const registered = listeners[type] ?? [];
  for (const listener of registered) listener();
}

/**
 * A small browser: a document root that records attributes, storage, a fake
 * clock that advances a little on every read (like a real one), manual timers
 * and recorded event listeners. No requestAnimationFrame, no OffscreenCanvas.
 */
export function fakeBrowser(options: FakeBrowserOptions = {}): FakeBrowser {
  const attributes: Record<string, string> = {};
  const listeners: ListenerMap = {};
  const timers: (() => void)[] = [];
  const beacons: Beacon[] = [];
  const clock = { t: 1000 };
  const navigator = fakeNavigator(options, beacons);
  const document = fakeDocument(attributes, listeners);
  const local = options.local ?? createFakeStorage();
  const session = options.session ?? createFakeStorage();
  const scope = {
    document,
    navigator,
    location: { search: options.search ?? "" },
    localStorage: local,
    sessionStorage: session,
    performance: { now: () => (clock.t += 0.01) },
    matchMedia: (query: string) => ({
      matches: query.includes("reduced-motion") && options.reducedMotion === true,
      addEventListener() {
        // Reduced motion never changes in these tests.
      },
    }),
    setTimeout(callback: () => void) {
      timers.push(callback);
      return timers.length;
    },
    addEventListener(type: string, listener: () => void) {
      (listeners[type] ??= []).push(listener);
    },
    fetch: options.fetch,
  } as unknown as Scope;
  return {
    scope,
    attributes,
    navigator,
    document,
    beacons,
    local,
    session,
    clock,
    settle: () => settleTimers(timers),
    fire: (type) => {
      fireListeners(listeners, type);
    },
  };
}
