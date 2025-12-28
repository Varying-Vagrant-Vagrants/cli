import { Command } from "commander";
import { DEFAULT_VVV_PATH, loadConfig, getSiteVmPath } from "../utils/config.js";
import { ensureVvvExists, ensureVvvRunning, ensureSiteExists, cli, exitWithError } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantSshAndExit, vagrantSshSync } from "../utils/vagrant.js";

/**
 * Find the WordPress root directory within a site.
 * Checks common locations: public_html, htdocs, or site root.
 */
function findWordPressRoot(vvvPath: string, vmPath: string): string {
  const locations = ["public_html", "htdocs", ""];

  for (const loc of locations) {
    const testPath = loc ? `${vmPath}/${loc}` : vmPath;
    const result = vagrantSshSync(`test -f ${testPath}/wp-config.php && echo "found"`, vvvPath);
    if (result.stdout.trim() === "found") {
      return testPath;
    }
  }

  // Default to public_html if not found
  return `${vmPath}/public_html`;
}

/**
 * Run WP-CLI command for a site.
 */
function runWpCommand(vvvPath: string, siteName: string, wpArgs: string[]): void {
  ensureVvvExists(vvvPath);
  ensureVagrantInstalled();
  ensureVvvRunning(vvvPath);
  ensureSiteExists(vvvPath, siteName);

  const config = loadConfig(vvvPath);
  const site = config.sites?.[siteName];

  if (!site) {
    exitWithError(`Site '${siteName}' not found in config.`);
  }

  const vmPath = getSiteVmPath(siteName, site);
  const wpRoot = findWordPressRoot(vvvPath, vmPath);

  // Build the WP-CLI command
  // Escape arguments properly for shell
  const escapedArgs = wpArgs.map(arg => {
    // If arg contains spaces or special chars, quote it
    if (/[\s"'$`\\]/.test(arg)) {
      return `'${arg.replace(/'/g, "'\\''")}'`;
    }
    return arg;
  }).join(" ");

  const wpCommand = `cd ${wpRoot} && wp ${escapedArgs}`;

  vagrantSshAndExit(wpCommand, vvvPath);
}

export const wpCommand = new Command("wp")
  .description("Run WP-CLI commands for a site")
  .argument("<site>", "Name of the site")
  .argument("[wp-args...]", "WP-CLI command and arguments")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .action((siteName, wpArgs, options) => {
    const vvvPath = options.path;

    if (!wpArgs || wpArgs.length === 0) {
      // No WP-CLI command provided, show help
      cli.error("No WP-CLI command provided.");
      console.log("");
      console.log("Usage: vvvlocal wp <site> <wp-command>");
      console.log("");
      console.log("Examples:");
      console.log("  vvvlocal wp wordpress-one plugin list");
      console.log("  vvvlocal wp wordpress-one user list --format=json");
      console.log("  vvvlocal wp wordpress-one db export backup.sql");
      process.exit(1);
    }

    runWpCommand(vvvPath, siteName, wpArgs);
  });

// Export the runWpCommand function for use by site wp subcommand
export { runWpCommand };
