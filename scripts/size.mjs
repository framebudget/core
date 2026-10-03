// Reports what each package entry costs a site after minification and gzip.
// Run after `npm run build`. React is external; the panel, loaded on demand,
// is excluded from the core.
import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { bootScript } from "../packages/core/dist/boot.js";

const root = fileURLToPath(new URL("..", import.meta.url));

// Resolves the packages from the repository root through their workspace links, so it measures each built
// dist. `tsconfigRaw` keeps esbuild from following the root tsconfig paths to the sources.
async function bundle(contents, external = ["react", "./panel.js"]) {
  const result = await build({
    stdin: { contents, resolveDir: root, loader: "js" },
    tsconfigRaw: "{}",
    bundle: true,
    minify: true,
    format: "esm",
    write: false,
    external,
    logLevel: "silent",
  });
  return result.outputFiles[0].text;
}

const rows = [
  ["core (@framebudget/core)", await bundle(`export * from "@framebudget/core";`)],
  ["boot (inline script string)", bootScript],
  ["react (@framebudget/react, core included)", await bundle(`export * from "@framebudget/react";`)],
  ["panel (on demand)", await bundle(`export * from "@framebudget/core/panel";`, ["react"])],
];

const kb = (n) => (n / 1024).toFixed(2) + " KB";
for (const [name, code] of rows) {
  console.log(
    `${name.padEnd(44)} ${kb(code.length).padStart(9)} min ${kb(gzipSync(code, { level: 9 }).length).padStart(9)} gzip`,
  );
}
