# @framebudget/react

React hooks for [framebudget](https://framebudget.dev): `useBudget`, `useTier` and `BudgetProvider`. They read the page's budget from [`@framebudget/core`](https://www.npmjs.com/package/@framebudget/core), which this package installs with it. React 18 or later is a peer dependency.

```sh
npm install @framebudget/react
```

```tsx
import { useBudget, useTier } from "@framebudget/react";

function Page() {
  const animate = useBudget("pageTransition"); // boolean, re-renders on change
  const tier = useTier();
  return animate ? <AnimatedRoute /> : <Route />;
}
```

During server rendering and hydration, `useBudget` answers `false` and `useTier` answers `Lite`, so effects only start on the client. [`framebudget`](https://www.npmjs.com/package/framebudget) installs this package and the core together (`framebudget/react`).

Full documentation: [github.com/framebudget/core](https://github.com/framebudget/core#readme) and [framebudget.dev](https://framebudget.dev).
