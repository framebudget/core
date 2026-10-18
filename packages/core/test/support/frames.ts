import type { Budget } from "../../src/budget/budget.types";
import type { FakeBrowser } from "./fake-browser.types";

/** One bad window for the test governor of `bootedPage` (2 frames): 20 fps, under minFps. */
export function stutter(budget: Budget, source?: string): void {
  budget.reportFrame(50, source);
  budget.reportFrame(50, source);
}

/** Good windows for the test governor of `bootedPage` (2 frames each, 60 fps). */
export function smooth(budget: Budget, windows = 1): void {
  for (let index = 0; index < 2 * windows; index++) budget.reportFrame(16.7);
}

/**
 * Gives the fake browser a requestAnimationFrame. The returned function runs
 * up to `count` frames `gap` ms apart on the fake clock, one pending callback
 * each, and returns how many ran: fewer when nothing asked for a frame.
 */
export function animationFrames(browser: FakeBrowser): (gap: number, count?: number) => number {
  const pending: ((time: number) => void)[] = [];
  browser.scope.requestAnimationFrame = (callback) => {
    pending.push(callback);
    return pending.length;
  };
  return (gap, count = Infinity) => {
    let ran = 0;
    while (ran < count && pending.length > 0) {
      const callback = pending.shift()!;
      browser.clock.t += gap;
      callback(browser.clock.t);
      ran += 1;
    }
    return ran;
  };
}
