#!/usr/bin/env node
// Release notes for a tag, from the commits since the previous release tag, split
// into the sections of release.config.json. Run it from the released repo's root.
//
//   node scripts/release/notes.mjs --tag v0.2.0 --dry-run   print the CHANGELOG.md section
//   node scripts/release/notes.mjs --tag v0.2.0 --check     validate, warn on a small bump, set outputs
//   node scripts/release/notes.mjs --tag v0.2.0 --out-dir tmp [--art-url URL] [--date YYYY-MM-DD]
//       write CHANGELOG.md, tmp/release-body.md, tmp/pr-body.md and tmp/notes.json
//   --config FILE (default release.config.json), --changelog FILE (default CHANGELOG.md)
//
// Every mode fails when the tag is not vX.Y.Z[-pre] or not above the previous release tag.
// --check sets version, prerelease, previous_tag, changed and changed_<id> per section.
// In GitHub Actions, outputs go to $GITHUB_OUTPUT and the warning to $GITHUB_STEP_SUMMARY.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { insertSection } from "./changelog.mjs";
import { changedOutputs, classifyCommits, groupRelease } from "./commits.mjs";
import { loadConfig } from "./config.mjs";
import { listTags, pullRequestOf, readCommits, repositorySlug, resolveCommit } from "./git.mjs";
import { artNotes, renderChangelogSection, renderPullRequestBody, renderReleaseBody } from "./render-notes.mjs";
import { bumpWarning, compareVersions, parseTag, previousTag } from "./semver.mjs";

const { values: options } = parseArgs({
  options: {
    tag: { type: "string" },
    date: { type: "string", default: new Date().toISOString().slice(0, 10) },
    "dry-run": { type: "boolean", default: false },
    check: { type: "boolean", default: false },
    "out-dir": { type: "string" },
    "art-url": { type: "string" },
    changelog: { type: "string", default: "CHANGELOG.md" },
    config: { type: "string", default: "release.config.json" },
  },
});

function fail(message) {
  console.error(process.env.GITHUB_ACTIONS ? `::error::${message}` : `error: ${message}`);
  process.exit(1);
}

function resolveRelease(tag) {
  const version = parseTag(tag ?? "");
  if (!version) fail(`tag "${tag}" is not a release tag: expected vX.Y.Z or vX.Y.Z-prerelease, e.g. v0.2.0`);
  const tagged = resolveCommit(`refs/tags/${tag}`);
  if (!tagged && !options["dry-run"]) fail(`tag ${tag} does not exist (fetch tags, or use --dry-run to preview HEAD)`);
  if (!tagged) console.error(`note: ${tag} does not exist yet, previewing HEAD`);
  const previous = previousTag(listTags(), tag);
  if (previous && compareVersions(version, parseTag(previous)) <= 0) {
    fail(`tag ${tag} must be greater than the previous release tag ${previous}`);
  }
  return { version, commit: tagged ?? resolveCommit("HEAD"), previous };
}

function readConfig(file) {
  try {
    return loadConfig(file);
  } catch (error) {
    return fail(`cannot read the release config: ${error.message}`);
  }
}

function setOutputs(outputs) {
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
  else console.error(lines.join("\n"));
}

function summarize(markdown) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

function writeFiles(notes, outDir) {
  const changelog = existsSync(options.changelog) ? readFileSync(options.changelog, "utf8") : "";
  writeFileSync(options.changelog, insertSection(changelog, notes.version, renderChangelogSection(notes)));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "release-body.md"), renderReleaseBody(notes));
  writeFileSync(path.join(outDir, "pr-body.md"), renderPullRequestBody(notes));
  writeFileSync(path.join(outDir, "notes.json"), `${JSON.stringify(artNotes(notes), null, 2)}\n`);
}

const { label, sections } = readConfig(options.config);
const { version, commit, previous } = resolveRelease(options.tag);
const classified = classifyCommits(readCommits(previous ? `${previous}..${commit}` : commit), sections);
const shipped = classified.filter((entry) => entry.group);
const warning = bumpWarning(version, previous, shipped);
const repo = repositorySlug();
const withLinks = options.check ? shipped : shipped.map((entry) => ({ ...entry, pr: pullRequestOf(repo, entry.sha) }));
const release = groupRelease(withLinks, sections);
const notes = { tag: version.tag, version: version.version, date: options.date, previousTag: previous, repo };
Object.assign(notes, { label, sections, release, artUrl: options["art-url"] });

if (warning) console.error(`warning: ${warning}`);
if (options["dry-run"]) {
  process.stdout.write(renderChangelogSection(notes));
} else if (options.check) {
  setOutputs({
    version: version.version,
    prerelease: version.prerelease.length > 0,
    previous_tag: previous ?? "",
    ...changedOutputs(classified, sections),
  });
  if (warning) summarize(`> [!WARNING]\n> ${warning}\n`);
  summarize(renderChangelogSection(notes));
} else {
  if (!options["out-dir"]) fail("--out-dir is required unless --dry-run or --check is set");
  writeFiles(notes, options["out-dir"]);
}
