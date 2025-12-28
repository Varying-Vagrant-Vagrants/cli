import { Command } from "commander";
import React from "react";
import { render } from "ink";
import { loadConfig, vvvExists, getSiteLocalPath, DEFAULT_VVV_PATH } from "../../utils/config.js";
import { SiteTable } from "../../components/SiteTable.js";

export const listCommand = new Command("list")
  .description("List all VVV sites")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-a, --all", "Include skipped sites")
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      process.exit(1);
    }

    try {
      const config = loadConfig(vvvPath);
      const sites = config.sites;

      if (!sites || Object.keys(sites).length === 0) {
        if (options.json) {
          console.log(JSON.stringify([], null, 2));
        } else {
          console.log("No sites configured.");
        }
        return;
      }

      const siteList = Object.entries(sites)
        .filter(([_, site]) => options.all || site.skip_provisioning !== true)
        .map(([name, site]) => ({
          name,
          hosts: site.hosts || [],
          description: site.description,
          php: site.php,
          skipped: site.skip_provisioning === true,
          path: getSiteLocalPath(vvvPath, name, site),
        }));

      if (options.json) {
        console.log(JSON.stringify(siteList, null, 2));
        return;
      }

      render(React.createElement(SiteTable, { sites: siteList }));
    } catch (error) {
      console.error(`Error reading config: ${(error as Error).message}`);
      process.exit(1);
    }
  });
