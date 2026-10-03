import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CHANGELOG_INTRO, insertSection } from "./changelog.mjs";

const section = (version, line) => `## [${version}] - 2026-10-03\n\n### Library\n\n${line}\n`;

describe("insertSection", () => {
  it("starts a missing changelog with the intro", () => {
    assert.equal(insertSection("", "0.1.0", section("0.1.0", "a")), `${CHANGELOG_INTRO}\n${section("0.1.0", "a")}`);
  });

  it("puts the newest release above the older ones", () => {
    const old = insertSection("", "0.1.0", section("0.1.0", "a"));
    const updated = insertSection(old, "0.2.0", section("0.2.0", "b"));
    assert.ok(updated.indexOf("[0.2.0]") < updated.indexOf("[0.1.0]"));
    assert.ok(updated.startsWith(CHANGELOG_INTRO));
  });

  it("replaces the section of a version written before", () => {
    const twice = [section("0.1.0", "a"), section("0.2.0", "b"), section("0.3.0", "c")].reduce(
      (text, entry, index) => insertSection(text, `0.${index + 1}.0`, entry),
      "",
    );
    const rewritten = insertSection(twice, "0.2.0", section("0.2.0", "b2"));
    assert.equal(rewritten, twice.replace("\nb\n", "\nb2\n"));
    const last = insertSection(twice, "0.1.0", section("0.1.0", "a2"));
    assert.equal(last, twice.replace("\na\n", "\na2\n"));
  });
});
