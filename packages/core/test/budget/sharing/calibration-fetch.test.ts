import { describe, expect, it } from "vitest";
import type { StoredState } from "../../../src/core/state/stored-state.types";
import { STORAGE_KEY } from "../../../src/platform/storage/storage.constants";
import { createFakeStorage } from "../../support/fake-storage";
import { loadedPage, SHARE } from "../loaded-page";

const remote = { version: "remote-2", effects: { parallax: { threshold: 999 } } };

/** A fetch that records its calls and always answers with the remote calibration. */
function fetcher(): {
  calls: { url: string; init?: RequestInit }[];
  fetch: (url: string, init?: RequestInit) => Promise<unknown>;
} {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetch = (url: string, init?: RequestInit): Promise<unknown> => {
    calls.push({ url, init });
    return Promise.resolve({ ok: true, json: () => Promise.resolve(remote) });
  };
  return { calls, fetch };
}

describe("calibration fetch", () => {
  it("stores the fetched calibration for the next visit without changing this one", async () => {
    const local = createFakeStorage();
    const fake = fetcher();
    const { budget } = await loadedPage(
      { local, fetch: fake.fetch },
      { ...SHARE, calibrationUrl: "https://collect.example/cal.json" },
    );
    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0]!.init).toMatchObject({ credentials: "omit" });
    expect(budget.snapshot().calibration.effects.parallax!.threshold).toBe(70);
    expect((JSON.parse(local.getItem(STORAGE_KEY)!) as StoredState).remote).toEqual(remote);

    const next = await loadedPage({ local, fetch: fake.fetch });
    expect(next.budget.snapshot().calibration.version).toBe("remote-2");
    expect(next.budget.snapshot().calibration.effects.parallax!.threshold).toBe(999);
    expect(next.budget.allows("parallax")).toBe(false);
  });

  it("fetches from framebudget.dev by default, and from calibrationUrl when the site sets one", async () => {
    const byDefault = fetcher();
    await loadedPage({ fetch: byDefault.fetch }, true);
    expect(byDefault.calls.map((call) => call.url)).toEqual(["https://framebudget.dev/api/calibration"]);

    const own = fetcher();
    await loadedPage({ fetch: own.fetch }, { ...SHARE, calibrationUrl: "https://collect.example/cal.json" });
    expect(own.calls.map((call) => call.url)).toEqual(["https://collect.example/cal.json"]);
  });

  it("fetches nothing without sharing, under Global Privacy Control, or under Save-Data", async () => {
    const fake = fetcher();
    const url = "https://collect.example/cal.json";
    await loadedPage({ fetch: fake.fetch });
    await loadedPage({ fetch: fake.fetch, gpc: true }, { ...SHARE, calibrationUrl: url });
    await loadedPage({ fetch: fake.fetch, saveData: true }, { ...SHARE, calibrationUrl: url });
    expect(fake.calls).toEqual([]);
  });
});
