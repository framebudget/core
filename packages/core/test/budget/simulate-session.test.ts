import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { bootScript } from "../../src/boot/index";
import { createBudget } from "../../src/budget/create-budget";
import { calibrationKey } from "../../src/core/calibration/calibration-key";
import { defaultCalibration } from "../../src/core/calibration/default-calibration";
import { STORAGE_KEY } from "../../src/platform/storage/storage.constants";
import { pauseForever } from "../support/booted-page";
import { fakeBrowser } from "../support/fake-browser";
import type { FakeStorage } from "../support/fake-browser.types";
import { createFakeStorage } from "../support/fake-storage";

/** Runs the boot script in a fresh window that shares the given storage; returns the root attributes. */
function runBoot(search: string, local: FakeStorage, session: FakeStorage): Record<string, string> {
  const attributes: Record<string, string> = {};
  const window: Record<string, unknown> = {
    document: { documentElement: { setAttribute: (key: string, value: string) => (attributes[key] = value) } },
    location: { search },
    sessionStorage: session,
    localStorage: local,
  };
  window.window = window;
  vm.createContext(window);
  vm.runInContext(bootScript, window);
  return attributes;
}

describe("simulate across the session", () => {
  it("persists for the session in both the boot script and the core, set from the URL or the API", () => {
    const session = createFakeStorage();
    // The real device: a cached warm score of 130 (Full), so no benchmark runs.
    const local = createFakeStorage();
    local.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, key: calibrationKey(defaultCalibration), score: 130, at: Date.now(), blocked: {} }),
    );
    const run = (search: string): Record<string, string> => runBoot(search, local, session);

    expect(run("?framebudget-score=40")["data-framebudget"]).toBe("Medium");
    expect(run("")["data-framebudget"]).toBe("Medium");

    const browser = fakeBrowser({ session });
    const budget = createBudget({ scope: browser.scope, pause: pauseForever });
    expect(budget.snapshot().simulated).toBe(40);
    budget.simulate(10);
    expect(run("")["data-framebudget-effects"]).toBe("");
    budget.simulate(null);
    expect(run("")["data-framebudget"]).toBe("Full");

    run("?framebudget-score=25");
    expect(run("?framebudget-score=off")["data-framebudget"]).toBe("Full");
    expect(session.getItem("framebudget-score")).toBeNull();
  });

  it("sends no telemetry while simulating", async () => {
    const browser = fakeBrowser();
    const budget = createBudget({ scope: browser.scope, random: () => 0, pause: () => Promise.resolve() });
    budget.configure({ share: { sampleRate: 1 }, governor: { auto: false } });
    await browser.settle();
    budget.simulate(40);
    browser.fire("pagehide");
    expect(browser.beacons).toEqual([]);
  });

  it("rejects scores that are not numbers of 0 or more", () => {
    const budget = createBudget({ scope: null });
    expect(() => {
      budget.simulate(-1);
    }).toThrow(RangeError);
    expect(() => {
      budget.simulate(NaN);
    }).toThrow(RangeError);
  });
});
