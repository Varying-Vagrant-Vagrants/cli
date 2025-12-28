import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, ensureVvvRunning, cli, exitWithError } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantSsh, vagrantSshSync } from "../utils/vagrant.js";

// Service name mapping
const SERVICES: Record<string, string | null> = {
  nginx: "nginx",
  php: null, // Detected dynamically
  mysql: "mariadb",
  mariadb: "mariadb",
  memcached: "memcached",
};

const VALID_SERVICES = Object.keys(SERVICES);
const VALID_ACTIONS = ["restart", "start", "stop", "status"];

/**
 * Get the PHP-FPM service name based on active PHP version.
 */
function getPhpServiceName(vvvPath: string): string {
  const result = vagrantSshSync("php -v 2>/dev/null | head -1", vvvPath);
  const match = result.stdout.match(/PHP (\d+)\.(\d+)/);
  if (match) {
    return `php${match[1]}.${match[2]}-fpm`;
  }
  return "php8.2-fpm"; // Default fallback
}

/**
 * Get the actual systemd service name.
 */
function getServiceName(service: string, vvvPath: string): string {
  if (service === "php") {
    return getPhpServiceName(vvvPath);
  }
  return SERVICES[service] || service;
}

/**
 * Get status of a single service.
 */
function getServiceStatus(serviceName: string, vvvPath: string): { running: boolean; status: string } {
  const result = vagrantSshSync(`systemctl is-active ${serviceName} 2>/dev/null`, vvvPath);
  const status = result.stdout.trim();
  return {
    running: status === "active",
    status: status || "unknown",
  };
}

/**
 * Get status of all services.
 */
function getAllServicesStatus(vvvPath: string): Record<string, { name: string; running: boolean; status: string }> {
  const statuses: Record<string, { name: string; running: boolean; status: string }> = {};

  for (const service of VALID_SERVICES) {
    const serviceName = getServiceName(service, vvvPath);
    const { running, status } = getServiceStatus(serviceName, vvvPath);
    statuses[service] = { name: serviceName, running, status };
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

    const nameWidth = 12;
    const serviceWidth = 20;

    console.log(`${"Service".padEnd(nameWidth)}${"Systemd Name".padEnd(serviceWidth)}Status`);
    console.log("─".repeat(nameWidth + serviceWidth + 10));

    for (const [service, info] of Object.entries(statuses)) {
      const statusText = info.running
        ? cli.format.success("running")
        : cli.format.error(info.status);
      console.log(`${service.padEnd(nameWidth)}${info.name.padEnd(serviceWidth)}${statusText}`);
    }

    console.log("");
  });

// Restart subcommand
const restartCommand = new Command("restart")
  .description("Restart a service")
  .argument("<service>", `Service to restart (${VALID_SERVICES.join(", ")})`)
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action(async (service, options) => {
    const vvvPath = options.path;

    if (!VALID_SERVICES.includes(service)) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Invalid service: ${service}` }, null, 2));
        process.exit(1);
      }
      exitWithError(`Invalid service: ${service}\nValid services: ${VALID_SERVICES.join(", ")}`);
    }

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();
    ensureVvvRunning(vvvPath);

    const serviceName = getServiceName(service, vvvPath);

    if (!options.json) {
      cli.info(`Restarting ${service} (${serviceName})...`);
    }

    const code = await vagrantSsh(`sudo systemctl restart ${serviceName}`, vvvPath);

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
  .argument("<service>", `Service to start (${VALID_SERVICES.join(", ")})`)
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action(async (service, options) => {
    const vvvPath = options.path;

    if (!VALID_SERVICES.includes(service)) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Invalid service: ${service}` }, null, 2));
        process.exit(1);
      }
      exitWithError(`Invalid service: ${service}\nValid services: ${VALID_SERVICES.join(", ")}`);
    }

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();
    ensureVvvRunning(vvvPath);

    const serviceName = getServiceName(service, vvvPath);

    if (!options.json) {
      cli.info(`Starting ${service} (${serviceName})...`);
    }

    const code = await vagrantSsh(`sudo systemctl start ${serviceName}`, vvvPath);

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
  .argument("<service>", `Service to stop (${VALID_SERVICES.join(", ")})`)
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action(async (service, options) => {
    const vvvPath = options.path;

    if (!VALID_SERVICES.includes(service)) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Invalid service: ${service}` }, null, 2));
        process.exit(1);
      }
      exitWithError(`Invalid service: ${service}\nValid services: ${VALID_SERVICES.join(", ")}`);
    }

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();
    ensureVvvRunning(vvvPath);

    const serviceName = getServiceName(service, vvvPath);

    if (!options.json) {
      cli.info(`Stopping ${service} (${serviceName})...`);
    }

    const code = await vagrantSsh(`sudo systemctl stop ${serviceName}`, vvvPath);

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
