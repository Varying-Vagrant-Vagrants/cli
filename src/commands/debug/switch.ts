import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, ensureVvvRunning, cli, exitWithError } from "../../utils/cli.js";
import { ensureVagrantInstalled, vagrantSsh } from "../../utils/vagrant.js";

const VALID_EXTENSIONS = ["xdebug", "pcov", "tideways", "none"];

export const switchCommand = new Command("switch")
  .description("Switch PHP debug extension")
  .argument("<extension>", "Debug extension to activate (xdebug, pcov, tideways, none)")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action(async (extension, options) => {
    const vvvPath = options.path;
    const ext = extension.toLowerCase();

    // Validate extension name
    if (!VALID_EXTENSIONS.includes(ext)) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Invalid extension '${extension}'`, validOptions: VALID_EXTENSIONS }, null, 2));
        process.exit(1);
      }
      exitWithError(
        `Invalid extension '${extension}'.\nValid options: ${VALID_EXTENSIONS.join(", ")}`
      );
    }

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();
    ensureVvvRunning(vvvPath);

    if (!options.json) {
      cli.info(`Switching PHP debug extension to ${ext}...`);
    }

    const code = await vagrantSsh(`switch_php_debugmod ${ext}`, vvvPath);

    if (options.json) {
      console.log(JSON.stringify({ success: code === 0, extension: ext }, null, 2));
      process.exit(code);
    }

    if (code === 0) {
      cli.success(`PHP debug extension switched to ${ext}.`);
    } else {
      cli.error(`Failed to switch debug extension.`);
      process.exit(code);
    }
  });
