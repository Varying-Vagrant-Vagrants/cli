import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, ensureVvvRunning, cli, exitWithError, verbose, startTimer } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantSsh, vagrantSshSync } from "../utils/vagrant.js";

// Service name mapping (non-PHP services)
// Maps user-friendly names to actual service names
const CORE_SERVICES: Record<string, string> = {
  nginx: "nginx",
  mysql: "mariadb",
  mariadb: "mariadb",
  memcached: "memcached",
  redis: "redis-server",
  elasticsearch: "elasticsearch",
  mailhog: "mailhog",
  mailpit: "mailpit",
};

// Services to check in status output (actual service names)
const STATUS_SERVICES = [
  "nginx",
  "mariadb",
  "memcached",
  "redis-server",
  "elasticsearch",
  "mailhog",
  "mailpit",
];

// Base valid services - PHP versions are detected dynamically
const BASE_VALID_SERVICES = [...Object.keys(CORE_SERVICES), "php"];

/**
 * Check if a service name is valid (either a core service or a PHP version pattern).
 */
function isValidService(service: string): boolean {
  // Core services
  if (BASE_VALID_SERVICES.includes(service)) {
    return true;
  }
  // PHP version pattern like "php8.2" or "php7.4"
  if (/^php\d+\.\d+$/.test(service)) {
    return true;
  }
  return false;
}

/**
 * Get help text for valid service names.
 */
function getValidServicesHelp(): string {
  return "nginx, mysql, mariadb, memcached, php, php<version> (e.g., php8.2)";
}

/**
 * Get installed PHP-FPM versions by checking systemd services.
 * Returns an array of version strings like ["7.4", "8.0", "8.2"]
 */
function getInstalledPhpVersions(vvvPath: string): string[] {
  // List all php*-fpm services that exist
  const result = vagrantSshSync(
    "systemctl list-unit-files 'php*-fpm.service' --no-legend 2>/dev/null | awk '{print $1}'",
    vvvPath
  );

  if (result.status !== 0) {
    verbose(`Failed to list PHP services: ${result.stderr}`);
    return [];
  }

  // Filter out banner lines and parse version numbers
  const boxChars = /[┌┐└┘│─╔╗╚╝║═▀▄█▌▐░▒▓■□▪▫]/;
  const versions: string[] = [];

  for (const line of result.stdout.trim().split("\n")) {
    if (boxChars.test(line) || line.trim() === "") {
      continue;
    }
    // Parse "php8.2-fpm.service" -> "8.2"
    const match = line.match(/php(\d+\.\d+)-fpm\.service/);
    if (match && match[1]) {
      versions.push(match[1]);
    }
  }

  verbose(`Found PHP versions: ${versions.join(", ")}`);
  return versions.sort();
}

/**
 * Get the PHP-FPM service name based on active PHP version.
 */
function getPhpServiceName(vvvPath: string): string {
  const result = vagrantSshSync("php -v 2>/dev/null | head -1", vvvPath);
  // Filter out VVV banner
  const boxChars = /[┌┐└┘│─╔╗╚╝║═▀▄█▌▐░▒▓■□▪▫]/;
  const lines = result.stdout.trim().split("\n").filter((line) => {
    return line.trim() !== "" && !boxChars.test(line);
  });

  for (const line of lines) {
    const match = line.match(/PHP (\d+)\.(\d+)/);
    if (match) {
      return `php${match[1]}.${match[2]}-fpm`;
    }
  }
  return "php8.2-fpm"; // Default fallback
}

/**
 * Get the actual systemd service name.
 */
function getServiceName(service: string, vvvPath: string): string {
  // Handle "php" as alias for current default PHP
  if (service === "php") {
    return getPhpServiceName(vvvPath);
  }
  // Handle specific PHP versions like "php8.2" -> "php8.2-fpm"
  const phpMatch = service.match(/^php(\d+\.\d+)$/);
  if (phpMatch) {
    return `php${phpMatch[1]}-fpm`;
  }
  return CORE_SERVICES[service] || service;
}

/**
 * Get status of a single service.
 * Uses 'sudo service' command for proper permissions in Docker containers.
 * Falls back to pgrep if service script doesn't detect running process.
 */
function getServiceStatus(serviceName: string, vvvPath: string): { running: boolean; status: string } {
  const result = vagrantSshSync(`sudo service ${serviceName} status 2>&1`, vvvPath);
  // Filter out VVV banner lines
  const boxChars = /[┌┐└┘│─╔╗╚╝║═▀▄█▌▐░▒▓■□▪▫]/;
  const lines = result.stdout.trim().split("\n").filter((line) => {
    return line.trim() !== "" && !boxChars.test(line);
  });

  // Check if any line contains "is running" or "Uptime" (MariaDB has different output)
  let isRunning = lines.some((line) => line.includes("is running") || line.includes("Uptime"));

  // Fallback: check if process is actually running even if service script says no
  // This handles cases where service was started manually or PID file is missing
  if (!isRunning) {
    const processName = serviceName.replace(/\d+\.\d+-/, "-");
    const pgrepResult = vagrantSshSync(
      `pgrep -x "${processName}" >/dev/null 2>&1 || pgrep -x "${serviceName}" >/dev/null 2>&1; echo $?`,
      vvvPath
    );
    const exitCode = pgrepResult.stdout.trim().split("\n").pop();
    if (exitCode === "0") {
      isRunning = true;
      verbose(`Service ${serviceName} detected via pgrep fallback`);
    }
  }

  return {
    running: isRunning,
    status: isRunning ? "active" : "inactive",
  };
}

/**
 * Get status of all services using batched SSH calls.
 */
function getAllServicesStatus(vvvPath: string): Record<string, { name: string; running: boolean; status: string; isDefault?: boolean }> {
  const statuses: Record<string, { name: string; running: boolean; status: string; isDefault?: boolean }> = {};

  // Get installed PHP versions and default PHP version
  const phpVersions = getInstalledPhpVersions(vvvPath);
  const defaultPhpService = getPhpServiceName(vvvPath);
  const defaultPhpVersion = defaultPhpService.match(/php(\d+\.\d+)-fpm/)?.[1] || "";

  verbose(`Default PHP version: ${defaultPhpVersion}`);
  verbose(`Installed PHP versions: ${phpVersions.join(", ")}`);

  // Build list of services to check
  // All installed PHP-FPM versions
  const phpServiceList = phpVersions.map(v => `php${v}-fpm`);

  const allServices = [...STATUS_SERVICES, ...phpServiceList];

  verbose(`Checking ${allServices.length} services in a single SSH call...`);
  const getElapsed = startTimer();

  // Batch check: run service status for all services in one SSH call
  // Use 'sudo service' for proper permissions in Docker containers
  // Check for "is running" (most services) or "Uptime" (MariaDB has different output)
  // Fallback to pgrep if service status says not running (handles manual starts, missing PID files)
  // Output format: servicename:active|inactive|notfound
  const command = allServices
    .map((name) => {
      // Get the process name for pgrep (strip version suffixes like php8.2-fpm -> php-fpm)
      const processName = name.replace(/\d+\.\d+-/, "-");
      return `output=$(sudo service ${name} status 2>&1); if echo "$output" | grep -qE "is running|Uptime"; then echo "${name}:active"; elif echo "$output" | grep -q "unrecognized service"; then echo "${name}:notfound"; elif pgrep -x "${processName}" >/dev/null 2>&1 || pgrep -x "${name}" >/dev/null 2>&1; then echo "${name}:active"; else echo "${name}:inactive"; fi`;
    })
    .join("; ");

  const result = vagrantSshSync(command, vvvPath);

  verbose(`Service status check completed (${getElapsed()})`);
  verbose(`SSH exit code: ${result.status}`);
  verbose(`SSH stdout length: ${result.stdout?.length || 0}`);

  // Parse results, filtering out VVV banner (box-drawing characters)
  const boxChars = /[┌┐└┘│─╔╗╚╝║═▀▄█▌▐░▒▓■□▪▫]/;
  const statusMap: Record<string, string> = {};
  if (result.status === 0) {
    for (const line of result.stdout.trim().split("\n")) {
      // Skip banner lines
      if (boxChars.test(line) || line.trim() === "") {
        verbose(`Skipping banner line: ${line.substring(0, 50)}`);
        continue;
      }
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const name = line.slice(0, colonIndex).trim();
        const status = line.slice(colonIndex + 1).trim();
        if (name && status) {
          verbose(`Parsed service: ${name} = ${status}`);
          statusMap[name] = status;
        }
      }
    }
  } else {
    verbose(`SSH command failed: ${result.stderr}`);
  }

  // Build results for core services (only show installed ones)
  for (const service of STATUS_SERVICES) {
    const status = statusMap[service] || "unknown";
    // Skip services that aren't installed
    if (status === "notfound" || status === "unknown") {
      verbose(`Skipping ${service}: not installed`);
      continue;
    }
    statuses[service] = {
      name: service,
      running: status === "active",
      status,
    };
  }

  // Build results for PHP services
  for (const version of phpVersions) {
    const serviceName = `php${version}-fpm`;
    const status = statusMap[serviceName] || "unknown";

    statuses[`php${version}`] = {
      name: serviceName,
      running: status === "active",
      status,
      isDefault: version === defaultPhpVersion,
    };
  }

  return statuses;
}

// Status subcommand
const statusCommand = new Command("status")
  .alias("list")
  .description("Show status of all services")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();
    ensureVvvRunning(vvvPath);

    const statuses = getAllServicesStatus(vvvPath);

    if (options.json) {
      console.log(JSON.stringify({ services: statuses }, null, 2));
      return;
    }

    console.log("");
    cli.bold("Service Status");
    console.log("");

    const nameWidth = 22;  // Accommodate "php8.2 (default)"
    const serviceWidth = 16;

    console.log(`${"Service".padEnd(nameWidth)}${"Service Name".padEnd(serviceWidth)}Status`);
    console.log("─".repeat(nameWidth + serviceWidth + 12));

    // Map service names to user-friendly display names
    const displayNames: Record<string, string> = {
      "redis-server": "redis",
    };

    for (const [service, info] of Object.entries(statuses)) {
      // Show "(default)" indicator for the default PHP version
      const defaultMarker = info.isDefault ? " (default)" : "";
      const friendlyName = displayNames[service] || service;
      const displayName = friendlyName + defaultMarker;

      const statusText = info.running
        ? cli.format.success("running")
        : cli.format.error(info.status);
      console.log(`${displayName.padEnd(nameWidth)}${info.name.padEnd(serviceWidth)}${statusText}`);
    }

    console.log("");
  });

// Restart subcommand
const restartCommand = new Command("restart")
  .description("Restart a service")
  .argument("<service>", `Service to restart (${getValidServicesHelp()})`)
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action(async (service, options) => {
    const vvvPath = options.path;

    if (!isValidService(service)) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Invalid service: ${service}` }, null, 2));
        process.exit(1);
      }
      exitWithError(`Invalid service: ${service}`, `Valid services: ${getValidServicesHelp()}`);
    }

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();
    ensureVvvRunning(vvvPath);

    const serviceName = getServiceName(service, vvvPath);

    if (!options.json) {
      cli.info(`Restarting ${service} (${serviceName})...`);
    }

    const code = await vagrantSsh(`sudo service ${serviceName} restart`, vvvPath);

    if (options.json) {
      console.log(JSON.stringify({ success: code === 0, service, serviceName, action: "restart" }, null, 2));
      process.exit(code);
    }

    if (code === 0) {
      cli.success(`${service} restarted successfully.`);
    } else {
      cli.error(`Failed to restart ${service}.`);
      process.exit(code);
    }
  });

// Start subcommand
const startCommand = new Command("start")
  .description("Start a service")
  .argument("<service>", `Service to start (${getValidServicesHelp()})`)
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action(async (service, options) => {
    const vvvPath = options.path;

    if (!isValidService(service)) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Invalid service: ${service}` }, null, 2));
        process.exit(1);
      }
      exitWithError(`Invalid service: ${service}`, `Valid services: ${getValidServicesHelp()}`);
    }

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();
    ensureVvvRunning(vvvPath);

    const serviceName = getServiceName(service, vvvPath);

    if (!options.json) {
      cli.info(`Starting ${service} (${serviceName})...`);
    }

    const code = await vagrantSsh(`sudo service ${serviceName} start`, vvvPath);

    if (options.json) {
      console.log(JSON.stringify({ success: code === 0, service, serviceName, action: "start" }, null, 2));
      process.exit(code);
    }

    if (code === 0) {
      cli.success(`${service} started successfully.`);
    } else {
      cli.error(`Failed to start ${service}.`);
      process.exit(code);
    }
  });

// Stop subcommand
const stopCommand = new Command("stop")
  .description("Stop a service")
  .argument("<service>", `Service to stop (${getValidServicesHelp()})`)
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action(async (service, options) => {
    const vvvPath = options.path;

    if (!isValidService(service)) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Invalid service: ${service}` }, null, 2));
        process.exit(1);
      }
      exitWithError(`Invalid service: ${service}`, `Valid services: ${getValidServicesHelp()}`);
    }

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();
    ensureVvvRunning(vvvPath);

    const serviceName = getServiceName(service, vvvPath);

    if (!options.json) {
      cli.info(`Stopping ${service} (${serviceName})...`);
    }

    const code = await vagrantSsh(`sudo service ${serviceName} stop`, vvvPath);

    if (options.json) {
      console.log(JSON.stringify({ success: code === 0, service, serviceName, action: "stop" }, null, 2));
      process.exit(code);
    }

    if (code === 0) {
      cli.success(`${service} stopped successfully.`);
    } else {
      cli.error(`Failed to stop ${service}.`);
      process.exit(code);
    }
  });

export const serviceCommand = new Command("service")
  .description("Manage VVV services")
  .addCommand(statusCommand)
  .addCommand(restartCommand)
  .addCommand(startCommand)
  .addCommand(stopCommand);
