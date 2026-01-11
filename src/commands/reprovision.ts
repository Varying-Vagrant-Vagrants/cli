import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, isVvvRunning, exitWithError, cli, startTimer } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRun } from "../utils/vagrant.js";
import { getCurrentProvider } from "../utils/providers.js";
import { displayTip } from "../utils/tips.js";

export const reprovisionCommand = new Command("reprovision")
  .alias("provision")
  .description("Reprovision VVV (starts VVV if not running)")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    const provider = getCurrentProvider(vvvPath);
    const getElapsed = startTimer();

    if (!isVvvRunning(vvvPath)) {
      cli.info("VVV is not running. Starting it first (this may take a few minutes)...");
      console.log("");
      const upArgs = ["up"];
      if (provider) {
        upArgs.push(`--provider=${provider}`);
      }
      const upCode = await vagrantRun(upArgs, vvvPath);
      if (upCode !== 0) {
        exitWithError("Failed to start VVV");
      }
      console.log("");
    }

    cli.info("Running provisioners to update your environment (this usually takes 2-4 minutes)...");
    console.log("");
    const provisionCode = await vagrantRun(["provision"], vvvPath);
    const elapsed = getElapsed();

    console.log("");
    if (provisionCode === 0) {
      cli.success(`Provisioning complete (${elapsed})`);
      console.log("Your sites have been updated and are ready to use.");
      displayTip("reprovision", "success", vvvPath);
    } else {
      cli.error(`Provisioning failed (${elapsed})`);
    }
    process.exit(provisionCode);
  });
