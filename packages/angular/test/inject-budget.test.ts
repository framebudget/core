// @vitest-environment happy-dom
// Angular publishes partially compiled code; the JIT compiler links it at runtime.
import "@angular/compiler";
import { Tier } from "@framebudget/core";
import {
  Component,
  createComponent,
  provideZonelessChangeDetection,
  runInInjectionContext,
  signal,
  type ApplicationRef,
} from "@angular/core";
import { createApplication } from "@angular/platform-browser";
import { afterEach, describe, expect, it } from "vitest";
import { injectBudget, injectTier, provideBudget } from "../src/index";
import { fakeBudget } from "../../core/test/support/bindings/fake-budget";
import type { FakeBudget } from "../../core/test/support/bindings/fake-budget.types";

class Probe {
  readonly effect = signal("parallax");
  readonly allowed = injectBudget(this.effect);
  readonly tier = injectTier();
}
const ProbeComponent = Component({ selector: "fb-probe", template: "{{ allowed() }} {{ tier() }}" })(Probe);

const apps: ApplicationRef[] = [];
async function bootstrap(fake: FakeBudget): Promise<ApplicationRef> {
  const app = await createApplication({ providers: [provideZonelessChangeDetection(), provideBudget(fake.budget)] });
  apps.push(app);
  return app;
}

afterEach(() => {
  for (const app of apps.splice(0)) app.destroy();
});

describe("injectBudget and injectTier", () => {
  it("answer false and Lite until the first render, as on the server and through hydration", async () => {
    const fake = fakeBudget(["parallax"], Tier.Full);
    const app = await bootstrap(fake);
    const [allowed, tier] = runInInjectionContext(app.injector, () => [injectBudget("parallax"), injectTier()]);
    expect([allowed(), tier()]).toEqual([false, "Lite"]);
    expect(fake.listeners()).toBe(0);

    app.tick();
    expect([allowed(), tier()]).toEqual([true, "Full"]);
  });

  it("follow budget changes and the effect name in a component, and stop listening when it is destroyed", async () => {
    const fake = fakeBudget(["parallax"], Tier.Full);
    const app = await bootstrap(fake);
    const host = document.createElement("div");
    const component = createComponent(ProbeComponent, { environmentInjector: app.injector, hostElement: host });
    app.attachView(component.hostView);
    app.tick();
    expect(host.textContent).toBe("true Full");
    expect(fake.listeners()).toBe(2);

    fake.change(["blur"], Tier.Medium);
    app.tick();
    expect(host.textContent).toBe("false Medium");

    component.instance.effect.set("blur");
    app.tick();
    expect(host.textContent).toBe("true Medium");

    component.destroy();
    expect(fake.listeners()).toBe(0);
  });
});
