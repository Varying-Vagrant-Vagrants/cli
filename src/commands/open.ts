import { Command } from "commander";
import { DEFAULT_VVV_PATH, loadConfig, getSiteLocalPath } from "../utils/config.js";
import { ensureVvvExists, cli, exitWithError } from "../utils/cli.js";
import { launchApplication, type LaunchTarget } from "../utils/launcher.js";

// Built-in service URLs
const SERVICES: Record<string, string> = {
  dashboard: "http://vvv.test",
  phpmyadmin: "http://vvv.test/phpmyadmin",
  mailhog: "http://vvv.test:8025",
  mailcatcher: "http://vvv.test:1080",
};


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
  .description("Open a site or service in browser, file manager, or editor")
  .argument("[target]", "Site name or service (dashboard, phpmyadmin, mailhog)")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .option("-l, --list", "List available targets")
  .option("--folder", "Open in file manager (Finder/Explorer)")
  .option("--vscode", "Open in VS Code editor")
  .option("--code", "Alias for --vscode")
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

    // Determine launch target
    const launchTarget: LaunchTarget = options.folder
      ? "folder"
      : (options.vscode || options.code)
        ? "vscode"
        : "browser";

    // Check if target is a service
    const serviceKey = targetName.toLowerCase();
    const serviceUrl = SERVICES[serviceKey];
    if (serviceUrl) {
      if (launchTarget !== "browser") {
        exitWithError("Services can only be opened in a browser");
      }

      if (options.json) {
        console.log(JSON.stringify({ target: targetName, url: serviceUrl, type: "service", opened: true }, null, 2));
      } else {
        cli.info(`Opening ${targetName}...`);
      }

      if (!launchApplication({ target: "browser", location: serviceUrl })) {
        exitWithError(`Failed to open browser for ${serviceUrl}`);
      }
      return;
    }

    // Try as a site name
    if (launchTarget === "browser") {
      const siteUrl = getSiteUrl(vvvPath, targetName);
      if (siteUrl) {
        if (options.json) {
          console.log(JSON.stringify({ target: targetName, url: siteUrl, type: "site", opened: true }, null, 2));
        } else {
          cli.info(`Opening ${targetName}...`);
        }

        if (!launchApplication({ target: "browser", location: siteUrl })) {
          exitWithError(`Failed to open browser for ${siteUrl}`);
        }
        return;
      }
    } else {
      // Open site directory in file manager or VS Code
      const config = loadConfig(vvvPath);
      const site = config.sites?.[targetName];
      if (!site) {
        exitWithError(`Unknown target: ${targetName}`);
      }
      const sitePath = getSiteLocalPath(vvvPath, targetName, site);

      if (options.json) {
        console.log(JSON.stringify({ target: targetName, path: sitePath, type: "site", opened: true, launchTarget }, null, 2));
      } else {
        const targetDesc = launchTarget === "folder" ? "file manager" : "VS Code";
        cli.info(`Opening ${targetName} in ${targetDesc}...`);
      }

      if (!launchApplication({ target: launchTarget, location: sitePath })) {
        const targetDesc = launchTarget === "folder" ? "file manager" : "VS Code";
        exitWithError(`Failed to open ${targetDesc} for ${sitePath}`);
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
