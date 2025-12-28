import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, isVvvRunning, exitWithError } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRun } from "../utils/vagrant.js";

export const reprovisionCommand = new Command("reprovision")
  .alias("provision")
  .description("Reprovision VVV (starts VVV if not running)")
  .option("--path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    if (!isVvvRunning(vvvPath)) {
      console.log("VVV is not running. Starting VVV first...");
      const upCode = await vagrantRun(["up"], vvvPath);
      if (upCode !== 0) {
        exitWithError("Failed to start VVV");
      }
      console.log("");
    } else {
      console.log("VVV is running. Starting provisioning...");
    }

    console.log("Running provisioning...");
    const provisionCode = await vagrantRun(["provision"], vvvPath);
    process.exit(provisionCode);
  });
