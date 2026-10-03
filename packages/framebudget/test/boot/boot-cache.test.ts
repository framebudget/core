import { describe, expect, it } from "vitest";
import { bootScript } from "../../src/boot/index";
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
});
