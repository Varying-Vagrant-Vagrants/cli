import { Command } from "commander";
import { spawnSync } from "child_process";
import { platform } from "os";
import { DEFAULT_VVV_PATH, loadConfig } from "../../utils/config.js";
import { ensureVvvExists, ensureSiteExists, cli, exitWithError } from "../../utils/cli.js";

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

export const openCommand = new Command("open")
  .description("Open a site in the browser")
  .argument("<site>", "Name of the site to open")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((siteName, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureSiteExists(vvvPath, siteName);

    // Get site configuration
    const config = loadConfig(vvvPath);
    const site = config.sites?.[siteName];

    if (!site?.hosts || site.hosts.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Site '${siteName}' has no hosts configured` }, null, 2));
        process.exit(1);
      }
      exitWithError(`Site '${siteName}' has no hosts configured.`);
    }

    // Use HTTPS for the first host
    const url = `https://${site.hosts[0]}`;

    if (options.json) {
      console.log(JSON.stringify({ site: siteName, url, opened: true }, null, 2));
    } else {
      cli.info(`Opening ${siteName} (${url})...`);
    }

    if (!openUrl(url)) {
      exitWithError(`Failed to open browser for ${url}`);
    }
  });
