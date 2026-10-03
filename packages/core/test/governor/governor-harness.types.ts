import type { Governor } from "../../src/governor/governor.types";

/** A governor on a fake clock that records what its hooks were called with. */
export interface GovernorHarness {
  clock: { time: number };
  governor: Governor;
  strikeOuts: string[];
  /** Advances the clock by `gap` and reports that gap, `count` times. */
  frames: (count: number, gap: number, source?: string) => void;
  cleans: () => number;
}
