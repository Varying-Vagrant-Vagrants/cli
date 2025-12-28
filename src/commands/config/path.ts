import { Command } from "commander";
import { DEFAULT_VVV_PATH, getConfigPath } from "../../utils/config.js";
import { ensureVvvExists } from "../../utils/cli.js";

export const pathCommand = new Command("path")
  .description("Print the config file path")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    const configPath = getConfigPath(vvvPath);

    if (options.json) {
      console.log(JSON.stringify({ path: configPath }, null, 2));
      return;
    }

    console.log(configPath);
  });
