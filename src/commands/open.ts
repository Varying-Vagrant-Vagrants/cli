import { Command } from "commander";
import { spawnSync } from "child_process";
import { platform } from "os";
import { DEFAULT_VVV_PATH, loadConfig } from "../utils/config.js";
import { ensureVvvExists, cli, exitWithError } from "../utils/cli.js";

// Built-in service URLs
const SERVICES: Record<string, string> = {
  dashboard: "http://vvv.test",
  phpmyadmin: "http://vvv.test/phpmyadmin",
  mailhog: "http://vvv.test:8025",
  mailcatcher: "http://vvv.test:1080",
};

/**
 * Open a URL in the default browser using platform-specific commands.
 */
function openUrl(url: string): boolean {
  const plat = platform();
  let cmd: string;
  let args: string[];

  if (plat === "darwin") {
    cmd = "open";
    args = [url];
  } else if (plat === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  } else {
    // Linux and others
    cmd = "xdg-open";
    args = [url];
  }

  const result = spawnSync(cmd, args, { stdio: "inherit" });
  return result.status === 0;
}

/**
 * Get the URL for a site from its first host.
 */
function getSiteUrl(vvvPath: string, siteName: string): string | null {
  try {
    const config = loadConfig(vvvPath);
    const site = config.sites?.[siteName];
    if (site?.hosts && site.hosts.length > 0) {
      // Use HTTPS since VVV typically has TLS enabled
      return `https://${site.hosts[0]}`;
    }
  } catch {
    // Config load error
  }
  return null;
}

/**
 * List available targets (sites and services).
 */
function getAvailableTargets(vvvPath: string): { sites: string[]; services: string[] } {
  const services = Object.keys(SERVICES);
  let sites: string[] = [];

  try {
    const config = loadConfig(vvvPath);
    if (config.sites) {
      sites = Object.keys(config.sites);
    }
  } catch {
    // Config load error
  }

  return { sites, services };
}

export const openCommand = new Command("open")
  .description("Open a site or service in the browser")
  .argument("[target]", "Site name or service (dashboard, phpmyadmin, mailhog)")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .option("-l, --list", "List available targets")
  .action((target, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    // List mode
    if (options.list || !target) {
      const { sites, services } = getAvailableTargets(vvvPath);

      if (options.json) {
        console.log(JSON.stringify({ sites, services }, null, 2));
        return;
      }

      if (!target) {
        console.log("");
        cli.bold("Available targets:");
        console.log("");
        cli.info("Services:");
        for (const service of services) {
          console.log(`  ${service.padEnd(15)} ${SERVICES[service]}`);
        }
        console.log("");
        cli.info("Sites:");
        for (const site of sites) {
          const url = getSiteUrl(vvvPath, site);
          console.log(`  ${site.padEnd(15)} ${url || "(no hosts)"}`);
        }
        console.log("");
        console.log("Usage: vvvlocal open <target>");
        console.log("");
        return;
      }
    }

    // At this point, target is guaranteed to be defined (we returned above if !target)
    const targetName = target as string;

    // Check if target is a service
    const serviceKey = targetName.toLowerCase();
    const serviceUrl = SERVICES[serviceKey];
    if (serviceUrl) {
      if (options.json) {
        console.log(JSON.stringify({ target: targetName, url: serviceUrl, type: "service", opened: true }, null, 2));
      } else {
        cli.info(`Opening ${targetName}...`);
      }

      if (!openUrl(serviceUrl)) {
        exitWithError(`Failed to open browser for ${serviceUrl}`);
      }
      return;
    }

    // Try as a site name
    const siteUrl = getSiteUrl(vvvPath, targetName);
    if (siteUrl) {
      if (options.json) {
        console.log(JSON.stringify({ target: targetName, url: siteUrl, type: "site", opened: true }, null, 2));
      } else {
        cli.info(`Opening ${targetName}...`);
      }

      if (!openUrl(siteUrl)) {
        exitWithError(`Failed to open browser for ${siteUrl}`);
      }
      return;
    }

    // Not found
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: `Unknown target: ${targetName}` }, null, 2));
      process.exit(1);
    }

    const { sites, services } = getAvailableTargets(vvvPath);
    cli.error(`Unknown target: ${targetName}`);
    console.log("");
    console.log("Available services: " + services.join(", "));
    console.log("Available sites: " + sites.join(", "));
    process.exit(1);
  });
