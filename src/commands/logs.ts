import { Command } from "commander";
import { spawn, spawnSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, cli, exitWithError } from "../utils/cli.js";

// Log types and their relative paths within vvvPath/log/
const LOG_TYPES: Record<string, { path: string; description: string }> = {
  "nginx-error": { path: "nginx/error.log", description: "Nginx error log" },
  "nginx-access": { path: "nginx/access.log", description: "Nginx access log" },
  php: { path: "php/", description: "PHP-FPM log (specify version with --php-version)" },
  "php-errors": { path: "php/", description: "PHP error log (specify version with --php-version)" },
  xdebug: { path: "php/xdebug-remote.log", description: "Xdebug remote log" },
  mysql: { path: "mysql/error.log", description: "MySQL/MariaDB error log" },
  memcached: { path: "memcached/memcached.log", description: "Memcached log" },
};

/**
 * Get available PHP versions from the log directory.
 */
function getAvailablePhpVersions(vvvPath: string): string[] {
  const phpLogDir = join(vvvPath, "log", "php");
  if (!existsSync(phpLogDir)) {
    return [];
  }

  const files = readdirSync(phpLogDir);
  const versions: string[] = [];

  for (const file of files) {
    const match = file.match(/^php(\d+\.\d+)-fpm\.log$/);
    if (match && match[1]) {
      versions.push(match[1]);
    }
  }

  return versions.sort();
}

/**
 * Resolve the actual log file path.
 */
function resolveLogPath(logType: string, vvvPath: string, phpVersion?: string): string | null {
  const logDir = join(vvvPath, "log");

  if (!existsSync(logDir)) {
    return null;
  }

  // Handle PHP logs
  if (logType === "php" || logType === "php-errors") {
    const versions = getAvailablePhpVersions(vvvPath);
    if (versions.length === 0) {
      return null;
    }

    const version = phpVersion || versions[versions.length - 1]; // Default to latest
    if (logType === "php-errors") {
      return join(logDir, "php", `php${version}_errors.log`);
    }
    return join(logDir, "php", `php${version}-fpm.log`);
  }

  // Standard log types
  const logInfo = LOG_TYPES[logType];
  if (!logInfo) {
    return null;
  }

  const logPath = join(logDir, logInfo.path);
  return existsSync(logPath) ? logPath : null;
}

const VALID_LOG_TYPES = Object.keys(LOG_TYPES);

export const logsCommand = new Command("logs")
  .description("View service logs from the local VVV log directory")
  .argument("[service]", `Log to view: ${VALID_LOG_TYPES.join(", ")}`)
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-f, --follow", "Follow log output (like tail -f)")
  .option("-n, --lines <number>", "Number of lines to show", "50")
  .option("--php-version <version>", "PHP version for php/php-errors logs (e.g., 8.2)")
  .option("--site <site>", "Filter nginx logs to a specific site")
  .option("--json", "Output as JSON (not available with --follow)")
  .option("-l, --list", "List available log types and PHP versions")
  .action((service, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    const logDir = join(vvvPath, "log");
    if (!existsSync(logDir)) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Log directory not found: ${logDir}` }, null, 2));
        process.exit(1);
      }
      exitWithError(`Log directory not found: ${logDir}\nMake sure VVV has been provisioned at least once.`);
    }

    // List mode
    if (options.list) {
      const phpVersions = getAvailablePhpVersions(vvvPath);

      if (options.json) {
        console.log(JSON.stringify({
          logTypes: LOG_TYPES,
          phpVersions,
          logDirectory: logDir,
        }, null, 2));
        return;
      }

      console.log("");
      cli.bold("Available Log Types");
      console.log("");
      for (const [name, info] of Object.entries(LOG_TYPES)) {
        console.log(`  ${name.padEnd(15)} ${cli.format.dim(info.description)}`);
      }

      if (phpVersions.length > 0) {
        console.log("");
        cli.bold("Available PHP Versions");
        console.log("");
        console.log(`  ${phpVersions.join(", ")}`);
        console.log("");
        console.log(`  Use: ${cli.format.dim("vvvlocal logs php --php-version 8.2")}`);
      }

      console.log("");
      return;
    }

    // Require service argument
    if (!service) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: "Log service required. Use --list to see available types." }, null, 2));
        process.exit(1);
      }
      cli.error("Log service required.");
      console.log("");
      console.log("Available types: " + VALID_LOG_TYPES.join(", "));
      console.log("Use --list to see all log types and PHP versions.");
      process.exit(1);
    }

    const logType = service.toLowerCase();

    if (!LOG_TYPES[logType]) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Unknown log type: ${logType}` }, null, 2));
        process.exit(1);
      }
      cli.error(`Unknown log type: ${logType}`);
      console.log("");
      console.log("Available types: " + VALID_LOG_TYPES.join(", "));
      console.log("Use --list to see all log types.");
      process.exit(1);
    }

    // Resolve the actual log file path
    const logPath = resolveLogPath(logType, vvvPath, options.phpVersion);

    if (!logPath || !existsSync(logPath)) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Log file not found for ${logType}` }, null, 2));
        process.exit(1);
      }

      // Provide helpful message for PHP logs
      if (logType === "php" || logType === "php-errors") {
        const versions = getAvailablePhpVersions(vvvPath);
        if (versions.length > 0) {
          cli.error(`PHP log not found. Available versions: ${versions.join(", ")}`);
          console.log("");
          console.log(`Use: vvvlocal logs ${logType} --php-version ${versions[versions.length - 1]}`);
        } else {
          cli.error("No PHP logs found.");
        }
      } else {
        cli.error(`Log file not found for ${logType}`);
      }
      process.exit(1);
    }

    const lines = parseInt(options.lines, 10) || 50;

    // Follow mode
    if (options.follow) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: "--json cannot be used with --follow" }, null, 2));
        process.exit(1);
      }

      cli.info(`Following ${logType} logs: ${cli.format.dim(logPath)}`);
      cli.info("Press Ctrl+C to stop...");
      console.log("");

      // Build tail command with optional grep
      const tailArgs = ["-f", "-n", String(lines), logPath];

      if (options.site && (logType === "nginx-access" || logType === "nginx-error")) {
        // Use shell to pipe through grep
        const tailCmd = `tail -f -n ${lines} "${logPath}" | grep --line-buffered '${options.site}'`;
        const child = spawn("sh", ["-c", tailCmd], { stdio: "inherit" });
        child.on("exit", (code) => process.exit(code || 0));
      } else {
        const child = spawn("tail", tailArgs, { stdio: "inherit" });
        child.on("exit", (code) => process.exit(code || 0));
      }
      return;
    }

    // Read log file
    let logContent: string;
    try {
      // Use tail to get last N lines
      const result = spawnSync("tail", ["-n", String(lines), logPath], { encoding: "utf-8" });
      if (result.status !== 0) {
        throw new Error(result.stderr || "Failed to read log file");
      }
      logContent = result.stdout;
    } catch (err) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Failed to read log: ${err}` }, null, 2));
        process.exit(1);
      }
      exitWithError(`Failed to read log file: ${err}`);
      return;
    }

    // Filter by site if specified
    if (options.site && (logType === "nginx-access" || logType === "nginx-error")) {
      const siteFilter = options.site.toLowerCase();
      logContent = logContent
        .split("\n")
        .filter(line => line.toLowerCase().includes(siteFilter))
        .join("\n");
    }

    const logLines = logContent.trim().split("\n").filter(l => l.trim());

    // JSON output
    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        logType,
        logPath,
        lineCount: logLines.length,
        lines: logLines,
      }, null, 2));
      return;
    }

    // Interactive output
    cli.info(`${logType} logs (last ${lines} lines): ${cli.format.dim(logPath)}`);
    console.log("");

    if (logLines.length === 0) {
      console.log(cli.format.dim("  (no log entries)"));
    } else {
      console.log(logContent);
    }
  });
