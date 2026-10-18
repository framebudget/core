import { describe, expect, it } from "vitest";
import { harness } from "./governor-harness";

/** Two of four frames miss a 60 Hz frame: more than the tolerated quarter. */
const STUTTER = [16.7, 50, 16.7, 50];

describe("governor", () => {
  it("does not judge windows that start during warm-up", () => {
    const governed = harness();
    governed.frames(28, 33); // 924 ms, inside the 1000 ms warm-up
    expect(governed.verdicts).toEqual([]);
    expect(governed.strikeOuts).toEqual([]);
  });

  it("strikes out on windows with too many late frames, and a good window resets the strikes", () => {
    const governed = harness();
    governed.clock.time = 1000;
    governed.frames(4, 16.7);
    for (const gap of [...STUTTER, ...STUTTER]) governed.frames(1, gap);
    governed.frames(4, 16.7); // good window resets
    for (const gap of [...STUTTER, ...STUTTER]) governed.frames(1, gap);
    expect(governed.strikeOuts).toEqual([]);
    for (const gap of STUTTER) governed.frames(1, gap);
    expect(governed.strikeOuts).toEqual(["main"]);
  });

  it("tolerates one late frame in a window", () => {
    const governed = harness();
    governed.clock.time = 1000;
    for (let window = 0; window < 3; window++) {
      governed.frames(3, 16.7);
      governed.frames(1, 40); // late, but the window still runs over minFps
    }
    expect(governed.strikeOuts).toEqual([]);
  });

  it("strikes out on a steady rate under minFps", () => {
    const governed = harness();
    governed.clock.time = 1000;
    governed.frames(12, 50); // 20 fps, never faster: no late frame, but too slow
    expect(governed.strikeOuts).toEqual(["main"]);
  });

  it("keeps strikes per source and reports the source that struck out", () => {
    const governed = harness();
    governed.clock.time = 1000;
    for (let index = 0; index < 3; index++) {
      governed.frames(4, 50, "worker");
      governed.frames(4, 16.7, "main");
    }
    expect(governed.strikeOuts).toEqual(["worker"]);
  });

  it("does not judge windows that start in the cooldown after a step down", () => {
    const governed = harness();
    governed.clock.time = 1000;
    governed.frames(12, 50);
    expect(governed.strikeOuts).toHaveLength(1);
    const judged = governed.verdicts.length;
    governed.frames(12, 50); // windows start at +50, +250, +450 ms: inside the 500 ms cooldown
    expect(governed.verdicts).toHaveLength(judged);
    governed.frames(12, 50);
    expect(governed.strikeOuts).toHaveLength(2);
  });
});
