/**
 * Shared Vagrant utilities for executing vagrant commands.
 */

import { spawn, spawnSync, type SpawnSyncReturns } from "child_process";
import { exitWithError, verbose } from "./cli.js";

/**
 * Escape a string for safe use in a shell single-quoted string.
 * Replaces ' with '\'' (end quote, escaped quote, start quote).
 */
export function escapeShellArg(arg: string): string {
  return arg.replace(/'/g, "'\\''");
}

/**
 * Escape a string for safe use in a MySQL single-quoted string.
 * Escapes backslashes and single quotes.
 */
export function escapeMySqlString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Validate that a database name contains only safe characters.
 * MySQL identifiers can contain alphanumeric, underscore, and dollar sign.
 * We also allow hyphens as they're common in WordPress database names.
 */
export function isValidDatabaseName(name: string): boolean {
  return /^[a-zA-Z0-9_$-]+$/.test(name) && name.length > 0 && name.length <= 64;
}

/**
 * Escape a MySQL identifier (database name, table name, etc.) for use in backticks.
 * Doubles any backticks in the name.
 */
export function escapeMySqlIdentifier(identifier: string): string {
  return identifier.replace(/`/g, "``");
}

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
  verbose(`Running: vagrant ${args.join(" ")}`);
  verbose(`Working directory: ${vvvPath}`);

  return new Promise((resolve) => {
    const vagrant = spawn("vagrant", args, {
      cwd: vvvPath,
      stdio: "inherit",
    });

    // Track the process for graceful shutdown
    if (vagrant.pid) {
      // Dynamic import to avoid circular dependency
      import("../index.js").then(({ registerChildProcess, unregisterChildProcess }) => {
        registerChildProcess(vagrant.pid!);
        vagrant.on("close", () => unregisterChildProcess(vagrant.pid!));
      }).catch(() => {
        // Ignore if module not available (e.g., during tests)
      });
    }

    vagrant.on("error", (error) => {
      verbose(`Process error: ${error.message}`);
      resolve(1);
    });

    vagrant.on("close", (code) => {
      verbose(`Exit code: ${code}`);
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

  // Track the process for graceful shutdown
  if (vagrant.pid) {
    import("../index.js").then(({ registerChildProcess, unregisterChildProcess }) => {
      registerChildProcess(vagrant.pid!);
      vagrant.on("close", () => unregisterChildProcess(vagrant.pid!));
    }).catch(() => {
      // Ignore if module not available
    });
  }

  vagrant.on("error", (error) => {
    verbose(`Process error: ${error.message}`);
    process.exit(1);
  });

  vagrant.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

/**
 * Run a vagrant command synchronously with timeout.
 */
export function vagrantRunSync(
  args: string[],
  vvvPath: string,
  timeout: number = 30000
): SpawnSyncReturns<string> {
  verbose(`Running sync: vagrant ${args.join(" ")}`);

  return spawnSync("vagrant", args, {
    cwd: vvvPath,
    encoding: "utf-8",
    timeout,
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
  vvvPath: string,
  timeout: number = 30000
): SpawnSyncReturns<string> {
  verbose(`SSH command: ${command}`);
  verbose(`Working directory: ${vvvPath}`);

  const result = spawnSync("vagrant", ["ssh", "-c", command, "--", "-T"], {
    cwd: vvvPath,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout,
  });

  verbose(`Exit code: ${result.status}`);
  return result;
}

/**
 * Run a MySQL command inside VVV and return the output.
 * Filters out system output and validates results.
 * Note: query is properly escaped for shell single quotes.
 */
export function mysqlQuery(query: string, vvvPath: string): string[] {
  // Escape the query for safe inclusion in a shell single-quoted string
  const escapedQuery = escapeShellArg(query);
  const result = vagrantSshSync(
    `mysql --batch --skip-column-names -e '${escapedQuery}'`,
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
