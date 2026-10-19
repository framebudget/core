# @framebudget/react

![framebudget: keep the effects, lose the stutter](https://raw.githubusercontent.com/framebudget/assets/main/brand/og.png)

**Keep the effects. Lose the stutter.**

At 60 Hz every frame has a 16.7 ms budget. Each visual effect (parallax, page transitions, canvas animations, sounds, blur) spends part of it. framebudget measures how much budget a device really has and allows only the effects that fit, so slow phones never stutter and fast phones keep everything.

`@framebudget/react` gives React components the page's budget as hooks. Components re-render when the device's budget changes: when the warm benchmark finishes, when the governor steps an effect down, or when the user turns on reduced motion.

## Install

```sh
npm install @framebudget/react
```

It brings [`@framebudget/core`](https://www.npmjs.com/package/@framebudget/core) with it. React 18 or later is a peer dependency, which your project already has.

## Usage

```tsx
import { useBudget, useTier } from "@framebudget/react";

export function Hero() {
  const parallax = useBudget("parallax"); // boolean, re-renders on change
  const tier = useTier();

  return parallax ? <Layers data-tier={tier} /> : <StaticHero />;
}
```

| Export | Description |
| --- | --- |
| `useBudget(effect)` | May this effect run? A boolean that follows the budget. |
| `useTier()` | The current tier: `"Full"`, `"High"`, `"Medium"` or `"Lite"`. |
| `BudgetProvider` | Only needed for a budget other than the page's, such as `createBudget()` in tests or an embedded widget. |

## Server rendering and hydration

During server rendering and hydration, `useBudget` answers `false` and `useTier` answers `Lite`, so the markup matches the server and effects only start on the client. The hooks subscribe through `useSyncExternalStore`, so every component sees the same answer, also under concurrent rendering.

## Decide before the first paint

The bindings answer from the moment the page runs JavaScript. To have the decision before the first paint, inline the boot script from `@framebudget/core/boot` as the first script in `<head>`, before your CSS. It runs a benchmark of about 2 ms and writes the decision on `<html>`:

```ts
import { bootScript } from "@framebudget/core/boot";

const head = `<script>${bootScript}</script>`;
```

CSS can then gate effects before any framework code loads:

```css
html[data-framebudget-effects~="parallax"] .hero { transform: translateY(var(--parallax)); }
```

## Your own effects

framebudget ships a calibrated set of effects (`hover`, `entrances`, `parallax`, `blur`, `pageTransition` and more). Register your own with a score threshold, a relative frame cost and flags, then ask for it by name like any other:

```ts
import { budget } from "@framebudget/core";

budget.register("confetti", { threshold: 60, cost: 4, motion: true });
```

`motion: true` turns the effect off under `prefers-reduced-motion: reduce`, and `data: true` under Save-Data or a 2g connection.

## Testing and embedded widgets

The hooks read the page's budget by default. `BudgetProvider` swaps it for a budget of your own, made with `createBudget()`, for a test or a widget embedded in someone else's page:

```tsx
import { createBudget } from "@framebudget/core";
import { BudgetProvider } from "@framebudget/react";

const budget = createBudget();

render(
  <BudgetProvider budget={budget}>
    <Hero />
  </BudgetProvider>,
);
```

## The framebudget packages

All of them are released together, at the same version. A page has one `budget`, whichever of them it imports.

| Package | For |
| --- | --- |
| [`framebudget`](https://www.npmjs.com/package/framebudget) | any site: the core under its short name (`framebudget`, `framebudget/boot`, `framebudget/panel`) |
| [`@framebudget/core`](https://www.npmjs.com/package/@framebudget/core) | the same core under the org scope, which the framework packages depend on |
| [`@framebudget/react`](https://www.npmjs.com/package/@framebudget/react) | React 18 or later: `useBudget`, `useTier`, `BudgetProvider` |
| [`@framebudget/vue`](https://www.npmjs.com/package/@framebudget/vue) | Vue 3.3 or later: `useBudget`, `useTier`, `provideBudget` |
| [`@framebudget/angular`](https://www.npmjs.com/package/@framebudget/angular) | Angular 18 or later: `injectBudget`, `injectTier`, `provideBudget` |

## Documentation

- Guide and API reference: [github.com/framebudget/core](https://github.com/framebudget/core#readme)
- Live demo and device simulator: [framebudget.dev](https://framebudget.dev)
- Issues: [github.com/framebudget/core/issues](https://github.com/framebudget/core/issues)

MIT licensed.
