import { describe, expect, it } from "vitest";
import { harness } from "./governor-harness";
import type { GovernorHarness } from "./governor-harness.types";

describe("governor", () => {
  it("ignores gaps that are not frames (hidden tab, debugger)", () => {
    const governed = harness();
    governed.clock.time = 1000;
    governed.frames(12, 5000);
    expect(governed.strikeOuts).toEqual([]);
    expect(governed.governor.fps()).toEqual({});
  });

  it("reports frames per second and late frames over all judged frames, not a median", () => {
    const governed = harness();
    governed.clock.time = 1000;
    governed.frames(4, 16.7);
    for (let window = 0; window < 3; window++) {
      governed.frames(3, 16.7);
      governed.frames(1, 50);
    }
    // 16 frames in 4 * 66.8 + 3 * 33.3 ms. A median per window would say 60 fps.
    expect(governed.governor.fps().main).toBeCloseTo((16 * 1000) / (4 * 66.8 + 3 * 33.3), 6);
    expect(governed.governor.late().main).toBeCloseTo(3 / 16, 6);
  });

  it("reports each judged source", () => {
    const governed = harness();
    governed.clock.time = 1000;
    governed.frames(8, 20, "main");
    governed.frames(4, 10, "canvasHiRes");
    expect(governed.governor.fps()).toEqual({ main: 50, canvasHiRes: 100 });
  });
});

/** A strike-out on a guess: three stuttering windows after a good one. */
function struckOnGuess(extensions = 0): GovernorHarness {
  const governed = harness("trial", undefined, extensions);
  governed.clock.time = 1000;
  governed.frames(4, 16.7);
  for (let window = 0; window < 3; window++) for (const gap of [50, 50, 50, 16.7]) governed.frames(1, gap);
  expect(governed.strikeOuts).toEqual(["main"]);
  return governed;
}

describe("governor trials", () => {
  it("calls a step that brings back a good window helpful", () => {
    const governed = struckOnGuess();
    governed.frames(60, 16.7);
    expect(governed.trials).toEqual([true]);
  });

  it("calls a step that changes nothing unhelpful, and waits another cooldown", () => {
    const governed = struckOnGuess();
    for (let window = 0; window < 6; window++) for (const gap of [50, 50, 50, 16.7]) governed.frames(1, gap);
    expect(governed.trials).toEqual([false]);
    const judged = governed.verdicts.length;
    governed.frames(8, 50); // 400 ms, inside the new cooldown
    expect(governed.verdicts).toHaveLength(judged);
  });

  it("calls a step helpful when the frame rate rises enough, even with every window still bad", () => {
    const governed = struckOnGuess(); // 24 fps windows
    for (let window = 0; window < 8; window++) for (const gap of [16.7, 16.7, 50, 50]) governed.frames(1, gap); // 30 fps
    expect(governed.verdicts.slice(-3)).toEqual([false, false, false]);
    expect(governed.trials).toEqual([true]);
  });

  it("checks a further guess against the frame rate before the first one", () => {
    const governed = struckOnGuess(1); // 24 fps windows
    for (let window = 0; window < 6; window++) for (const gap of [50, 50, 50, 16.7]) governed.frames(1, gap);
    expect(governed.trials).toEqual([false]); // no gain: one more guess, checked again
    for (let window = 0; window < 8; window++) for (const gap of [16.7, 16.7, 50, 50]) governed.frames(1, gap); // 30 fps
    expect(governed.trials).toEqual([false, true]);
    expect(governed.strikeOuts).toEqual(["main"]);
  });

  it("checks the step only on the source that struck out, and no source strikes out meanwhile", () => {
    const governed = struckOnGuess();
    governed.frames(80, 50, "worker");
    expect(governed.strikeOuts).toEqual(["main"]);
    expect(governed.trials).toEqual([]);
    governed.frames(60, 16.7, "main");
    expect(governed.trials).toEqual([true]);
  });
});
