import { describe, expect, it } from "vitest";
import { createBudget } from "../src/budget";
import { STORAGE_KEY } from "../src/storage";
import type { ShareOptions } from "../src/telemetry";
import { fakeBrowser, FakeStorage, type FakeBrowserOptions } from "./fake-browser";

const SHARE: ShareOptions = { endpoint: "https://collect.example/fb", sampleRate: 1 };

async function loadedPage(options: FakeBrowserOptions = {}, share?: ShareOptions, random = () => 0) {
  const browser = fakeBrowser(options);
  const b = createBudget({ scope: browser.scope, random, pause: () => Promise.resolve() });
  b.configure(share ? { share, governor: { auto: false } } : { governor: { auto: false } });
  await browser.settle();
  return { browser, b };
}

describe("telemetry", () => {
  it("sends one anonymous report when the page is hidden, only if the site opted in", async () => {
    const { browser, b } = await loadedPage({}, SHARE);
    expect(b.snapshot().warm).not.toBeNull();
    browser.fire("pagehide");
    browser.fire("pagehide");
    expect(browser.beacons).toHaveLength(1);
    expect(browser.beacons[0]!.url).toBe(SHARE.endpoint);

    const report = JSON.parse(browser.beacons[0]!.body);
    expect(Object.keys(report).sort()).toEqual(
      ["cal", "cold", "effects", "fps", "hints", "kernels", "score", "stepped", "tickMs", "tier", "v", "warm"].sort(),
    );
    expect(Object.keys(report.hints).sort()).toEqual(["cores", "memoryGb", "reducedMotion"]);
    expect(report.tier).toBe(b.tier);
    expect(report.effects).toEqual(b.effects().sort());
  });

  it("sends nothing when sharing is not configured", async () => {
    const { browser } = await loadedPage();
    browser.fire("pagehide");
    expect(browser.beacons).toEqual([]);
  });

  it("sends nothing under Global Privacy Control or Save-Data", async () => {
    for (const options of [{ gpc: true }, { saveData: true }]) {
      const { browser } = await loadedPage(options, SHARE);
      browser.fire("pagehide");
      expect(browser.beacons).toEqual([]);
    }
  });

  it("checks Global Privacy Control again at send time", async () => {
    const { browser } = await loadedPage({}, SHARE);
    browser.navigator.globalPrivacyControl = true;
    browser.fire("pagehide");
    expect(browser.beacons).toEqual([]);
  });

  it("sends nothing from page views outside the sample or with a forced tier", async () => {
    const outside = await loadedPage({}, { ...SHARE, sampleRate: 0.1 }, () => 0.5);
    outside.browser.fire("pagehide");
    expect(outside.browser.beacons).toEqual([]);

    const forced = await loadedPage({ search: "?framebudget-tier=Full" }, SHARE);
    forced.browser.fire("pagehide");
    expect(forced.browser.beacons).toEqual([]);
  });
});

describe("calibration fetch", () => {
  function fetcher(body: unknown) {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetch = (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    };
    return { calls, fetch };
  }

  const remote = { version: "remote-2", effects: { parallax: { threshold: 999 } } };

  it("stores the fetched calibration for the next visit without changing this one", async () => {
    const local = new FakeStorage();
    const f = fetcher(remote);
    const { b } = await loadedPage({ local, fetch: f.fetch }, { ...SHARE, calibrationUrl: "https://collect.example/cal.json" });
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]!.init).toMatchObject({ credentials: "omit" });
    expect(b.snapshot().calibration.effects.parallax!.threshold).toBe(70);
    expect(JSON.parse(local.getItem(STORAGE_KEY)!).remote).toEqual(remote);

    const next = await loadedPage({ local, fetch: f.fetch });
    expect(next.b.snapshot().calibration.version).toBe("remote-2");
    expect(next.b.snapshot().calibration.effects.parallax!.threshold).toBe(999);
    expect(next.b.allows("parallax")).toBe(false);
  });

  it("fetches nothing without sharing, under Global Privacy Control, or under Save-Data", async () => {
    const f = fetcher(remote);
    const url = "https://collect.example/cal.json";
    await loadedPage({ fetch: f.fetch });
    await loadedPage({ fetch: f.fetch, gpc: true }, { ...SHARE, calibrationUrl: url });
    await loadedPage({ fetch: f.fetch, saveData: true }, { ...SHARE, calibrationUrl: url });
    expect(f.calls).toEqual([]);
  });
});
