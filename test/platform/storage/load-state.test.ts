import { describe, expect, it } from "vitest";
import { loadState } from "../../../src/platform/storage/load-state";
import { STORAGE_KEY } from "../../../src/platform/storage/storage.constants";
import { createFakeStorage } from "../../support/fake-storage";

describe("loadState", () => {
  it("reads back what it wrote and survives corrupt storage", () => {
    const storage = createFakeStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    expect(loadState(storage as unknown as Storage)).toEqual({ v: 1, blocked: {} });
    storage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, blocked: { blur: { clean: "x" } }, score: "fast" }));
    expect(loadState(storage as unknown as Storage)).toMatchObject({ blocked: {}, score: undefined });
  });
});
