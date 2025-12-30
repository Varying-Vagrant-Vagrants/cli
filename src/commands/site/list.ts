import { Command } from "commander";
import React from "react";
import { render } from "ink";
import { loadConfig, getSiteLocalPath, DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, exitWithError, cli } from "../../utils/cli.js";
import { SiteTable } from "../../components/SiteTable.js";
import { shortenPath } from "../../utils/paths.js";

export const listCommand = new Command("list")
  .description("List all VVV sites")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-a, --all", "Include skipped sites")
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    try {
      const config = loadConfig(vvvPath);
      const sites = config.sites;

      if (!sites || Object.keys(sites).length === 0) {
        if (options.json) {
          console.log(JSON.stringify({ success: true, data: [] }, null, 2));
        } else {
          cli.info("No sites configured.");
        }
        return;
      }

      const siteList = Object.entries(sites)
        .filter(([_, site]) => options.all || site.skip_provisioning !== true)
        .map(([name, site]) => {
          const fullPath = getSiteLocalPath(vvvPath, name, site);
          return {
            name,
            description: site.description,
            hosts: site.hosts || [],
            php: site.php,
            skipped: site.skip_provisioning === true,
            path: shortenPath(fullPath, vvvPath),
          };
        });

      if (options.json) {
        // For JSON, ensure all fields are present (use null instead of undefined)
        const jsonList = siteList.map((site) => ({
          ...site,
          description: site.description ?? null,
          php: site.php ?? null,
        }));
        console.log(JSON.stringify({ success: true, data: jsonList }, null, 2));
        return;
      }

      render(React.createElement(SiteTable, { sites: siteList }));
    } catch (error) {
      exitWithError(`Error reading config: ${(error as Error).message}`);
    }
  });
