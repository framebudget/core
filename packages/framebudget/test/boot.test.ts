import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { bootScript, createBootScript } from "../src/boot";
import { createBudget } from "../src/budget";
import { calibrationKey, defaultCalibration } from "../src/calibration";
import type { BootState, Scope } from "../src/env";
import { STORAGE_KEY } from "../src/storage";
import { TIERS } from "../src/tiers";
import { FakeStorage } from "./fake-browser";

interface Sandbox {
  attrs: Record<string, string>;
  window: Record<string, unknown> & { __framebudget?: BootState };
}

/** Runs the script the way a browser runs an inline <script>: as a classic script against `window`. */
function runBoot(source: string, globals: Record<string, unknown> = {}, withDocument = true): Sandbox {
  const attrs: Record<string, string> = {};
  const window: Record<string, unknown> = withDocument
    ? { document: { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = String(v)) } } }
    : {};
  Object.defineProperties(window, Object.getOwnPropertyDescriptors(globals));
  window.window = window;
  vm.createContext(window);
  vm.runInContext(source, window);
  return { attrs, window };
}

const throwing = (): never => {
  throw new Error("SecurityError");
};

function cached(score: number, extra: Record<string, unknown> = {}): FakeStorage {
  const local = new FakeStorage();
  local.setItem(
    STORAGE_KEY,
    JSON.stringify({ v: 1, key: calibrationKey(defaultCalibration), score, at: Date.now(), blocked: {}, ...extra }),
  );
  return local;
}

describe("boot script", () => {
  it("sets the tier on <html> in a browser missing every optional API", () => {
    // No navigator, storage, matchMedia, performance, location or OffscreenCanvas.
    const { attrs, window } = runBoot(bootScript);
    expect(TIERS).toContain(attrs["data-framebudget"]);
    expect(typeof attrs["data-framebudget-effects"]).toBe("string");
    expect(window.__framebudget).toMatchObject({ v: 1, tier: attrs["data-framebudget"] });
    expect(["cold", "fallback"]).toContain(window.__framebudget!.source);
  });

  it("survives globals that throw on access", () => {
    const hostile: Record<string, unknown> = {};
    for (const name of ["navigator", "localStorage", "sessionStorage", "location", "OffscreenCanvas"]) {
      Object.defineProperty(hostile, name, { get: throwing });
    }
    hostile.matchMedia = throwing;
    hostile.performance = { now: throwing };
    const { attrs, window } = runBoot(bootScript, hostile);
    expect(window.__framebudget!.source).toBe("fallback");
    expect(attrs["data-framebudget"]).toBe(window.__framebudget!.tier);
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

  it("uses the cached warm score from an earlier page and the effects learned there", () => {
    const local = cached(130, { blocked: { blur: { clean: 0, fails: 1 } } });
    const { attrs, window } = runBoot(bootScript, { localStorage: local });
    expect(window.__framebudget).toMatchObject({ source: "cached", score: 130, cold: null });
    const effects = attrs["data-framebudget-effects"]!.split(" ");
    expect(effects).toContain("canvasHiRes");
    expect(effects).not.toContain("blur");
    expect(attrs["data-framebudget"]).toBe("High");
  });

  it("ignores a cached score measured against other reference rates", () => {
    const local = new FakeStorage();
    local.setItem(STORAGE_KEY, JSON.stringify({ v: 1, key: "old:1,2,3,4", score: 130, at: Date.now(), blocked: {} }));
    const { window } = runBoot(bootScript, { localStorage: local });
    expect(window.__framebudget!.source).not.toBe("cached");
  });

  it("applies hysteresis across pages from the effects that qualified last time", () => {
    // parallax: threshold 70, kept on down to 63.
    const wasOn = runBoot(bootScript, { localStorage: cached(66, { qualified: ["hover", "parallax"] }) });
    expect(wasOn.attrs["data-framebudget-effects"]!.split(" ")).toContain("parallax");
    const fresh = runBoot(bootScript, { localStorage: cached(66) });
    expect(fresh.attrs["data-framebudget-effects"]!.split(" ")).not.toContain("parallax");
  });

  it("forces a tier from the URL for the rest of the session", () => {
    const session = new FakeStorage();
    const forced = runBoot(bootScript, { location: { search: "?a=1&framebudget-tier=lite" }, sessionStorage: session });
    expect(forced.attrs).toEqual({ "data-framebudget": "Lite", "data-framebudget-effects": "hover" });

    const nextPage = runBoot(bootScript, { location: { search: "" }, sessionStorage: session, localStorage: cached(130) });
    expect(nextPage.attrs["data-framebudget"]).toBe("Lite");

    const auto = runBoot(bootScript, { location: { search: "?framebudget-tier=auto" }, sessionStorage: session, localStorage: cached(130) });
    expect(auto.attrs["data-framebudget"]).toBe("Full");
    expect(session.getItem("framebudget-tier")).toBeNull();
  });

  it("inlines options, escaped so they cannot close the script tag", () => {
    const source = createBootScript({
      calibration: { effects: { confetti: { threshold: 10, cost: 1 } }, version: "</script><script>alert(1)" },
    });
    expect(source).not.toContain("</script");
    const { attrs } = runBoot(source, { localStorage: cached(50) });
    expect(attrs["data-framebudget-effects"]!.split(" ")).toContain("confetti");
  });

  it("hands its decision to the core, which starts from it without measuring again", () => {
    const local = cached(100);
    const { window } = runBoot(bootScript, { localStorage: local });
    const b = createBudget({ scope: window as Scope, pause: () => new Promise(() => {}) });
    expect(b.tier).toBe(window.__framebudget!.tier);
    expect(b.effects().sort()).toEqual(window.__framebudget!.effects.slice().sort());
    expect(b.snapshot()).toMatchObject({ source: "cached", cold: null });
  });
});
