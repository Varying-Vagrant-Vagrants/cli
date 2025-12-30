/**
 * Path utilities for display formatting.
 */

import { homedir, platform } from "os";
import { relative, isAbsolute } from "path";

/**
 * Shorten a path for display:
 * - If inside basePath, show relative path (e.g., "www/wordpress-one")
 * - If outside basePath, show full path with ~ for home directory on non-Windows
 */
export function shortenPath(fullPath: string, basePath: string): string {
  // Normalize paths for comparison
  const normalizedFull = fullPath.replace(/\/$/, "");
  const normalizedBase = basePath.replace(/\/$/, "");

  // Check if path is inside the base path
  if (normalizedFull.startsWith(normalizedBase + "/")) {
    // Return relative path from base
    return relative(normalizedBase, normalizedFull);
  }

  // Path is outside base - shorten with ~ if on non-Windows
  return replaceHomeWithTilde(fullPath);
}

/**
 * Replace home directory path with ~ on non-Windows systems.
 */
export function replaceHomeWithTilde(path: string): string {
  if (platform() === "win32") {
    return path;
  }

  const home = homedir();
  if (path.startsWith(home)) {
    return "~" + path.slice(home.length);
  }

  return path;
}
