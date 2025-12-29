import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, isVvvRunning, exitWithError, cli, startTimer } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRun } from "../utils/vagrant.js";

export const reprovisionCommand = new Command("reprovision")
  .alias("provision")
  .description("Reprovision VVV (starts VVV if not running)")
  .option("--path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    const getElapsed = startTimer();

    if (!isVvvRunning(vvvPath)) {
      cli.info("VVV is not running. Starting VVV first...");
      console.log("");
      const upCode = await vagrantRun(["up"], vvvPath);
      if (upCode !== 0) {
        exitWithError("Failed to start VVV");
      }
      console.log("");
    }

    cli.info("Running provisioning...");
    console.log("");
    const provisionCode = await vagrantRun(["provision"], vvvPath);
    const elapsed = getElapsed();

    console.log("");
    if (provisionCode === 0) {
      cli.success(`Provisioning completed (${elapsed})`);
    } else {
      cli.error(`Provisioning failed (${elapsed})`);
    }
    process.exit(provisionCode);
  });
