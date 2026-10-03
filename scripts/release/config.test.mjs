import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { configErrors, matchesPath, sectionsOf } from "./config.mjs";

const WEBSITE = [
  { id: "site", title: "Site", paths: ["docs/"] },
  { id: "worker", title: "Worker", paths: ["worker/"] },
];

describe("matchesPath", () => {
  it("matches a path ending in / by prefix", () => {
    assert.equal(matchesPath("docs/", "docs/src/main.ts"), true);
    assert.equal(matchesPath("docs/", "docs"), false);
    assert.equal(matchesPath("docs/", "docsx/a.ts"), false);
  });

  it("matches any other path exactly", () => {
    assert.equal(matchesPath("README.md", "README.md"), true);
    assert.equal(matchesPath("README.md", "docs/README.md"), false);
    assert.equal(matchesPath("README", "README.md"), false);
  });
});

describe("sectionsOf", () => {
  it("returns the touched sections in config order, once each", () => {
    assert.deepEqual(sectionsOf(["worker/src/a.ts", "docs/a.html", "docs/b.html"], WEBSITE), ["site", "worker"]);
    assert.deepEqual(sectionsOf(["package.json", ".github/workflows/release.yml"], WEBSITE), []);
  });
});

describe("configErrors", () => {
  it("accepts a label with sections", () => {
    assert.deepEqual(configErrors({ label: "Website release", sections: WEBSITE }), []);
  });

  it("names every problem", () => {
    const errors = configErrors({
      sections: [
        { id: "site", title: "", paths: ["docs/"] },
        { id: "site", title: "Again", paths: [] },
        { id: "Bad id", title: "x", paths: ["a"] },
      ],
    });
    assert.deepEqual(errors, [
      "label must be a non-empty string",
      "sections[0].title must be a non-empty string",
      "sections[1].paths must be a non-empty array of paths",
      String.raw`sections[2].id must match /^[a-z][\w-]*$/`,
      "section ids must be unique: site",
    ]);
    assert.deepEqual(configErrors({ label: "x", sections: [] }), ["sections must be a non-empty array"]);
  });
});
