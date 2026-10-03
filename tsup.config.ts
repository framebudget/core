import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    boot: "src/boot/index.ts",
    react: "src/react/index.ts",
    panel: "src/panel/index.ts",
  },
  format: ["esm"],
  target: "es2020",
  dts: true,
  splitting: true,
  treeshake: true,
  clean: true,
  external: ["react"],
});
