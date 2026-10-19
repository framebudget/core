import { defineConfig } from "tsup";

// @framebudget/core and @angular/core stay external (tsup leaves dependencies and peers out of the bundle).
// The package declares no decorators, so it needs no Angular compiler and works in AOT and JIT apps.
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  target: "es2020",
  dts: true,
  treeshake: true,
  clean: true,
});
