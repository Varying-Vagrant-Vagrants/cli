/**
 * Shared Vagrant utilities for executing vagrant commands.
 */

import { spawn, spawnSync, type SpawnSyncReturns, type ChildProcess } from "child_process";
import { cli, exitWithError } from "./cli.js";

/**
 * Check if Vagrant is installed and available in PATH.
 */
export function isVagrantInstalled(): boolean {
  const result = Bun.spawnSync(["which", "vagrant"]);
  return result.exitCode === 0;
}

/**
 * Ensure Vagrant is installed, exit with error if not.
 */
export function ensureVagrantInstalled(): void {
  if (!isVagrantInstalled()) {
    exitWithError("Vagrant is not installed or not in PATH.\nRun 'vvvlocal install' to install prerequisites.");
  }
}

/**
 * Run a vagrant command asynchronously with inherited stdio.
 * Returns a promise that resolves with the exit code.
 */
export function vagrantRun(args: string[], vvvPath: string): Promise<number> {
  return new Promise((resolve) => {
    const vagrant = spawn("vagrant", args, {
      cwd: vvvPath,
      stdio: "inherit",
    });

    vagrant.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

/**
 * Run a vagrant command and exit the process when complete.
 * Useful for commands that should just pass through to vagrant.
 */
export function vagrantRunAndExit(args: string[], vvvPath: string): void {
  const vagrant = spawn("vagrant", args, {
    cwd: vvvPath,
    stdio: "inherit",
  });

  vagrant.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

/**
 * Run a vagrant command synchronously.
 */
export function vagrantRunSync(
  args: string[],
  vvvPath: string
): SpawnSyncReturns<string> {
  return spawnSync("vagrant", args, {
    cwd: vvvPath,
    encoding: "utf-8",
  });
}

/**
 * Run a command inside VVV via vagrant ssh asynchronously with inherited stdio.
 * Returns a promise that resolves with the exit code.
 */
export function vagrantSsh(command: string, vvvPath: string): Promise<number> {
  return vagrantRun(["ssh", "-c", command], vvvPath);
}

/**
 * Run a command inside VVV via vagrant ssh and exit when complete.
 */
export function vagrantSshAndExit(command: string, vvvPath: string): void {
  vagrantRunAndExit(["ssh", "-c", command], vvvPath);
}

/**
 * Run a command inside VVV via vagrant ssh synchronously.
 * Uses -T flag to disable pseudo-terminal (avoids VVV welcome banner).
 */
export function vagrantSshSync(
  command: string,
  vvvPath: string
): SpawnSyncReturns<string> {
  return spawnSync("vagrant", ["ssh", "-c", command, "--", "-T"], {
    cwd: vvvPath,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

/**
 * Run a MySQL command inside VVV and return the output.
 * Filters out system output and validates results.
 */
export function mysqlQuery(query: string, vvvPath: string): string[] {
  const result = vagrantSshSync(
    `mysql --batch --skip-column-names -e '${query}'`,
    vvvPath
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || "MySQL query failed");
  }

  // Filter out empty lines and any box-drawing characters from VVV banner
  const boxChars = /[┌┐└┘│─╔╗╚╝║═▀▄█▌▐░▒▓■□▪▫]/;
  return result.stdout
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (line === "") return false;
      if (boxChars.test(line)) return false;
      return true;
    });
}

/**
 * System databases that should typically be excluded from user-facing lists.
 */
export const SYSTEM_DATABASES = ["information_schema", "mysql", "performance_schema", "sys"];

/**
 * Get list of user databases (excludes system databases).
 */
export function getUserDatabases(vvvPath: string): string[] {
  const databases = mysqlQuery("SHOW DATABASES", vvvPath);
  // Filter system databases and validate names
  return databases.filter((name) => {
    if (SYSTEM_DATABASES.includes(name)) return false;
    // Valid database names only contain alphanumeric, underscore, hyphen
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) return false;
    return true;
  });
}
