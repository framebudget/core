# @framebudget/core

![framebudget: keep the effects, lose the stutter](https://raw.githubusercontent.com/framebudget/assets/main/brand/og.png)

**Keep the effects. Lose the stutter.**

At 60 Hz every frame has a 16.7 ms budget. Each visual effect (parallax, page transitions, canvas animations, sounds, blur) spends part of it. framebudget measures how much budget a device really has and allows only the effects that fit, so slow phones never stutter and fast phones keep everything.

`@framebudget/core` is the framework-free base: the budget, the boot script and the diagnostics panel, with no dependencies. Use it on any site, or through the bindings for React, Vue and Angular, which install it for you.

## How it decides

- **Before the first paint.** A small inline boot script (about 4.6 KB gzipped) runs a benchmark of about 2 ms and writes the decision on `<html>`, so an animation never starts only to freeze.
- **A real score.** A fixed-time CPU benchmark scores the device, where 100 is the reference phone. A longer warm benchmark refines it after `load`, and the result is cached for the next page.
- **Per effect.** Each effect has its own threshold with hysteresis and a relative frame cost, instead of one global tier.
- **While the page runs.** A governor counts late frames against the display's own cadence, steps down the effects the page actually uses, and turns a step back on when it did not help.
- **Remembers.** Local learning keeps which effects stuttered on this device and forgives a passing hitch. Nothing leaves the device.
- **Respects the user.** `prefers-reduced-motion` turns off the effects flagged `motion`, and Save-Data or a 2g connection the ones flagged `data`.
- **Private by default.** Anonymous telemetry, which calibrates framebudget on real devices, is off unless the site enables it.

## Install

```sh
npm install @framebudget/core
```

ESM only, with type declarations. Server rendering is safe: without `window`, `allows()` answers `false` and the tier is `Lite`.

## Quick start

**1. Decide before the first paint.** Inline the boot script as the first script in `<head>`, before your CSS:

```ts
import { bootScript } from "@framebudget/core/boot";

const head = `<script>${bootScript}</script>`;
```

**2. Gate effects in CSS**, with no JavaScript at all:

```css
html[data-framebudget-effects~="parallax"] .hero { transform: translateY(var(--parallax)); }
html[data-framebudget-effects~="blur"] .sheet { backdrop-filter: blur(16px); }
```

**3. Ask the budget** in JavaScript, and follow its changes:

```ts
import { budget } from "@framebudget/core";

// Your own effect: a threshold, a relative cost, and flags.
budget.register("confetti", { threshold: 60, cost: 4, motion: true });

if (budget.allows("parallax")) startParallax();

budget.on("change", (snapshot, reason) => {
  // reason: "warm", "governor", "pressure", "motion", ...
  update(snapshot.effects);
});
```

Add `?framebudget` to any URL to open the diagnostics panel: scores, the state of each effect, the frame rate per source, and buttons to force a tier.

## Entries

| Entry | Exports |
| --- | --- |
| `@framebudget/core` | `budget`, `configure`, `createBudget`, `Tier`, the calibration helpers and the types |
| `@framebudget/core/boot` | `bootScript`, `createBootScript(options)` |
| `@framebudget/core/panel` | `mountPanel(budget)`, loaded on demand |

## The framebudget packages

All of them are released together, at the same version. A page has one `budget`, whichever of them it imports.

| Package | For |
| --- | --- |
| [`@framebudget/core`](https://www.npmjs.com/package/@framebudget/core) | any site, no framework: the budget, the boot script and the diagnostics panel |
| [`@framebudget/react`](https://www.npmjs.com/package/@framebudget/react) | React 18 or later: `useBudget`, `useTier`, `BudgetProvider` |
| [`@framebudget/vue`](https://www.npmjs.com/package/@framebudget/vue) | Vue 3.3 or later: `useBudget`, `useTier`, `provideBudget` |
| [`@framebudget/angular`](https://www.npmjs.com/package/@framebudget/angular) | Angular 18 or later: `injectBudget`, `injectTier`, `provideBudget` |
| [`framebudget`](https://www.npmjs.com/package/framebudget) | everything above in one install, re-exported (`framebudget/react`, `framebudget/vue`, `framebudget/angular`) |

## Documentation

- Guide and API reference: [github.com/framebudget/core](https://github.com/framebudget/core#readme)
- Live demo and device simulator: [framebudget.dev](https://framebudget.dev)
- Issues: [github.com/framebudget/core/issues](https://github.com/framebudget/core/issues)

MIT licensed.
