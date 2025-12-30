import { Command } from "commander";
import React from "react";
import { render } from "ink";
import { DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, ensureVvvRunning, exitWithError } from "../../utils/cli.js";
import { getUserDatabases } from "../../utils/vagrant.js";
import { DatabaseList } from "../../components/DatabaseList.js";

export const listCommand = new Command("list")
  .alias("ls")
  .description("List databases in VVV")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVvvRunning(vvvPath);

    try {
      const databases = getUserDatabases(vvvPath);

      if (options.json) {
        console.log(JSON.stringify({ success: true, data: databases }, null, 2));
        return;
      }

      render(React.createElement(DatabaseList, { databases }));
    } catch (error) {
      exitWithError(`Failed to list databases: ${(error as Error).message}`);
    }
  });
