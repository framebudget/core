import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { bootScript } from "../src/boot";
import { createBudget, type ChangeReason } from "../src/budget";
import { calibrationKey, defaultCalibration } from "../src/calibration";
import { STORAGE_KEY } from "../src/storage";
import { bootedPage, fakeBrowser, FakeStorage } from "./fake-browser";

describe("simulate", () => {
  it("feeds the simulated score through thresholds and always emits change", async () => {
    const { browser, b } = bootedPage(200);
    await browser.settle();
    const events: [ChangeReason, string, number | null][] = [];
    b.on("change", (s, reason) => events.push([reason, s.tier, s.simulated]));

    b.simulate(40);
    expect(b.tier).toBe("Medium");
    expect(b.effects().sort()).toEqual(["canvasLowRes", "entrances", "hover"]);
    expect(b.snapshot()).toMatchObject({ simulated: 40, source: "simulated", rawScore: 40 });
    expect(browser.attrs["data-framebudget"]).toBe("Medium");

    b.simulate(40); // same device again: no decision change, still an event
    b.simulate(null);
    expect(b.tier).toBe("Full");
    expect(b.snapshot()).toMatchObject({ simulated: null, source: "cold", rawScore: 200 });
    expect(events).toEqual([
      ["simulate", "Medium", 40],
      ["simulate", "Medium", 40],
      ["simulate", "Full", null],
    ]);
  });

  it("keeps hysteresis between simulated devices", async () => {
    const { browser, b } = bootedPage(200);
    await browser.settle();
    // parallax: threshold 70, kept on down to 63, turned on again from 77.
    b.simulate(66);
    expect(b.allows("parallax")).toBe(true);
    b.simulate(60);
    expect(b.allows("parallax")).toBe(false);
    b.simulate(74);
    expect(b.allows("parallax")).toBe(false);
    b.simulate(78);
    expect(b.allows("parallax")).toBe(true);
  });

  it("lets the governor step down, stores nothing about the real device, and starts each device fresh", async () => {
    const local = new FakeStorage();
    const { browser, b } = bootedPage(200, local);
    await browser.settle();
    const before = local.getItem(STORAGE_KEY);

    b.simulate(150);
    b.reportFrame(40);
    b.reportFrame(40);
    expect(b.snapshot().stepped).toEqual(["canvasHiRes"]);
    for (let i = 0; i < 8; i++) b.reportFrame(16.7); // would make a clean visit
    b.simulate(50);
    expect(local.getItem(STORAGE_KEY)).toBe(before);
    expect(b.snapshot().stepped).toEqual([]);

    b.simulate(null);
    expect(b.allows("canvasHiRes")).toBe(true);
  });

  it("persists for the session in both the boot script and the core, set from the URL or the API", () => {
    const session = new FakeStorage();
    // The real device: a cached warm score of 130 (Full), so no benchmark runs.
    const local = new FakeStorage();
    local.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, key: calibrationKey(defaultCalibration), score: 130, at: Date.now(), blocked: {} }),
    );
    const run = (search: string) => {
      const attrs: Record<string, string> = {};
      const window: Record<string, unknown> = {
        document: { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } },
        location: { search },
        sessionStorage: session,
        localStorage: local,
      };
      window.window = window;
      vm.createContext(window);
      vm.runInContext(bootScript, window);
      return attrs;
    };

    expect(run("?framebudget-score=40")["data-framebudget"]).toBe("Medium");
    expect(run("")["data-framebudget"]).toBe("Medium");

    const browser = fakeBrowser({ session });
    const b = createBudget({ scope: browser.scope, pause: () => new Promise(() => {}) });
    expect(b.snapshot().simulated).toBe(40);
    b.simulate(10);
    expect(run("")["data-framebudget-effects"]).toBe("");
    b.simulate(null);
    expect(run("")["data-framebudget"]).toBe("Full");

    run("?framebudget-score=25");
    expect(run("?framebudget-score=off")["data-framebudget"]).toBe("Full");
    expect(session.getItem("framebudget-score")).toBeNull();
  });

  it("sends no telemetry while simulating", async () => {
    const browser = fakeBrowser();
    const b = createBudget({ scope: browser.scope, random: () => 0, pause: () => Promise.resolve() });
    b.configure({ share: { endpoint: "https://collect.example/fb", sampleRate: 1 }, governor: { auto: false } });
    await browser.settle();
    b.simulate(40);
    browser.fire("pagehide");
    expect(browser.beacons).toEqual([]);
  });

  it("rejects scores that are not numbers of 0 or more", () => {
    const b = createBudget({ scope: null });
    expect(() => b.simulate(-1)).toThrow(RangeError);
    expect(() => b.simulate(Number.NaN)).toThrow(RangeError);
  });
});
