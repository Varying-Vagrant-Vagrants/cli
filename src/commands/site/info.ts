import { Command } from "commander";
import React from "react";
import { render } from "ink";
import { loadConfig, getSiteLocalPath, getSiteVmPath, DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, ensureSiteExists, exitWithError } from "../../utils/cli.js";
import { SiteInfo } from "../../components/SiteInfo.js";

export const infoCommand = new Command("info")
  .description("Show detailed information about a site")
  .argument("<name>", "Name of the site")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((name, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureSiteExists(vvvPath, name);

    try {
      const config = loadConfig(vvvPath);
      const sites = config.sites;

      const site = sites[name];
      const localPath = getSiteLocalPath(vvvPath, name, site);
      const vmPath = getSiteVmPath(name, site);

      if (options.json) {
        console.log(JSON.stringify({ name, ...site, localPath, vmPath }, null, 2));
        return;
      }

      render(React.createElement(SiteInfo, { name, site, localPath, vmPath }));
    } catch (error) {
      exitWithError(`Error reading config: ${(error as Error).message}`);
    }
  });
