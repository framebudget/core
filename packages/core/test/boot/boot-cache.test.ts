import { describe, expect, it } from "vitest";
import { bootScript, createBootScript } from "../../src/boot/index";
import { STORAGE_KEY } from "../../src/platform/storage/storage.constants";
import { createFakeStorage } from "../support/fake-storage";
import { cached, runBoot } from "./run-boot";

describe("boot script with a score cached by an earlier page", () => {
  it("uses the cached warm score from an earlier page and the effects learned there", () => {
    const local = cached(130, { blocked: { blur: { clean: 0, fails: 1 } } });
    const { attributes, window } = runBoot(bootScript, { localStorage: local });
    expect(window.__framebudget).toMatchObject({ source: "cached", score: 130, cold: null });
    const effects = attributes["data-framebudget-effects"]!.split(" ");
    expect(effects).toContain("canvasHiRes");
    expect(effects).not.toContain("blur");
    expect(attributes["data-framebudget"]).toBe("High");
  });

  it("ignores a cached score measured against other reference rates", () => {
    const local = createFakeStorage();
    local.setItem(STORAGE_KEY, JSON.stringify({ v: 1, key: "old:1,2,3,4", score: 130, at: Date.now(), blocked: {} }));
    const { window } = runBoot(bootScript, { localStorage: local });
    expect(window.__framebudget!.source).not.toBe("cached");
  });

  it("applies hysteresis across pages from the effects that qualified last time", () => {
    // parallax: threshold 70, kept on down to 63.
    const wasOn = runBoot(bootScript, { localStorage: cached(66, { qualified: ["hover", "parallax"] }) });
    expect(wasOn.attributes["data-framebudget-effects"]!.split(" ")).toContain("parallax");
    const fresh = runBoot(bootScript, { localStorage: cached(66) });
    expect(fresh.attributes["data-framebudget-effects"]!.split(" ")).not.toContain("parallax");
  });

  it("decides a weighted effect on the cached kernel ratios before the first paint", () => {
    // Fast at float math, slow at path building: 130 overall, 60 for an effect that only builds paths.
    const ratios = { float: 2.8, typed: 1.3, alloc: 1.3, path: 0.6 };
    const script = createBootScript({ calibration: { effects: { blur: { weights: { path: 1 } } } } });
    const weighted = runBoot(script, { localStorage: cached(130, { ratios }) });
    const effects = weighted.attributes["data-framebudget-effects"]!.split(" ");
    expect(effects).toContain("canvasHiRes");
    expect(effects).not.toContain("blur");
    const unweighted = runBoot(bootScript, { localStorage: cached(130, { ratios }) });
    expect(unweighted.attributes["data-framebudget-effects"]!.split(" ")).toContain("blur");
  });
});
