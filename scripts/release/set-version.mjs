#!/usr/bin/env node
// Sets one version on every package of the monorepo. Run it from the repo root.
//
//   node scripts/release/set-version.mjs 0.3.0
//
// Writes `version` in every packages/*/package.json, pins each internal
// `@framebudget/*` dependency to that exact version, then syncs package-lock.json.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
const INTERNAL = "@framebudget/";

function fail(message) {
  console.error(process.env.GITHUB_ACTIONS ? `::error::${message}` : `error: ${message}`);
  process.exit(1);
}

function manifests(root) {
  const packages = path.join(root, "packages");
  if (!existsSync(packages)) fail(`no packages/ folder in ${root}`);
  return readdirSync(packages, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packages, entry.name, "package.json"))
    .filter((file) => existsSync(file));
}

function pinInternal(dependencies, version) {
  if (!dependencies) return dependencies;
  const pinned = Object.entries(dependencies).map(([name, range]) => [
    name,
    name.startsWith(INTERNAL) ? version : range,
  ]);
  return Object.fromEntries(pinned);
}

function setVersion(file, version) {
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  manifest.version = version;
  for (const field of DEPENDENCY_FIELDS) {
    if (manifest[field]) manifest[field] = pinInternal(manifest[field], version);
  }
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest.name;
}

const [version] = process.argv.slice(2);
if (!VERSION.test(version ?? "")) fail(`usage: set-version.mjs X.Y.Z (got "${version ?? ""}")`);
const files = manifests(process.cwd());
if (files.length === 0) fail("no packages/*/package.json found");
for (const file of files) console.log(`${setVersion(file, version)} ${version}`);
execFileSync("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], {
  stdio: "inherit",
});
