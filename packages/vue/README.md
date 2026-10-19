# @framebudget/vue

![framebudget: keep the effects, lose the stutter](https://raw.githubusercontent.com/framebudget/assets/main/brand/og.png)

**Keep the effects. Lose the stutter.**

At 60 Hz every frame has a 16.7 ms budget. Each visual effect (parallax, page transitions, canvas animations, sounds, blur) spends part of it. framebudget measures how much budget a device really has and allows only the effects that fit, so slow phones never stutter and fast phones keep everything.

`@framebudget/vue` gives Vue components the page's budget as composables. They return computed refs that follow the device's budget: when the warm benchmark finishes, when the governor steps an effect down, or when the user turns on reduced motion.

## Install

```sh
npm install @framebudget/vue
```

It brings [`@framebudget/core`](https://www.npmjs.com/package/@framebudget/core) with it. Vue 3.3 or later is a peer dependency.

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

In a component, the composables answer `false` and `Lite` until it mounts, so server rendering and hydration match the server and effects only start on the client. Outside a component (an effect scope, a store) they answer at once. The subscription ends with the component or the effect scope. Add the boot script from `@framebudget/core/boot` to decide before the first paint (see the [guide](https://github.com/framebudget/core#1-add-the-boot-script)).

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
