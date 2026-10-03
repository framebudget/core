#!/usr/bin/env node
// Release notes for a tag, from the commits since the previous release tag.
//
//   node scripts/release/notes.mjs --tag v0.2.0 --dry-run   print the CHANGELOG.md section
//   node scripts/release/notes.mjs --tag v0.2.0 --check     validate, warn on a small bump, set outputs
//   node scripts/release/notes.mjs --tag v0.2.0 --out-dir tmp [--art-url URL] [--date YYYY-MM-DD]
//       write CHANGELOG.md, tmp/release-body.md, tmp/pr-body.md and tmp/notes.json
//
// Every mode fails when the tag is not vX.Y.Z[-pre] or not above the previous release tag.
// In GitHub Actions, outputs go to $GITHUB_OUTPUT and the warning to $GITHUB_STEP_SUMMARY.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { insertSection } from "./changelog.mjs";
import { classifyPaths, groupOf, groupRelease, packageRuntimeChanged, parseCommit } from "./commits.mjs";
import { listTags, packageJsonAround, pullRequestOf, readCommits, repositorySlug, resolveCommit } from "./git.mjs";
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

// Every commit in the range with the areas it touched and its changelog group
// (null when the changelog leaves it out). Release commits are dropped.
function readClassifiedCommits(range) {
  return readCommits(range)
    .map((raw) => {
      const commit = parseCommit(raw);
      const around = raw.files.includes("package.json") ? packageJsonAround(raw.sha) : null;
      const areas = classifyPaths(raw.files, around ? packageRuntimeChanged(around.before, around.after) : false);
      return { ...commit, areas, group: areas.length > 0 ? groupOf(commit) : null };
    })
    .filter((commit) => commit.areas.length > 0 && !(commit.type === "chore" && commit.scope === "release"));
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

const { version, commit, previous } = resolveRelease(options.tag);
const classified = readClassifiedCommits(previous ? `${previous}..${commit}` : commit);
const shipped = classified.filter((entry) => entry.group);
const warning = bumpWarning(version, previous, shipped);
const repo = repositorySlug();
const withLinks = options.check ? shipped : shipped.map((entry) => ({ ...entry, pr: pullRequestOf(repo, entry.sha) }));
const release = groupRelease(withLinks);
const notes = { tag: version.tag, version: version.version, date: options.date, previousTag: previous, repo, release };
notes.artUrl = options["art-url"];

if (warning) console.error(`warning: ${warning}`);
if (options["dry-run"]) {
  process.stdout.write(renderChangelogSection(notes));
} else if (options.check) {
  // Any library path counts, changelog-worthy or not: a chore(deps) runtime bump still ships.
  const libraryChanged = classified.some((entry) => entry.areas.includes("library"));
  const websiteChanged = classified.some((entry) => entry.areas.includes("website"));
  setOutputs({
    version: version.version,
    prerelease: version.prerelease.length > 0,
    previous_tag: previous ?? "",
    library_changed: libraryChanged,
    website_changed: websiteChanged,
  });
  if (warning) summarize(`> [!WARNING]\n> ${warning}\n`);
  summarize(renderChangelogSection(notes));
} else {
  if (!options["out-dir"]) fail("--out-dir is required unless --dry-run or --check is set");
  writeFiles(notes, options["out-dir"]);
}
