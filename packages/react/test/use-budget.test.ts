// @vitest-environment happy-dom
import { Tier, type Budget } from "@framebudget/core";
import { act, createElement } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { BudgetProvider, useBudget, useTier } from "../src/index";
import { fakeBudget } from "../../core/test/support/bindings/fake-budget";

// Renders "<allowed> <tier>" for one effect.
function Probe(props: { effect: string }) {
  const isAllowed = useBudget(props.effect);
  const tier = useTier();
  return createElement("p", null, `${String(isAllowed)} ${tier}`);
}

function page(budget: Budget, effect: string) {
  return createElement(BudgetProvider, { budget }, createElement(Probe, { effect }));
}

// Runs React work inside act() and waits for every update it schedules.
async function settle(work: () => void): Promise<void> {
  await act(async () => {
    work();
    await Promise.resolve();
  });
}

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useBudget and useTier", () => {
  it("answer false and Lite on the server and through hydration, then the device's answer", async () => {
    const fake = fakeBudget(["parallax"], Tier.Full);
    const html = renderToString(page(fake.budget, "parallax"));
    expect(html).toBe("<p>false Lite</p>");
    expect(fake.listeners()).toBe(0);

    const errors = vi.spyOn(console, "error");
    const recoverable = vi.fn();
    const container = document.createElement("div");
    container.innerHTML = html;
    await settle(() => {
      hydrateRoot(container, page(fake.budget, "parallax"), { onRecoverableError: recoverable });
    });
    expect(recoverable).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    expect(container.textContent).toBe("true Full");
  });

  it("follow budget changes and the effect name, and stop listening on unmount", async () => {
    const fake = fakeBudget(["parallax"], Tier.Full);
    const container = document.createElement("div");
    const root = createRoot(container);
    await settle(() => {
      root.render(page(fake.budget, "parallax"));
    });
    expect(container.textContent).toBe("true Full");
    expect(fake.listeners()).toBe(2);

    await settle(() => {
      fake.change(["blur"], Tier.Medium);
    });
    expect(container.textContent).toBe("false Medium");

    await settle(() => {
      root.render(page(fake.budget, "blur"));
    });
    expect(container.textContent).toBe("true Medium");

    await settle(() => {
      root.unmount();
    });
    expect(fake.listeners()).toBe(0);
  });
});
