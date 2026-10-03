// Conventional commit parsing and the split of a release into the sections of
// release.config.json (see config.mjs for how paths match).
import { sectionsOf } from "./config.mjs";

const SUBJECT = /^(?<type>[A-Za-z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?: (?<description>.+)$/;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE: /m;

export const GROUPS = ["breaking", "features", "fixes", "performance", "other"];
export const GROUP_TITLES = {
  breaking: "Breaking changes",
  features: "Features",
  fixes: "Fixes",
  performance: "Performance",
  other: "Other changes",
};

const GROUP_BY_TYPE = { feat: "features", fix: "fixes", perf: "performance", refactor: "other", docs: "other" };
const SKIPPED_TYPES = new Set(["chore", "ci", "test", "style", "build"]);

/** Reads type, scope, description and breaking flag from a commit message. */
export function parseCommit({ sha, subject, body = "" }) {
  const match = SUBJECT.exec(subject.trim());
  const breakingFooter = BREAKING_FOOTER.test(body);
  if (!match) {
    const type = /^Revert "/.test(subject) ? "revert" : "other";
    return { sha, subject, type, scope: null, description: subject.trim(), breaking: breakingFooter };
  }
  const { type, scope, bang, description } = match.groups;
  return {
    sha,
    subject,
    type: type.toLowerCase(),
    scope: scope?.trim() || null,
    description: description.trim(),
    breaking: Boolean(bang) || breakingFooter,
  };
}

function isReleaseCommit(commit) {
  return commit.type === "chore" && commit.scope === "release";
}

/** The changelog group of a parsed commit, or null when it is left out. */
export function groupOf(commit) {
  if (isReleaseCommit(commit)) return null;
  if (commit.breaking) return "breaking";
  if (SKIPPED_TYPES.has(commit.type)) return null;
  return GROUP_BY_TYPE[commit.type] ?? "other";
}

/**
 * The raw commits (`{ sha, subject, body, files }`) that touch a section, parsed,
 * each with `sections` (ids in config order) and its changelog `group` (null
 * when the changelog leaves it out). `chore(release)` commits are dropped.
 */
export function classifyCommits(rawCommits, sections) {
  return rawCommits
    .map((raw) => {
      const commit = parseCommit(raw);
      return { ...commit, sections: sectionsOf(raw.files, sections), group: groupOf(commit) };
    })
    .filter((commit) => commit.sections.length > 0 && !isReleaseCommit(commit));
}

/**
 * `changed` and `changed_<id>`: any classified commit counts, changelog-worthy
 * or not (a chore(deps) runtime bump still ships).
 */
export function changedOutputs(classified, sections) {
  const touched = new Set(classified.flatMap((commit) => commit.sections));
  const perSection = sections.map((section) => [`changed_${section.id}`, touched.has(section.id)]);
  return { changed: touched.size > 0, ...Object.fromEntries(perSection) };
}

/**
 * Sorts commits (oldest first, each with `sections`, the ids it touched, and
 * `group`) into `{ [sectionId]: { breaking: [], features: [], ... } }`.
 */
export function groupRelease(commits, sections) {
  const empty = () => Object.fromEntries(GROUPS.map((group) => [group, []]));
  const release = Object.fromEntries(sections.map((section) => [section.id, empty()]));
  for (const commit of commits) {
    if (!commit.group) continue;
    for (const id of commit.sections) release[id][commit.group].push(commit);
  }
  return release;
}

/** Number of entries in one section of a grouped release. */
export function countEntries(sectionGroups) {
  return GROUPS.reduce((total, group) => total + sectionGroups[group].length, 0);
}
