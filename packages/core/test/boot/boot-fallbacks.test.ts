import { describe, expect, it } from "vitest";
import { bootScript } from "../../src/boot/index";
import { TIERS } from "../../src/core/tier/tier-order";
import { runBoot, throwing } from "./run-boot";

describe("boot script in a hostile or bare browser", () => {
  it("sets the tier on <html> in a browser missing every optional API", () => {
    // No navigator, storage, matchMedia, performance, location or OffscreenCanvas.
    const { attributes, window } = runBoot(bootScript);
    expect(TIERS).toContain(attributes["data-framebudget"]);
    expect(typeof attributes["data-framebudget-effects"]).toBe("string");
    expect(window.__framebudget).toMatchObject({ v: 1, tier: attributes["data-framebudget"] });
    expect(["cold", "fallback"]).toContain(window.__framebudget!.source);
  });

  it("survives globals that throw on access", () => {
    const hostile: Record<string, unknown> = {};
    for (const name of ["navigator", "localStorage", "sessionStorage", "location", "OffscreenCanvas"]) {
      Object.defineProperty(hostile, name, { get: throwing });
    }
    hostile.matchMedia = throwing;
    hostile.performance = { now: throwing };
    const { attributes, window } = runBoot(bootScript, hostile);
    expect(window.__framebudget!.source).toBe("fallback");
    expect(attributes["data-framebudget"]).toBe(window.__framebudget!.tier);
  });

  it("does not throw without a document", () => {
    expect(() => runBoot(bootScript, {}, false)).not.toThrow();
  });

  it("measures cold within its budget when there is nothing cached", () => {
    let reads = 0;
    const start = performance.now();
    const { window } = runBoot(bootScript, {
      performance: {
        now() {
          reads += 1;
          return performance.now();
        },
      },
    });
    const elapsed = performance.now() - start;
    expect(window.__framebudget!.source).toBe("cold");
    expect(window.__framebudget!.cold!.score).toBeGreaterThan(0);
    expect(reads).toBeGreaterThan(10);
    // 2 ms of slices plus clock alignment; generous for slow CI machines.
    expect(elapsed).toBeLessThan(25);
  });
});
