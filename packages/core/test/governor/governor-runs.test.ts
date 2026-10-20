import { describe, expect, it } from "vitest";
import { harness, OPTIONS } from "./governor-harness";

// OPTIONS: windows of 4 frames, 3 strikes, 1000 ms warm-up, 500 ms cooldown, minFps 30, minRunMs 250.
describe("governor runs", () => {
  it("judges an effect's frames during the warm-up, but not main-thread frames", () => {
    const effect = harness();
    effect.frames(12, 50, "entrances"); // 600 ms at 20 fps, all inside the warm-up
    expect(effect.strikeOuts).toEqual(["entrances"]);

    const main = harness();
    main.frames(12, 50);
    expect(main.strikeOuts).toEqual([]);
  });

  it("steps an effect down when a run too short to strike out ends under minFps", () => {
    const governed = harness();
    governed.frames(8, 50, "pageTransition"); // 400 ms at 20 fps: two bad windows, one strike short
    expect(governed.strikeOuts).toEqual([]);
    expect(governed.governor.endRuns(1000)).toBe(1); // still open: it reported a frame just now
    governed.clock.time += 1000;
    expect(governed.governor.endRuns(1000)).toBe(0);
    expect(governed.strikeOuts).toEqual(["pageTransition"]);
  });

  it("keeps an effect whose run ends at or above minFps, and shows the run's frame rate", () => {
    const governed = harness();
    governed.frames(3, 25, "entrances"); // 75 ms
    governed.frames(9, 33.3, "entrances"); // the run averages 32 fps over 375 ms
    governed.governor.endRuns(0);
    expect(governed.strikeOuts).toEqual([]);

    const short = harness("kept", { ...OPTIONS, windowFrames: 30 });
    short.frames(10, 40, "pageTransition"); // 400 ms at 25 fps, never a whole window
    short.governor.endRuns(0);
    expect(short.strikeOuts).toEqual(["pageTransition"]);
    expect(short.governor.fps().pageTransition).toBeCloseTo(25, 5);
  });

  it("does not judge a run shorter than minRunMs", () => {
    const governed = harness("kept", { ...OPTIONS, windowFrames: 30 });
    governed.frames(4, 50, "entrances"); // 200 ms at 20 fps
    governed.governor.endRuns(0);
    expect(governed.strikeOuts).toEqual([]);
  });

  it("starts a run after the cooldown: frames before a step down do not count", () => {
    const governed = harness("kept", { ...OPTIONS, windowFrames: 30 });
    governed.frames(10, 50, "blur");
    governed.governor.endRuns(0);
    expect(governed.strikeOuts).toEqual(["blur"]);
    governed.frames(8, 50, "entrances"); // 400 ms, inside the 500 ms cooldown
    governed.frames(6, 16.7, "entrances"); // then 100 ms at 60 fps
    governed.governor.endRuns(0);
    expect(governed.strikeOuts).toEqual(["blur"]);
  });
});
