import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bumpWarning, compareVersions, impliedBump, parseTag, previousTag } from "./semver.mjs";

const version = (tag) => parseTag(tag);

describe("parseTag", () => {
  it("accepts release and prerelease tags", () => {
    assert.deepEqual(version("v1.2.3").core, [1, 2, 3]);
    assert.deepEqual(version("v1.2.3-rc.1").prerelease, ["rc", "1"]);
    assert.equal(version("v0.2.0-beta-2").version, "0.2.0-beta-2");
  });

  it("rejects anything else", () => {
    for (const tag of ["1.2.3", "v1.2", "v1.2.3.4", "v01.2.3x", "v1.2.3-", "v1.2.3+build", "release-1"]) {
      assert.equal(parseTag(tag), null, tag);
    }
  });
});

describe("compareVersions", () => {
  it("orders by semver precedence, prereleases below their release", () => {
    const ordered = [
      "v0.9.0",
      "v0.10.0",
      "v1.0.0-alpha",
      "v1.0.0-alpha.1",
      "v1.0.0-alpha.beta",
      "v1.0.0-beta",
      "v1.0.0-beta.2",
      "v1.0.0-beta.11",
      "v1.0.0-rc.1",
      "v1.0.0",
      "v1.0.1",
      "v1.1.0",
      "v2.0.0",
    ];
    for (let index = 1; index < ordered.length; index += 1) {
      const [lower, higher] = [version(ordered[index - 1]), version(ordered[index])];
      assert.equal(compareVersions(lower, higher), -1, `${lower.tag} < ${higher.tag}`);
      assert.equal(compareVersions(higher, lower), 1, `${higher.tag} > ${lower.tag}`);
    }
    assert.equal(compareVersions(version("v1.0.0-rc.1"), version("v1.0.0-rc.1")), 0);
  });
});

describe("previousTag", () => {
  it("picks the highest release tag other than the current one, ignoring other tags", () => {
    const tags = ["v0.1.0", "v0.10.0", "v0.9.0", "v0.11.0-rc.1", "nightly", "v0.12.0"];
    assert.equal(previousTag(tags, "v0.12.0"), "v0.11.0-rc.1");
    assert.equal(previousTag(["v1.0.0-rc.1", "v1.0.0-rc.2"], "v1.0.0"), "v1.0.0-rc.2");
    assert.equal(previousTag(["v0.1.0"], "v0.1.0"), null);
  });
});

describe("impliedBump", () => {
  const feat = { type: "feat", breaking: false };
  const fix = { type: "fix", breaking: false };
  const breaking = { type: "fix", breaking: true };

  it("asks for major on breaking changes, minor while the major is 0", () => {
    assert.equal(impliedBump([fix, breaking], version("v1.4.0")), "major");
    assert.equal(impliedBump([fix, breaking], version("v0.4.0")), "minor");
  });

  it("asks for minor on features and patch otherwise", () => {
    assert.equal(impliedBump([fix, feat], version("v1.4.0")), "minor");
    assert.equal(impliedBump([fix], version("v1.4.0")), "patch");
    assert.equal(impliedBump([], version("v1.4.0")), "patch");
  });
});

describe("bumpWarning", () => {
  const feat = [{ type: "feat", breaking: false }];
  const breaking = [{ type: "refactor", breaking: true }];

  it("warns when the tag bumps less than the commits ask for", () => {
    assert.match(bumpWarning(version("v1.4.1"), "v1.4.0", feat), /patch release after v1\.4\.0.*minor release/);
    assert.match(bumpWarning(version("v1.5.0"), "v1.4.0", breaking), /minor release .* major release/);
  });

  it("stays quiet when the bump is enough, larger, a prerelease step or a first release", () => {
    assert.equal(bumpWarning(version("v1.5.0"), "v1.4.0", feat), null);
    assert.equal(bumpWarning(version("v2.0.0"), "v1.4.0", feat), null);
    assert.equal(bumpWarning(version("v0.5.0"), "v0.4.0", breaking), null);
    assert.equal(bumpWarning(version("v1.5.0"), "v1.5.0-rc.1", breaking), null);
    assert.equal(bumpWarning(version("v0.1.0"), null, breaking), null);
  });
});
