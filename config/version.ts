import { execSync } from "node:child_process";

function tryGitCommand(command: string): string | null {
  try {
    const result = execSync(command, { stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" }).trim();
    return result.length > 0 ? result : null;
  } catch {
    return null;
  }
}

function parseCount(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function resolveMainRef(): string | null {
  const candidates = ["main", "origin/main"];
  for (const ref of candidates) {
    if (tryGitCommand(`git rev-parse --verify --quiet ${ref}`)) {
      return ref;
    }
  }
  return null;
}

/**
 * Computes a version label that increments with commits to the main branch.
 *
 * The format is `v0.1.<main-count>-<ahead>-<sha>`, where `ahead` and `sha` are optional.
 * When `main` is unavailable (e.g., shallow clone), we fall back to HEAD counts instead
 * of throwing to keep local builds working.
 */
export function computeAppVersion(): string {
  const baseVersion = "0.1";
  const mainRef = resolveMainRef();
  const headSha = tryGitCommand("git rev-parse --short HEAD");

  if (mainRef) {
    const mainCount = parseCount(tryGitCommand(`git rev-list --count ${mainRef}`));
    const aheadCount = parseCount(tryGitCommand(`git rev-list --count ${mainRef}..HEAD`)) ?? 0;
    if (mainCount !== null) {
      const suffixParts: string[] = [];
      if (aheadCount > 0) suffixParts.push(`${aheadCount}ahead`);
      if (headSha) suffixParts.push(headSha);
      const suffix = suffixParts.length ? `-${suffixParts.join("-")}` : "";
      return `v${baseVersion}.${mainCount}${suffix}`;
    }
  }

  const headCount = parseCount(tryGitCommand("git rev-list --count HEAD"));
  if (headCount !== null) {
    return `v${baseVersion}.${headCount}${headSha ? `-${headSha}` : ""}`;
  }

  return `v${baseVersion}.dev`;
}
