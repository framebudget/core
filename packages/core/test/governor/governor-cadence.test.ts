import { describe, expect, it } from "vitest";
import { harness } from "./governor-harness";

describe("governor cadence", () => {
  it("judges a display that never drew faster than 30 Hz against its own cadence, and 30 fps is not under minFps", () => {
    const governed = harness("kept");
    governed.clock.time = 1000;
    governed.frames(16, 33.3); // a power-saving cap: steady, never faster
    expect(governed.strikeOuts).toEqual([]);
    expect(governed.governor.fps().main).toBeCloseTo(30, 0);
    for (let window = 0; window < 3; window++) for (const gap of [33.3, 66.6, 66.6, 33.3]) governed.frames(1, gap);
    expect(governed.strikeOuts).toEqual(["main"]); // frames late even for the cap
  });

  it("checks a step under a steady rate below minFps, and finds it does not help when the display is capped", () => {
    const governed = harness("trial");
    governed.clock.time = 1000;
    governed.frames(12, 40); // a steady 25 Hz cap, under the default minFps of 30
    expect(governed.strikeOuts).toEqual(["main"]);
    governed.frames(40, 40); // past the cooldown, three windows as slow as before
    expect(governed.trials).toEqual([false]);
  });

  it("counts 30 fps frames late once the display drew at 60 Hz", () => {
    const governed = harness();
    governed.clock.time = 1000;
    governed.frames(4, 16.7);
    governed.frames(12, 33.3);
    expect(governed.strikeOuts).toEqual(["main"]);
  });

  it("holds a 120 Hz display to 60 fps at most", () => {
    const governed = harness();
    governed.clock.time = 1000;
    governed.frames(4, 8.3);
    governed.frames(12, 16.7);
    expect(governed.strikeOuts).toEqual([]);
  });

  it("learns the cadence from frames in the warm-up too", () => {
    const governed = harness();
    governed.frames(56, 16.7); // 935 ms, inside the 1000 ms warm-up: not judged, but the display drew at 60 Hz
    governed.frames(16, 33.3); // the first window still starts in the warm-up
    expect(governed.strikeOuts).toEqual(["main"]);
  });
});
