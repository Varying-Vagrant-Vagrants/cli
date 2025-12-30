import { Command } from "commander";
import { vvvExists, setSiteSkipProvisioning, DEFAULT_VVV_PATH } from "../../utils/config.js";
import { exitWithError, cli } from "../../utils/cli.js";

export const disableCommand = new Command("disable")
  .description("Disable provisioning for a site")
  .argument("<name>", "Name of the site to disable")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action((name, options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      exitWithError(`VVV not found at ${vvvPath}`);
    }

    try {
      setSiteSkipProvisioning(vvvPath, name, true);
      cli.success(`Site '${name}' disabled.`);
    } catch (error) {
      exitWithError((error as Error).message);
    }
  });
