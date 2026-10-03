// Builds the three packages, packs them into --out, checks every tarball and
// smoke-installs them together into a throwaway project.
//
//   node scripts/pack.mjs --out <dir>
//
// Assumes `npm ci` ran. The last stdout line is a JSON array of the tarball
// file names in <dir>, in publish order (core, react, framebudget).
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = fileURLToPath(new URL("..", import.meta.url));
const PACKAGES = ["core", "react", "framebudget"];
const ALLOWED_FILE = /^(package\.json|README\.md|LICENSE|dist\/.+\.(js|d\.ts))$/;
const INSTALL_SCRIPTS = ["preinstall", "install", "postinstall"];

const { values } = parseArgs({ options: { out: { type: "string" } } });
if (!values.out) throw new Error("Usage: node scripts/pack.mjs --out <dir>");
const out = path.resolve(values.out);

// Progress goes to stderr, so the last stdout line stays the tarball list.
const run = (command, args, cwd = root) =>
  execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
const log = (message) => console.error(message);

function pack(dir) {
  const [result] = JSON.parse(run("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", out], dir));
  const strays = result.files.map((file) => file.path).filter((file) => !ALLOWED_FILE.test(file));
  if (strays.length > 0) throw new Error(`${result.name}: unexpected files in the tarball: ${strays.join(", ")}`);
  const manifest = JSON.parse(run("tar", ["-xOzf", path.join(out, result.filename), "package/package.json"]));
  const hooks = INSTALL_SCRIPTS.filter((name) => manifest.scripts?.[name] !== undefined);
  if (hooks.length > 0) throw new Error(`${result.name}: install scripts are not allowed: ${hooks.join(", ")}`);
  log(`packed ${result.filename}: ${result.files.length} files, ${result.size} bytes`);
  return result.filename;
}

function countInstalledCopies(dir, name) {
  return readdirSync(dir, { recursive: true }).filter((entry) =>
    entry.endsWith(path.join("node_modules", name, "package.json")),
  ).length;
}

// Installs the tarballs offline (the scoped dependencies resolve to the tarballs
// given on the same command line) and asserts what a site would see.
function smoke(tarballs) {
  const project = mkdtempSync(path.join(tmpdir(), "framebudget-pack-"));
  try {
    writeFileSync(path.join(project, "package.json"), JSON.stringify({ name: "pack-smoke", private: true }));
    const specs = tarballs.map((file) => path.join(out, file));
    run(
      "npm",
      ["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", "--no-package-lock", ...specs],
      project,
    );
    const modules = path.join(project, "node_modules");
    if (existsSync(path.join(modules, "react"))) throw new Error("Installing the tarballs installed React.");
    const copies = countInstalledCopies(project, path.join("@framebudget", "core"));
    if (copies !== 1) throw new Error(`Expected one installed @framebudget/core, found ${copies}.`);
    // React is the site's own dependency: link the workspace copy to load the hooks.
    symlinkSync(path.join(root, "node_modules", "react"), path.join(modules, "react"), "dir");
    const check = `
      import * as meta from "framebudget";
      import * as core from "@framebudget/core";
      import { bootScript } from "framebudget/boot";
      import { useBudget } from "framebudget/react";
      if (meta.budget === undefined || meta.budget !== core.budget) throw new Error("framebudget and @framebudget/core hold different budgets.");
      if (typeof useBudget !== "function") throw new Error("framebudget/react does not export useBudget.");
      if (typeof bootScript !== "string") throw new Error("framebudget/boot does not export bootScript.");
    `;
    run(process.execPath, ["--input-type=module", "--eval", check], project);
    log("smoke install: one budget across framebudget and @framebudget/core, useBudget exported, React not installed");
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
}

log("building every package");
run("npm", ["run", "build"]);
copyFileSync(path.join(root, "README.md"), path.join(root, "packages", "framebudget", "README.md"));
mkdirSync(out, { recursive: true });
const tarballs = PACKAGES.map((dir) => pack(path.join(root, "packages", dir)));
smoke(tarballs);
console.log(JSON.stringify(tarballs));
