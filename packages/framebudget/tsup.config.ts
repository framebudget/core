import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    boot: "src/boot.ts",
    react: "src/react.ts",
    panel: "src/panel.ts",
  },
  format: ["esm"],
  target: "es2020",
  dts: true,
  splitting: true,
  treeshake: true,
  clean: true,
  external: ["react"],
});
