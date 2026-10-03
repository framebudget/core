// Conventional commit parsing and the split of a release into what shipped:
// the library (the npm package) and the website (docs/ and worker/).

const SUBJECT = /^(?<type>[A-Za-z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?: (?<description>.+)$/;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE: /m;

export const AREAS = ["library", "website"];
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

const LIBRARY_FILES = new Set(["README.md", "scripts/build-boot.mjs", "tsup.config.ts"]);
const WEBSITE_PREFIXES = ["docs/", "worker/"];

// package.json fields that change what consumers install; scripts, devDependencies
// and tool config do not.
const RUNTIME_FIELDS = [
  "name",
  "version",
  "type",
  "exports",
  "main",
  "module",
  "types",
  "files",
  "sideEffects",
  "bin",
  "engines",
  "dependencies",
  "peerDependencies",
  "peerDependenciesMeta",
  "optionalDependencies",
];

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

/** True when a package.json change touches a field that ships to consumers. */
export function packageRuntimeChanged(before, after) {
  return RUNTIME_FIELDS.some((field) => JSON.stringify(before?.[field]) !== JSON.stringify(after?.[field]));
}

/**
 * The areas a commit shipped to, from its changed paths. `packageChanged`
 * tells whether a package.json change touched a runtime field.
 */
export function classifyPaths(files, packageChanged = false) {
  const areas = new Set();
  for (const file of files) {
    if (file.startsWith("src/") || LIBRARY_FILES.has(file)) areas.add("library");
    if (file === "package.json" && packageChanged) areas.add("library");
    if (WEBSITE_PREFIXES.some((prefix) => file.startsWith(prefix))) areas.add("website");
  }
  return AREAS.filter((area) => areas.has(area));
}

/** The changelog group of a parsed commit, or null when it is left out. */
export function groupOf(commit) {
  if (commit.type === "chore" && commit.scope === "release") return null;
  if (commit.breaking) return "breaking";
  if (SKIPPED_TYPES.has(commit.type)) return null;
  return GROUP_BY_TYPE[commit.type] ?? "other";
}

/**
 * Sorts commits (oldest first, each with `areas` and `group`) into
 * `{ library: { breaking: [], ... }, website: { ... } }`.
 */
export function groupRelease(commits) {
  const empty = () => Object.fromEntries(GROUPS.map((group) => [group, []]));
  const release = { library: empty(), website: empty() };
  for (const commit of commits) {
    if (!commit.group) continue;
    for (const area of commit.areas) release[area][commit.group].push(commit);
  }
  return release;
}

/** Number of entries in one area of a grouped release. */
export function countEntries(areaGroups) {
  return GROUPS.reduce((total, group) => total + areaGroups[group].length, 0);
}
