# @framebudget/react

![framebudget: keep the effects, lose the stutter](https://raw.githubusercontent.com/framebudget/assets/main/brand/og.png)

**Keep the effects. Lose the stutter.**

At 60 Hz every frame has a 16.7 ms budget. Each visual effect (parallax, page transitions, canvas animations, sounds, blur) spends part of it. framebudget measures how much budget a device really has and allows only the effects that fit, so slow phones never stutter and fast phones keep everything.

`@framebudget/react` gives React components the page's budget as hooks. Components re-render when the device's budget changes: when the warm benchmark finishes, when the governor steps an effect down, or when the user turns on reduced motion.

## Install

```sh
npm install @framebudget/react
```

It brings [`@framebudget/core`](https://www.npmjs.com/package/@framebudget/core) with it. React 18 or later is a peer dependency.

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

During server rendering and hydration, `useBudget` answers `false` and `useTier` answers `Lite`, so the markup matches the server and effects only start on the client. Add the boot script from `@framebudget/core/boot` to decide before the first paint (see the [guide](https://github.com/framebudget/core#1-add-the-boot-script)).

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
