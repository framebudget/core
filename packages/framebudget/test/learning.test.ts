import { describe, expect, it } from "vitest";
import type { Budget } from "../src/budget";
import { defaultCalibration } from "../src/calibration";
import { learnedBlocks, recordCleanVisit, recordStutter } from "../src/learning";
import { loadState, STORAGE_KEY, type StoredState } from "../src/storage";
import { bootedPage, FakeStorage } from "./fake-browser";

const cal = defaultCalibration; // retryVisits: 5

describe("learning state", () => {
  it("blocks a stuttering effect until enough clean visits, doubling the wait after each new stutter", () => {
    const state: StoredState = { v: 1, blocked: {} };
    recordStutter(state, "blur");
    expect(learnedBlocks(state, cal)).toEqual(["blur"]);
    for (let i = 0; i < 4; i++) recordCleanVisit(state, []);
    expect(learnedBlocks(state, cal)).toEqual(["blur"]);
    recordCleanVisit(state, []);
    expect(learnedBlocks(state, cal)).toEqual([]); // fifth clean visit: retry

    recordStutter(state, "blur"); // the retry stuttered too
    for (let i = 0; i < 9; i++) recordCleanVisit(state, []);
    expect(learnedBlocks(state, cal)).toEqual(["blur"]);
    recordCleanVisit(state, []);
    expect(learnedBlocks(state, cal)).toEqual([]);
  });

  it("forgets an effect once a clean visit ran with it", () => {
    const state: StoredState = { v: 1, blocked: {} };
    recordStutter(state, "blur");
    recordStutter(state, "parallax");
    recordCleanVisit(state, ["blur", "hover"]);
    expect(state.blocked).toEqual({ parallax: { clean: 1, fails: 1 } });
  });

  it("reads back what it wrote and survives corrupt storage", () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    expect(loadState(storage as unknown as Storage)).toEqual({ v: 1, blocked: {} });
    storage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, blocked: { blur: { clean: "x" } }, score: "fast" }));
    expect(loadState(storage as unknown as Storage)).toMatchObject({ blocked: {}, score: undefined });
  });
});

/** Ends a visit with enough smooth frames to count as clean. */
function smooth(b: Budget): void {
  for (let i = 0; i < 4; i++) b.reportFrame(16.7);
}

describe("learning across visits", () => {
  it("starts the next visit without the effect that stuttered, then retries it after clean visits", async () => {
    const local = new FakeStorage();

    const first = bootedPage(200, local);
    await first.browser.settle();
    first.b.reportFrame(40);
    first.b.reportFrame(40);
    expect(first.b.snapshot().stepped).toEqual(["canvasHiRes"]);

    const visits = [];
    for (let i = 0; i < 5; i++) {
      const visit = bootedPage(200, local);
      await visit.browser.settle();
      visits.push(visit.b.snapshot());
      smooth(visit.b);
    }
    for (const s of visits) {
      expect(s.off.canvasHiRes).toBe("learned");
      expect(s.tier).toBe("High");
    }

    const retry = bootedPage(200, local);
    await retry.browser.settle();
    expect(retry.b.allows("canvasHiRes")).toBe(true);
    smooth(retry.b);
    expect(JSON.parse(local.getItem(STORAGE_KEY)!).blocked).toEqual({});
  });

  it("does not count a visit as clean when the governor stepped something down", async () => {
    const local = new FakeStorage();
    const first = bootedPage(200, local);
    await first.browser.settle();
    first.b.reportFrame(40);
    first.b.reportFrame(40);
    smooth(first.b);
    expect(JSON.parse(local.getItem(STORAGE_KEY)!).blocked).toEqual({ canvasHiRes: { clean: 0, fails: 1 } });
  });
});
