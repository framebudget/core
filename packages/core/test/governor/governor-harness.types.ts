import type { Governor } from "../../src/governor/governor.types";

/** A governor on a fake clock that records what its hooks were called with. */
export interface GovernorHarness {
  clock: { time: number };
  governor: Governor;
  strikeOuts: string[];
  /** Trial verdicts, in order: true when the step helped. */
  trials: boolean[];
  /** Window verdicts, in order: true for a good window. */
  verdicts: boolean[];
  /** Advances the clock by `gap` and reports that gap, `count` times. */
  frames: (count: number, gap: number, source?: string) => void;
}
