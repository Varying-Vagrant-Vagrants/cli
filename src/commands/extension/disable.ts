import { Command } from "commander";
import { vvvExists, disableExtension, DEFAULT_VVV_PATH } from "../../utils/config.js";
import { exitWithError, cli } from "../../utils/cli.js";

export const disableCommand = new Command("disable")
  .description("Disable an extension provisioner")
  .argument("<extension/provisioner>", "Extension and provisioner (e.g., core/phpmyadmin)")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action((extProvisioner, options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      exitWithError(`VVV not found at ${vvvPath}`);
    }

    const parts = extProvisioner.split("/");
    if (parts.length !== 2) {
      exitWithError(
        "Invalid format.",
        "Use: extension/provisioner (e.g., core/phpmyadmin)"
      );
    }

    const [extension, provisioner] = parts;

    try {
      disableExtension(vvvPath, extension, provisioner);
      cli.success(`Extension '${extension}/${provisioner}' disabled.`);
    } catch (error) {
      exitWithError((error as Error).message);
    }
  });
