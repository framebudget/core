import { defineConfig } from "tsup";

// @framebudget/core and react stay external (tsup leaves dependencies and peers out of the bundle).
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  target: "es2020",
  dts: true,
  treeshake: true,
  clean: true,
});
