import { describe, expect, it } from "vitest";
import { createGovernor, defaultGovernorOptions, type GovernorOptions } from "../src/governor";
import { bootedPage as page } from "./fake-browser";

const OPTIONS: GovernorOptions = {
  ...defaultGovernorOptions,
  targetFps: 50, // bad window: median gap over 20 ms
  windowFrames: 4,
  strikes: 3,
  warmupMs: 1000,
  cooldownMs: 500,
  cleanWindows: 3,
};

function harness(options: GovernorOptions = OPTIONS) {
  const clock = { t: 0 };
  const strikeOuts: string[] = [];
  let cleans = 0;
  const governor = createGovernor(options, () => clock.t, {
    strikeOut(source) {
      strikeOuts.push(source);
      return true;
    },
    clean() {
      cleans += 1;
    },
  });
  const frames = (count: number, gap: number, source?: string) => {
    for (let i = 0; i < count; i++) {
      clock.t += gap;
      governor.report(gap, source);
    }
  };
  return { clock, governor, strikeOuts, frames, cleans: () => cleans };
}

describe("governor", () => {
  it("ignores frames during warm-up", () => {
    const h = harness();
    h.frames(30, 33); // 990 ms of 30 fps, all inside the 1000 ms warm-up
    expect(h.strikeOuts).toEqual([]);
  });

  it("steps down after consecutive bad windows, and a good window resets the strikes", () => {
    const h = harness();
    h.clock.t = 1000;
    h.frames(8, 33); // two bad windows
    h.frames(4, 16.7); // good window resets
    h.frames(8, 33); // two bad windows
    expect(h.strikeOuts).toEqual([]);
    h.frames(4, 33); // third consecutive bad window
    expect(h.strikeOuts).toEqual(["main"]);
  });

  it("judges a window by its median, so one long frame is not a strike", () => {
    const h = harness();
    h.clock.t = 1000;
    for (let i = 0; i < 3; i++) {
      h.frames(3, 16.7);
      h.frames(1, 400);
    }
    expect(h.strikeOuts).toEqual([]);
  });

  it("keeps strikes per source and reports the source that struck out", () => {
    const h = harness();
    h.clock.t = 1000;
    for (let i = 0; i < 3; i++) {
      h.frames(4, 33, "worker");
      h.frames(4, 16.7, "main");
    }
    expect(h.strikeOuts).toEqual(["worker"]);
  });

  it("waits a cooldown after a step down before judging again", () => {
    const h = harness();
    h.clock.t = 1000;
    h.frames(12, 33);
    expect(h.strikeOuts).toHaveLength(1);
    h.frames(12, 33); // 396 ms, inside the 500 ms cooldown
    expect(h.strikeOuts).toHaveLength(1);
    h.frames(16, 33); // the first frames still fall in the cooldown
    expect(h.strikeOuts).toHaveLength(2);
  });

  it("ignores gaps that are not frames (hidden tab, debugger)", () => {
    const h = harness();
    h.clock.t = 1000;
    h.frames(12, 5000);
    expect(h.strikeOuts).toEqual([]);
    expect(h.governor.fps()).toEqual({});
  });

  it("calls a visit clean once, and never after a step down", () => {
    const h = harness();
    h.clock.t = 1000;
    h.frames(4 * 6, 16.7);
    expect(h.cleans()).toBe(1);

    const stuttered = harness();
    stuttered.clock.t = 1000;
    stuttered.frames(12, 33);
    stuttered.frames(4 * 6, 16.7);
    expect(stuttered.cleans()).toBe(0);
  });

  it("reports the median frame rate per source", () => {
    const h = harness();
    h.clock.t = 1000;
    h.frames(8, 20, "main");
    h.frames(4, 10, "canvasHiRes");
    expect(h.governor.fps()).toEqual({ main: 50, canvasHiRes: 100 });
  });
});

describe("governor in the budget", () => {
  it("steps the most expensive allowed effect down first, one per strike-out", async () => {
    const { browser, b } = page(200);
    await browser.settle();
    const reasons: string[] = [];
    b.on("change", (_s, reason) => reasons.push(reason));
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      const before = b.effects();
      b.reportFrame(40);
      b.reportFrame(40);
      order.push(...before.filter((e) => !b.effects().includes(e)));
    }
    // By cost; pageTransition and canvasLowRes cost the same, the higher threshold goes first.
    expect(order).toEqual(["canvasHiRes", "blur", "parallax", "pageTransition"]);
    expect(reasons).toEqual(["governor", "governor", "governor", "governor"]);
    expect(b.snapshot().stepped).toEqual(order);
    expect(b.tier).toBe("Medium");
    expect(browser.attrs["data-framebudget"]).toBe("Medium");
    expect(browser.attrs["data-framebudget-effects"]!.split(" ")).not.toContain("parallax");
  });

  it("steps down the effect whose own frames are slow", async () => {
    const { browser, b } = page(200);
    await browser.settle();
    b.reportFrame(40, "entrances");
    b.reportFrame(40, "entrances");
    expect(b.snapshot().stepped).toEqual(["entrances"]);
    expect(b.allows("canvasHiRes")).toBe(true);
  });

  it("does not step down while a tier is forced", async () => {
    const { browser, b } = page(200);
    await browser.settle();
    b.force("Full");
    b.reportFrame(40);
    b.reportFrame(40);
    expect(b.snapshot().stepped).toEqual([]);
    expect(b.allows("canvasHiRes")).toBe(true);
  });
});
