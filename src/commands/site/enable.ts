import { Command } from "commander";
import { vvvExists, setSiteSkipProvisioning, DEFAULT_VVV_PATH } from "../../utils/config.js";
import { exitWithError, cli } from "../../utils/cli.js";

export const enableCommand = new Command("enable")
  .description("Enable provisioning for a site")
  .argument("<name>", "Name of the site to enable")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action((name, options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      exitWithError(`VVV not found at ${vvvPath}`);
    }

    try {
      setSiteSkipProvisioning(vvvPath, name, false);
      cli.success(`Site '${name}' enabled.`);
      cli.info("Run 'vvvlocal up --provision' to provision the site.");
    } catch (error) {
      exitWithError((error as Error).message);
    }
  });
