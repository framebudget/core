import { createBudget } from "../../src/budget/create-budget";
import type { Budget } from "../../src/budget/budget.types";
import type { ShareOptions } from "../../src/core/telemetry/telemetry.types";
import { fakeBrowser } from "../support/fake-browser";
import type { FakeBrowser, FakeBrowserOptions } from "../support/fake-browser.types";

export const SHARE: ShareOptions = { endpoint: "https://collect.example/fb", sampleRate: 1 };

/** A page after load: the warm benchmark finished and sharing started when configured. */
export async function loadedPage(
  options: FakeBrowserOptions = {},
  share?: ShareOptions,
  random = (): number => 0,
): Promise<{ browser: FakeBrowser; budget: Budget }> {
  const browser = fakeBrowser(options);
  const budget = createBudget({ scope: browser.scope, random, pause: () => Promise.resolve() });
  budget.configure(share ? { share, governor: { auto: false } } : { governor: { auto: false } });
  await browser.settle();
  return { browser, budget };
}
