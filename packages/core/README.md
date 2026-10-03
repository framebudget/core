# @framebudget/core

The base of [framebudget](https://framebudget.dev), without React. It decides, per device, which visual effects a site can afford: a small inline boot script decides before the first paint, a fixed-time benchmark scores the device, and a runtime governor steps expensive effects down when frames stutter.

```sh
npm install @framebudget/core
```

```ts
import { budget } from "@framebudget/core";
import { bootScript } from "@framebudget/core/boot";
import { mountPanel } from "@framebudget/core/panel";

if (budget.allows("parallax")) startParallax();
```

For the React hooks, install [`@framebudget/react`](https://www.npmjs.com/package/@framebudget/react), which brings this package with it. [`framebudget`](https://www.npmjs.com/package/framebudget) installs both and re-exports them; a page has one `budget` whichever of them it imports.

Full documentation: [github.com/framebudget/core](https://github.com/framebudget/core#readme) and [framebudget.dev](https://framebudget.dev).
