import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, exitWithError, cli, startTimer } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRun } from "../utils/vagrant.js";
import { getCurrentProvider } from "../utils/providers.js";
import { displayTip } from "../utils/tips.js";

export const restartCommand = new Command("restart")
  .alias("reload")
  .description("Restart VVV (halt then up)")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    const provider = getCurrentProvider(vvvPath);
    const getElapsed = startTimer();

    cli.info("Restarting VVV (this usually takes 1-2 minutes)...");
    console.log("");

    const haltCode = await vagrantRun(["halt"], vvvPath);
    if (haltCode !== 0) {
      exitWithError("Failed to stop VVV");
    }

    console.log("");
    const upArgs = ["up"];
    if (provider) {
      upArgs.push(`--provider=${provider}`);
    }
    const upCode = await vagrantRun(upArgs, vvvPath);
    const elapsed = getElapsed();

    console.log("");
    if (upCode === 0) {
      cli.success(`VVV restarted successfully (${elapsed})`);
      displayTip("restart", "success", vvvPath);
    } else {
      cli.error(`Failed to restart VVV (${elapsed})`);
    }

    process.exit(upCode);
  });
