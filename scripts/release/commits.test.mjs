import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyPaths, groupOf, groupRelease, packageRuntimeChanged, parseCommit } from "./commits.mjs";
import { renderChangelogSection } from "./render-notes.mjs";

const commit = (subject, body = "") => parseCommit({ sha: "0123456789abcdef", subject, body });

describe("classifyPaths", () => {
  it("puts library paths in the library", () => {
    assert.deepEqual(classifyPaths(["src/core/tier.ts", "test/core/tier.test.ts"]), ["library"]);
    assert.deepEqual(classifyPaths(["README.md"]), ["library"]);
    assert.deepEqual(classifyPaths(["scripts/build-boot.mjs", "tsup.config.ts"]), ["library"]);
  });

  it("puts docs and worker paths in the website", () => {
    assert.deepEqual(classifyPaths(["docs/index.html", "docs/README.md"]), ["website"]);
    assert.deepEqual(classifyPaths(["worker/src/handler.ts"]), ["website"]);
  });

  it("puts a commit touching both in both", () => {
    assert.deepEqual(classifyPaths(["worker/README.md", "src/core/x.ts", "docs/api.html"]), ["library", "website"]);
  });

  it("leaves out tests, tooling and assets", () => {
    const tooling = ["test/a.test.ts", ".github/workflows/release.yml", "eslint.config.js", "package-lock.json"];
    assert.deepEqual(classifyPaths([...tooling, "assets/brand/og.png", "scripts/size.mjs", "srcx/a.ts"]), []);
  });

  it("counts package.json only when a runtime field changed", () => {
    assert.deepEqual(classifyPaths(["package.json"], false), []);
    assert.deepEqual(classifyPaths(["package.json"], true), ["library"]);
  });
});

describe("packageRuntimeChanged", () => {
  const base = { name: "framebudget", version: "0.1.0", dependencies: { a: "1" }, devDependencies: { b: "1" } };

  it("ignores devDependencies, scripts and tool config", () => {
    const after = { ...base, devDependencies: { b: "2" }, scripts: { test: "x" }, "lint-staged": {} };
    assert.equal(packageRuntimeChanged(base, after), false);
  });

  it("sees dependencies, peerDependencies, exports and version", () => {
    assert.equal(packageRuntimeChanged(base, { ...base, dependencies: { a: "2" } }), true);
    assert.equal(packageRuntimeChanged(base, { ...base, peerDependencies: { react: ">=18" } }), true);
    assert.equal(packageRuntimeChanged(base, { ...base, exports: { ".": "./dist/index.js" } }), true);
    assert.equal(packageRuntimeChanged(base, { ...base, version: "0.2.0" }), true);
    assert.equal(packageRuntimeChanged(null, base), true);
  });
});

describe("parseCommit", () => {
  it("reads type, scope and description", () => {
    assert.deepEqual(
      { ...commit("feat(worker): collect reports") },
      {
        sha: "0123456789abcdef",
        subject: "feat(worker): collect reports",
        type: "feat",
        scope: "worker",
        description: "collect reports",
        breaking: false,
      },
    );
    assert.equal(commit("fix: no scope").scope, null);
  });

  it("detects breaking changes from ! and from the footer", () => {
    assert.equal(commit("feat(api)!: drop tiers").breaking, true);
    assert.equal(commit("refactor!: rename").breaking, true);
    assert.equal(commit("fix: x", "- a\n\nBREAKING CHANGE: y is gone").breaking, true);
    assert.equal(commit("fix: x", "BREAKING-CHANGE: y is gone").breaking, true);
    assert.equal(commit("fix: x", "mentions a BREAKING CHANGE: inline").breaking, false);
  });

  it("keeps a non-conventional subject whole", () => {
    assert.equal(commit("Update things").description, "Update things");
    assert.equal(commit('Revert "feat: x"').type, "revert");
  });
});

describe("groupOf", () => {
  it("groups by type and puts breaking changes first", () => {
    assert.equal(groupOf(commit("feat: a")), "features");
    assert.equal(groupOf(commit("fix: a")), "fixes");
    assert.equal(groupOf(commit("perf: a")), "performance");
    for (const subject of ["refactor: a", "docs: a", "revert: a", 'Revert "feat: a"', "Something else"]) {
      assert.equal(groupOf(commit(subject)), "other", subject);
    }
    assert.equal(groupOf(commit("chore!: drop node 18")), "breaking");
  });

  it("skips chore, ci, test, style, build and release commits", () => {
    for (const subject of ["chore: a", "ci: a", "test: a", "style: a", "build(deps): a", "chore(release): v0.2.0"]) {
      assert.equal(groupOf(commit(subject)), null, subject);
    }
  });
});

describe("groupRelease", () => {
  it("files each shipped commit under its areas and renders empty areas as no changes", () => {
    const shipped = [
      { ...commit("feat(core): a"), sha: "aaaaaaa1", areas: ["library"], group: "features" },
      { ...commit("fix: b"), sha: "bbbbbbb2", areas: ["library", "website"], group: "fixes" },
      { ...commit("chore: c"), sha: "ccccccc3", areas: ["library"], group: null },
    ];
    const release = groupRelease(shipped);
    assert.deepEqual(
      release.library.features.map((entry) => entry.sha),
      ["aaaaaaa1"],
    );
    assert.deepEqual(
      release.website.fixes.map((entry) => entry.sha),
      ["bbbbbbb2"],
    );
    const section = renderChangelogSection({ version: "1.0.0", date: "2026-10-03", release, repo: null });
    assert.match(
      section,
      /^## \[1\.0\.0\] - 2026-10-03\n\n### Library\n\n#### Features\n\n- \*\*core:\*\* a \(aaaaaaa\)/,
    );
    assert.match(section, /### Website\n\n#### Fixes\n\n- b \(bbbbbbb\)\n$/);
    assert.match(renderChangelogSection({ version: "1.0.1", date: "d", release: groupRelease([]) }), /No changes\./);
  });
});
