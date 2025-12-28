import { Command } from "commander";
import React from "react";
import { render } from "ink";
import { loadConfig, vvvExists, DEFAULT_VVV_PATH } from "../../utils/config.js";
import { SiteInfo } from "../../components/SiteInfo.js";

export const infoCommand = new Command("info")
  .description("Show detailed information about a site")
  .argument("<name>", "Name of the site")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((name, options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      process.exit(1);
    }

    try {
      const config = loadConfig(vvvPath);
      const sites = config.sites;

      if (!sites || !sites[name]) {
        console.error(`Site '${name}' not found`);
        process.exit(1);
      }

      const site = sites[name];

      if (options.json) {
        console.log(JSON.stringify({ name, ...site }, null, 2));
        return;
      }

      render(React.createElement(SiteInfo, { name, site }));
    } catch (error) {
      console.error(`Error reading config: ${(error as Error).message}`);
      process.exit(1);
    }
  });
