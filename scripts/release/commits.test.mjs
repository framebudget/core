import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { changedOutputs, classifyCommits, groupOf, groupRelease, parseCommit } from "./commits.mjs";
import { artNotes, renderChangelogSection } from "./render-notes.mjs";

const commit = (subject, body = "") => parseCommit({ sha: "0123456789abcdef", subject, body });

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

const SECTIONS = [
  { id: "core", title: "@framebudget/core", paths: ["packages/core/"] },
  { id: "react", title: "@framebudget/react", paths: ["packages/react/"] },
  { id: "framebudget", title: "framebudget", paths: ["packages/framebudget/", "README.md"] },
];

const raw = (sha, subject, files) => ({ sha, subject, body: "", files });

describe("classifyCommits", () => {
  it("keeps commits that touch a section, with their section ids and group", () => {
    const classified = classifyCommits(
      [
        raw("a1", "feat(react): a", ["packages/react/src/use-tier.ts"]),
        raw("b2", "chore(deps): b", ["packages/core/package.json"]),
        raw("c3", "ci: c", [".github/workflows/ci.yml", "package-lock.json"]),
      ],
      SECTIONS,
    );
    assert.deepEqual(
      classified.map(({ sha, sections, group }) => ({ sha, sections, group })),
      [
        { sha: "a1", sections: ["react"], group: "features" },
        { sha: "b2", sections: ["core"], group: null },
      ],
    );
  });

  it("files a commit touching two sections in both, in config order", () => {
    const [both] = classifyCommits([raw("d4", "fix: d", ["README.md", "packages/core/src/a.ts"])], SECTIONS);
    assert.deepEqual(both.sections, ["core", "framebudget"]);
  });

  it("drops chore(release) commits even when they touch section paths", () => {
    const release = raw("e5", "chore(release): v0.3.0", ["packages/core/package.json", "CHANGELOG.md"]);
    assert.deepEqual(classifyCommits([release], SECTIONS), []);
  });
});

describe("changedOutputs", () => {
  it("counts any classified commit, changelog-worthy or not, per section", () => {
    const classified = classifyCommits([raw("b2", "chore(deps): b", ["packages/core/package.json"])], SECTIONS);
    assert.deepEqual(changedOutputs(classified, SECTIONS), {
      changed: true,
      changed_core: true,
      changed_react: false,
      changed_framebudget: false,
    });
  });

  it("reports nothing changed when only release and tooling commits landed", () => {
    const commits = [
      raw("e5", "chore(release): v0.3.0", ["packages/react/package.json"]),
      raw("f6", "ci: f", ["scripts/release/notes.mjs"]),
    ];
    const outputs = changedOutputs(classifyCommits(commits, SECTIONS), SECTIONS);
    assert.equal(outputs.changed, false);
    assert.equal(outputs.changed_react, false);
  });
});

describe("groupRelease", () => {
  const shipped = [
    { ...commit("feat(core): a"), sha: "aaaaaaa1", sections: ["core"], group: "features" },
    { ...commit("fix: b"), sha: "bbbbbbb2", sections: ["core", "framebudget"], group: "fixes" },
    { ...commit("chore: c"), sha: "ccccccc3", sections: ["react"], group: null },
  ];

  it("files each shipped commit under its sections and renders them by config title", () => {
    const release = groupRelease(shipped, SECTIONS);
    assert.deepEqual(
      release.framebudget.fixes.map((entry) => entry.sha),
      ["bbbbbbb2"],
    );
    const section = renderChangelogSection({ version: "1.0.0", date: "2026-10-03", release, sections: SECTIONS });
    assert.match(
      section,
      /^## \[1\.0\.0\] - 2026-10-03\n\n### @framebudget\/core\n\n#### Features\n\n- \*\*core:\*\* a \(aaaaaaa\)\n\n#### Fixes\n\n- b \(bbbbbbb\)\n\n/,
    );
    assert.match(
      section,
      /### @framebudget\/react\n\nNo changes\.\n\n### framebudget\n\n#### Fixes\n\n- b \(bbbbbbb\)\n$/,
    );
  });

  it("counts each section and lists every section of a highlight", () => {
    const release = groupRelease(shipped, SECTIONS);
    const art = artNotes({ version: "1.0.0", date: "d", label: "Library release", release, sections: SECTIONS });
    assert.equal(art.label, "Library release");
    assert.deepEqual(
      art.counts.map(({ id, count }) => [id, count]),
      [
        ["core", 2],
        ["react", 0],
        ["framebudget", 1],
      ],
    );
    assert.deepEqual(art.highlights, [
      { text: "a", group: "features", sections: ["@framebudget/core"] },
      { text: "b", group: "fixes", sections: ["@framebudget/core", "framebudget"] },
    ]);
  });
});
