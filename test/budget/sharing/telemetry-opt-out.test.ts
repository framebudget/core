import { describe, expect, it } from "vitest";
import { loadedPage, SHARE } from "../loaded-page";

describe("telemetry opt-out", () => {
  it("sends nothing once the site turns sharing off with share: null, even after it was armed", async () => {
    const { browser, budget } = await loadedPage({}, SHARE);
    budget.configure({ share: null });
    browser.fire("pagehide");
    expect(browser.beacons).toEqual([]);

    budget.configure({ share: SHARE });
    browser.fire("pagehide");
    expect(browser.beacons).toHaveLength(1);
  });
});
