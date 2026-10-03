// Semver for release tags: parse, order (prerelease included) and bump levels.

export const TAG_PATTERN = /^v(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

const BUMPS = ["patch", "minor", "major"];

/** Parses `vX.Y.Z[-pre]`; returns null when the tag is not a release tag. */
export function parseTag(tag) {
  const match = TAG_PATTERN.exec(tag);
  if (!match) return null;
  const [, major, minor, patch, prerelease] = match;
  return {
    tag,
    version: tag.slice(1),
    core: [Number(major), Number(minor), Number(patch)],
    prerelease: prerelease ? prerelease.split(".") : [],
  };
}

function compareIdentifiers(a, b) {
  const aNumeric = /^\d+$/.test(a);
  const bNumeric = /^\d+$/.test(b);
  if (aNumeric && bNumeric) return Math.sign(Number(a) - Number(b));
  if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function comparePrerelease(a, b) {
  if (a.length === 0 || b.length === 0) return Math.sign(b.length - a.length);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    const order = compareIdentifiers(a[index], b[index]);
    if (order !== 0) return order;
  }
  return Math.sign(a.length - b.length);
}

/** Orders two parsed versions per semver 2.0: -1, 0 or 1. */
export function compareVersions(a, b) {
  for (let index = 0; index < 3; index += 1) {
    if (a.core[index] !== b.core[index]) return Math.sign(a.core[index] - b.core[index]);
  }
  return comparePrerelease(a.prerelease, b.prerelease);
}

/** The highest release tag in `tags` other than `current`, or null. */
export function previousTag(tags, current) {
  const versions = tags
    .filter((tag) => tag !== current)
    .map(parseTag)
    .filter(Boolean)
    .sort((a, b) => compareVersions(b, a));
  return versions[0]?.tag ?? null;
}

/** The bump from `from` to `to`, or null when their X.Y.Z is the same (prerelease steps). */
export function bumpBetween(from, to) {
  if (to.core[0] !== from.core[0]) return "major";
  if (to.core[1] !== from.core[1]) return "minor";
  if (to.core[2] !== from.core[2]) return "patch";
  return null;
}

/** The bump the commits ask for; breaking changes only ask for minor while the major is 0. */
export function impliedBump(commits, from) {
  if (commits.some((commit) => commit.breaking)) return from.core[0] === 0 ? "minor" : "major";
  if (commits.some((commit) => commit.type === "feat")) return "minor";
  return "patch";
}

function isSmallerBump(bump, needed) {
  return BUMPS.indexOf(bump) < BUMPS.indexOf(needed);
}

/** A warning when the tag bumps less than its commits ask for; null when it is fine or there is no previous tag. */
export function bumpWarning(version, previous, commits) {
  if (!previous) return null;
  const from = parseTag(previous);
  const bump = bumpBetween(from, version);
  const needed = impliedBump(commits, from);
  if (!bump || !isSmallerBump(bump, needed)) return null;
  return `${version.tag} is a ${bump} release after ${previous}, but its commits ask for a ${needed} release.`;
}
