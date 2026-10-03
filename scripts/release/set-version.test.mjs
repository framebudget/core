import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("set-version.mjs", import.meta.url));

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

// A workspace with no registry dependencies, so syncing the lock needs no network.
function createWorkspace(root) {
  writeJson(path.join(root, "package.json"), { name: "root", private: true, workspaces: ["packages/*"] });
  writeJson(path.join(root, "packages/core/package.json"), { name: "@framebudget/core", version: "0.2.1" });
  writeJson(path.join(root, "packages/react/package.json"), {
    name: "@framebudget/react",
    version: "0.2.1",
    dependencies: { "@framebudget/core": "0.2.1" },
    peerDependencies: { react: ">=18" },
  });
  writeJson(path.join(root, "packages/framebudget/package.json"), {
    name: "framebudget",
    version: "0.2.1",
    dependencies: { "@framebudget/core": "0.2.1", "@framebudget/react": "0.2.1" },
  });
  execFileSync("npm", ["install", "--package-lock-only", "--ignore-scripts", "--offline"], {
    cwd: root,
    stdio: "ignore",
  });
}

describe("set-version.mjs", () => {
  let root;
  before(() => {
    root = mkdtempSync(path.join(tmpdir(), "framebudget-set-version-"));
    createWorkspace(root);
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  it("sets every package version and pins internal dependencies, then syncs the lock", () => {
    execFileSync(process.execPath, [SCRIPT, "0.3.0-rc.1"], { cwd: root, stdio: "ignore" });
    const react = readJson(path.join(root, "packages/react/package.json"));
    assert.equal(react.version, "0.3.0-rc.1");
    assert.deepEqual(react.dependencies, { "@framebudget/core": "0.3.0-rc.1" });
    assert.deepEqual(react.peerDependencies, { react: ">=18" });
    const umbrella = readJson(path.join(root, "packages/framebudget/package.json"));
    assert.deepEqual(umbrella.dependencies, { "@framebudget/core": "0.3.0-rc.1", "@framebudget/react": "0.3.0-rc.1" });
    const lock = readJson(path.join(root, "package-lock.json"));
    assert.equal(lock.packages["packages/core"].version, "0.3.0-rc.1");
    assert.deepEqual(lock.packages["packages/framebudget"].dependencies, umbrella.dependencies);
  });

  it("refuses anything but X.Y.Z[-pre]", () => {
    assert.throws(() => execFileSync(process.execPath, [SCRIPT, "v0.3.0"], { cwd: root, stdio: "ignore" }));
    assert.equal(readJson(path.join(root, "packages/core/package.json")).version, "0.3.0-rc.1");
  });
});
