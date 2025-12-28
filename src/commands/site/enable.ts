import { Command } from "commander";
import { vvvExists, setSiteSkipProvisioning, DEFAULT_VVV_PATH } from "../../utils/config.js";

export const enableCommand = new Command("enable")
  .description("Enable provisioning for a site")
  .argument("<name>", "Name of the site to enable")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action((name, options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      process.exit(1);
    }

    try {
      setSiteSkipProvisioning(vvvPath, name, false);
      console.log(`Site '${name}' enabled.`);
      console.log("Run 'vvvlocal up --provision' to provision the site.");
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });
