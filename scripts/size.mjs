// Reports what each entry costs a site after minification and gzip.
// Run after `npm run build`. React is external; the panel, loaded on demand,
// is excluded from the core.
import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { bootScript } from "../dist/boot.js";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

async function bundle(contents, external = ["react", "./panel.js"]) {
  const result = await build({
    stdin: { contents, resolveDir: dist, loader: "js" },
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
  ["core (framebudget)", await bundle(`export * from "./index.js";`)],
  ["boot (inline script string)", bootScript],
  ["react (framebudget/react, core included)", await bundle(`export * from "./react.js";`)],
  ["panel (on demand)", await bundle(`export * from "./panel.js";`, ["react"])],
];

const kb = (n) => (n / 1024).toFixed(2) + " KB";
for (const [name, code] of rows) {
  console.log(
    `${name.padEnd(44)} ${kb(code.length).padStart(9)} min ${kb(gzipSync(code, { level: 9 }).length).padStart(9)} gzip`,
  );
}
