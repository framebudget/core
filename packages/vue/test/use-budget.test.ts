// @vitest-environment happy-dom
import { Tier, type Budget } from "@framebudget/core";
import { createApp, createSSRApp, defineComponent, h, nextTick, ref, type Ref } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { provideBudget, useBudget, useTier } from "../src/index";
import { fakeBudget } from "./fake-budget";

// A parent provides the budget; the child renders "<allowed> <tier>".
function page(budget: Budget, effect: Ref<string>) {
  const Child = defineComponent({
    setup() {
      const allowed = useBudget(effect);
      const tier = useTier();
      return () => h("p", `${String(allowed.value)} ${tier.value}`);
    },
  });
  const renderChild = () => h(Child);
  return defineComponent({
    setup() {
      provideBudget(budget);
      return renderChild;
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useBudget and useTier", () => {
  it("answer false and Lite on the server and through hydration, then the device's answer", async () => {
    const fake = fakeBudget(["parallax"], Tier.Full);
    const server = createSSRApp(page(fake.budget, ref("parallax")));
    const html = await renderToString(server);
    expect(html).toBe("<p>false Lite</p>");
    expect(fake.listeners()).toBe(0);

    const errors = vi.spyOn(console, "error");
    const warnings = vi.spyOn(console, "warn");
    const container = document.createElement("div");
    container.innerHTML = html;
    createSSRApp(page(fake.budget, ref("parallax"))).mount(container);
    expect(errors).not.toHaveBeenCalled();
    expect(warnings).not.toHaveBeenCalled();
    await nextTick();
    expect(container.textContent).toBe("true Full");
  });

  it("follow budget changes and the effect name, and stop listening on unmount", async () => {
    const fake = fakeBudget(["parallax"], Tier.Full);
    const effect = ref("parallax");
    const container = document.createElement("div");
    const app = createApp(page(fake.budget, effect));
    app.mount(container);
    await nextTick();
    expect(container.textContent).toBe("true Full");
    expect(fake.listeners()).toBe(2);

    fake.change(["blur"], Tier.Medium);
    await nextTick();
    expect(container.textContent).toBe("false Medium");

    effect.value = "blur";
    await nextTick();
    expect(container.textContent).toBe("true Medium");

    app.unmount();
    expect(fake.listeners()).toBe(0);
  });
});
