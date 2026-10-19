# @framebudget/vue

![framebudget: keep the effects, lose the stutter](https://raw.githubusercontent.com/framebudget/assets/main/brand/og.png)

**Keep the effects. Lose the stutter.**

At 60 Hz every frame has a 16.7 ms budget. Each visual effect (parallax, page transitions, canvas animations, sounds, blur) spends part of it. framebudget measures how much budget a device really has and allows only the effects that fit, so slow phones never stutter and fast phones keep everything.

`@framebudget/vue` gives Vue components the page's budget as composables. They return computed refs that follow the device's budget: when the warm benchmark finishes, when the governor steps an effect down, or when the user turns on reduced motion.

## Install

```sh
npm install @framebudget/vue
```

It brings [`@framebudget/core`](https://www.npmjs.com/package/@framebudget/core) with it. Vue 3.3 or later is a peer dependency, which your project already has.

## Usage

```vue
<script setup lang="ts">
import { useBudget, useTier } from "@framebudget/vue";

const parallax = useBudget("parallax"); // computed ref, follows the budget
const tier = useTier();
</script>

<template>
  <Layers v-if="parallax" :data-tier="tier" />
  <StaticHero v-else />
</template>
```

| Export | Description |
| --- | --- |
| `useBudget(effect)` | May this effect run? A `ComputedRef<boolean>`. The effect name may be a string, a ref or a getter, such as a prop. |
| `useTier()` | The current tier, as a `ComputedRef`: `"Full"`, `"High"`, `"Medium"` or `"Lite"`. |
| `provideBudget(budget)` | Only needed for a budget other than the page's, such as `createBudget()` in tests or an embedded widget. Call it in a parent's setup. |

## Server rendering and hydration

In a component, the composables answer `false` and `Lite` until it mounts, so server rendering and hydration match the server and effects only start on the client. Outside a component (an effect scope, a store) they answer at once. The subscription ends with the component or the effect scope, so nothing leaks when a component unmounts.

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

The composables read the page's budget by default. `provideBudget` swaps it, for the calling component's descendants, for a budget of your own made with `createBudget()`, for a test or a widget embedded in someone else's page:

```ts
import { createBudget } from "@framebudget/core";
import { provideBudget } from "@framebudget/vue";
import { defineComponent, h } from "vue";

const budget = createBudget();

const Wrapper = defineComponent({
  setup() {
    provideBudget(budget);
    return () => h(Hero);
  },
});
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
