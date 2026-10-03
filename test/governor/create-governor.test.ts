import { describe, expect, it } from "vitest";
import { harness } from "./governor-harness";

describe("governor", () => {
  it("ignores frames during warm-up", () => {
    const governed = harness();
    governed.frames(30, 33); // 990 ms of 30 fps, all inside the 1000 ms warm-up
    expect(governed.strikeOuts).toEqual([]);
  });

  it("steps down after consecutive bad windows, and a good window resets the strikes", () => {
    const governed = harness();
    governed.clock.time = 1000;
    governed.frames(8, 33); // two bad windows
    governed.frames(4, 16.7); // good window resets
    governed.frames(8, 33); // two bad windows
    expect(governed.strikeOuts).toEqual([]);
    governed.frames(4, 33); // third consecutive bad window
    expect(governed.strikeOuts).toEqual(["main"]);
  });

  it("judges a window by its median, so one long frame is not a strike", () => {
    const governed = harness();
    governed.clock.time = 1000;
    for (let index = 0; index < 3; index++) {
      governed.frames(3, 16.7);
      governed.frames(1, 400);
    }
    expect(governed.strikeOuts).toEqual([]);
  });

  it("keeps strikes per source and reports the source that struck out", () => {
    const governed = harness();
    governed.clock.time = 1000;
    for (let index = 0; index < 3; index++) {
      governed.frames(4, 33, "worker");
      governed.frames(4, 16.7, "main");
    }
    expect(governed.strikeOuts).toEqual(["worker"]);
  });

  it("waits a cooldown after a step down before judging again", () => {
    const governed = harness();
    governed.clock.time = 1000;
    governed.frames(12, 33);
    expect(governed.strikeOuts).toHaveLength(1);
    governed.frames(12, 33); // 396 ms, inside the 500 ms cooldown
    expect(governed.strikeOuts).toHaveLength(1);
    governed.frames(16, 33); // the first frames still fall in the cooldown
    expect(governed.strikeOuts).toHaveLength(2);
  });
});
