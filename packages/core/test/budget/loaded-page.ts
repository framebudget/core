import { createBudget } from "../../src/budget/create-budget";
import type { Budget } from "../../src/budget/budget.types";
import type { ShareOptions, ShareSetting } from "../../src/core/telemetry/telemetry.types";
import { fakeBrowser } from "../support/fake-browser";
import type { FakeBrowser, FakeBrowserOptions } from "../support/fake-browser.types";

export const SHARE: ShareOptions = { sampleRate: 1 };
/** The site's own endpoint, the optional second destination. */
export const OWN_ENDPOINT = "https://collect.example/fb";

/** A page after load: the warm benchmark finished and sharing started when configured. */
export async function loadedPage(
  options: FakeBrowserOptions = {},
  share?: ShareSetting,
  random = (): number => 0,
): Promise<{ browser: FakeBrowser; budget: Budget }> {
  const browser = fakeBrowser(options);
  const budget = createBudget({ scope: browser.scope, random, pause: () => Promise.resolve() });
  budget.configure(share ? { share, governor: { auto: false } } : { governor: { auto: false } });
  await browser.settle();
  return { browser, budget };
}
