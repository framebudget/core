import { describe, expect, it } from "vitest";
import { harness } from "./governor-harness";

describe("governor", () => {
  it("ignores gaps that are not frames (hidden tab, debugger)", () => {
    const governed = harness();
    governed.clock.time = 1000;
    governed.frames(12, 5000);
    expect(governed.strikeOuts).toEqual([]);
    expect(governed.governor.fps()).toEqual({});
  });

  it("calls a visit clean once, and never after a step down", () => {
    const governed = harness();
    governed.clock.time = 1000;
    governed.frames(4 * 6, 16.7);
    expect(governed.cleans()).toBe(1);

    const stuttered = harness();
    stuttered.clock.time = 1000;
    stuttered.frames(12, 33);
    stuttered.frames(4 * 6, 16.7);
    expect(stuttered.cleans()).toBe(0);
  });

  it("reports the median frame rate per source", () => {
    const governed = harness();
    governed.clock.time = 1000;
    governed.frames(8, 20, "main");
    governed.frames(4, 10, "canvasHiRes");
    expect(governed.governor.fps()).toEqual({ main: 50, canvasHiRes: 100 });
  });
});
