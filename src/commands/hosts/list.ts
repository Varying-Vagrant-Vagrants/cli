import { Command } from "commander";
import { DEFAULT_VVV_PATH, loadConfig } from "../../utils/config.js";
import { ensureVvvExists, cli } from "../../utils/cli.js";

interface HostEntry {
  host: string;
  site: string;
  type: "system" | "site";
  enabled: boolean;
}

/**
 * System hosts that VVV creates by default.
 */
const SYSTEM_HOSTS = ["vvv.test", "vvv.local"];

/**
 * Get all hosts from the VVV configuration.
 */
function getAllHosts(vvvPath: string): HostEntry[] {
  const config = loadConfig(vvvPath);
  const hosts: HostEntry[] = [];

  // Add core system hosts
  for (const host of SYSTEM_HOSTS) {
    hosts.push({
      host,
      site: "(system)",
      type: "system",
      enabled: true,
    });
  }

  // Add utility hosts (dashboard, etc.)
  if (config.general && typeof config.general === "object") {
    // Dashboard is typically at dashboard.test
    hosts.push({
      host: "dashboard.test",
      site: "(system)",
      type: "system",
      enabled: true,
    });
  }

  // Add site hosts
  if (config.sites) {
    for (const [siteName, siteConfig] of Object.entries(config.sites)) {
      const isEnabled = siteConfig.skip_provisioning !== true;
      const siteHosts = siteConfig.hosts || [];

      for (const host of siteHosts) {
        hosts.push({
          host,
          site: siteName,
          type: "site",
          enabled: isEnabled,
        });
      }
    }
  }

  // Sort: system hosts first, then alphabetically
  hosts.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "system" ? -1 : 1;
    }
    return a.host.localeCompare(b.host);
  });

  return hosts;
}

export const listCommand = new Command("list")
  .description("List all VVV hosts with site info and status")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    const hosts = getAllHosts(vvvPath);

    if (options.json) {
      console.log(JSON.stringify({ hosts }, null, 2));
      return;
    }

    if (hosts.length === 0) {
      cli.info("No hosts configured.");
      return;
    }

    // Calculate column widths
    const hostWidth = Math.max(20, ...hosts.map((h) => h.host.length)) + 2;
    const siteWidth = Math.max(15, ...hosts.map((h) => h.site.length)) + 2;

    // Print header
    console.log("");
    console.log(
      cli.format.bold("Host".padEnd(hostWidth)) +
        cli.format.bold("Site".padEnd(siteWidth)) +
        cli.format.bold("Status")
    );
    console.log("─".repeat(hostWidth + siteWidth + 10));

    // Print hosts
    // ANSI codes add 8 invisible characters (4 for dim, 4 for reset)
    const ansiOffset = 8;

    for (const entry of hosts) {
      const status = entry.enabled
        ? cli.format.success("enabled")
        : cli.format.dim("disabled");

      const siteDisplay =
        entry.type === "system"
          ? cli.format.dim(entry.site)
          : entry.site;

      console.log(
        entry.host.padEnd(hostWidth) +
          siteDisplay.padEnd(siteWidth + (entry.type === "system" ? ansiOffset : 0)) +
          status
      );
    }

    console.log("");
    console.log(cli.format.dim(`Total: ${hosts.length} hosts`));
  });
