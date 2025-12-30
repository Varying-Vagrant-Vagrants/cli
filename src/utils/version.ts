/**
 * Version utilities for CLI version information
 */

import { VERSION, BUILD_DATE, IS_COMPILED, GIT_COMMIT } from "../version.js";

/**
 * Get the CLI version string.
 * Returns "X.Y.Z-dev" for development builds, "X.Y.Z" for compiled binaries.
 */
export function getCliVersion(): string {
  return IS_COMPILED ? VERSION : `${VERSION}-dev`;
}

/**
 * Get the build date (ISO 8601 string).
 * Returns null for development builds.
 */
export function getBuildDate(): string | null {
  return BUILD_DATE;
}

/**
 * Get the git commit hash (short form).
 * Returns null if not available or for development builds.
 */
export function getGitCommit(): string | null {
  return GIT_COMMIT;
}

/**
 * Check if this is a compiled binary (vs running from source).
 */
export function isCompiledBinary(): boolean {
  return IS_COMPILED;
}

/**
 * Format build date for display (YYYY-MM-DD).
 * Returns empty string if date is null.
 */
export function formatBuildDate(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}
