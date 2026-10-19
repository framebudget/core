import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Binding tests import the core from source, like tsconfig paths, so they run before a build.
  resolve: {
    alias: [
      {
        find: /^@framebudget\/core$/,
        replacement: fileURLToPath(new URL("packages/core/src/index.ts", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["packages/*/test/**/*.test.ts"],
  },
});
