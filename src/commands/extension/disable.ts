import { Command } from "commander";
import { vvvExists, disableExtension, DEFAULT_VVV_PATH } from "../../utils/config.js";

export const disableCommand = new Command("disable")
  .description("Disable an extension provisioner")
  .argument("<extension/provisioner>", "Extension and provisioner (e.g., core/phpmyadmin)")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action((extProvisioner, options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      process.exit(1);
    }

    const parts = extProvisioner.split("/");
    if (parts.length !== 2) {
      console.error("Invalid format. Use: extension/provisioner (e.g., core/phpmyadmin)");
      process.exit(1);
    }

    const [extension, provisioner] = parts;

    try {
      disableExtension(vvvPath, extension, provisioner);
      console.log(`Extension '${extension}/${provisioner}' disabled.`);
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });
