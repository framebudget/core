// Thin wrappers over the git and gh CLIs. Everything here shells out; the
// logic that decides anything lives in the pure modules next to this one.
import { execFileSync } from "node:child_process";

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function tryRun(command, args) {
  try {
    return run(command, args);
  } catch {
    return null;
  }
}

export function listTags() {
  return run("git", ["tag", "--list"]).split("\n").filter(Boolean);
}

/** The commit a ref points to, or null when it does not exist. */
export function resolveCommit(ref) {
  return tryRun("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
}

/** Commits in `range`, oldest first, each with its subject, body and changed paths. */
export function readCommits(range) {
  const format = "%x1e%H%x1f%s%x1f%b%x1f";
  const log = run("git", [
    "log",
    "--reverse",
    "--no-merges",
    "--no-renames",
    "--name-only",
    `--format=${format}`,
    range,
  ]);
  return log
    .split("\u001E")
    .filter((record) => record.trim())
    .map((record) => {
      const [sha, subject, body, files] = record.split("\u001F");
      return { sha, subject, body: body.trim(), files: files.split("\n").filter(Boolean) };
    });
}

function readJsonAt(revision, file) {
  const text = tryRun("git", ["show", `${revision}:${file}`]);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** package.json before and after a commit (null where it did not exist). */
export function packageJsonAround(sha) {
  return { before: readJsonAt(`${sha}^`, "package.json"), after: readJsonAt(sha, "package.json") };
}

/** `owner/repo`, from GITHUB_REPOSITORY or the origin remote; null when unknown. */
export function repositorySlug() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const url = tryRun("git", ["remote", "get-url", "origin"]) ?? "";
  return /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url)?.[1] ?? null;
}

/** The pull request a commit came from, best effort: null on any failure or without a token. */
export function pullRequestOf(repo, sha) {
  if (!repo || !(process.env.GITHUB_TOKEN || process.env.GH_TOKEN)) return null;
  const query = "[.[] | select(.merged_at != null)][0].number // empty";
  const number = tryRun("gh", ["api", `repos/${repo}/commits/${sha}/pulls`, "--jq", query]);
  return number ? Number(number) : null;
}
