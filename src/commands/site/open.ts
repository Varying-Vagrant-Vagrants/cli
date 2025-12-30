import { Command } from "commander";
import { DEFAULT_VVV_PATH, loadConfig, getSiteLocalPath } from "../../utils/config.js";
import { ensureVvvExists, ensureSiteExists, cli, exitWithError } from "../../utils/cli.js";
import { launchApplication, type LaunchTarget } from "../../utils/launcher.js";

export const openCommand = new Command("open")
  .description("Open a site in browser, file manager, or editor")
  .argument("<site>", "Name of the site to open")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .option("--folder", "Open in file manager (Finder/Explorer)")
  .option("--vscode", "Open in VS Code editor")
  .option("--code", "Alias for --vscode")
  .action((siteName, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureSiteExists(vvvPath, siteName);

    // Determine launch target
    const launchTarget: LaunchTarget = options.folder
      ? "folder"
      : (options.vscode || options.code)
        ? "vscode"
        : "browser";

    if (launchTarget === "browser") {
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

      if (!launchApplication({ target: "browser", location: url })) {
        exitWithError(`Failed to open browser for ${url}`);
      }
    } else {
      // Open site directory in file manager or VS Code
      const config = loadConfig(vvvPath);
      const site = config.sites?.[siteName];
      if (!site) {
        exitWithError(`Site '${siteName}' not found`);
      }
      const sitePath = getSiteLocalPath(vvvPath, siteName, site);

      if (options.json) {
        console.log(JSON.stringify({ site: siteName, path: sitePath, opened: true, launchTarget }, null, 2));
      } else {
        const targetDesc = launchTarget === "folder" ? "file manager" : "VS Code";
        cli.info(`Opening ${siteName} in ${targetDesc}...`);
      }

      if (!launchApplication({ target: launchTarget, location: sitePath })) {
        const targetDesc = launchTarget === "folder" ? "file manager" : "VS Code";
        exitWithError(`Failed to open ${targetDesc} for ${sitePath}`);
      }
    }
  });
