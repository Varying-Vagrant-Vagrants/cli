import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, exitWithError } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRun } from "../utils/vagrant.js";

export const restartCommand = new Command("restart")
  .alias("reload")
  .description("Restart VVV (halt then up)")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    console.log("Stopping VVV...");
    const haltCode = await vagrantRun(["halt"], vvvPath);
    if (haltCode !== 0) {
      exitWithError("Failed to stop VVV");
    }

    console.log("\nStarting VVV...");
    const upCode = await vagrantRun(["up"], vvvPath);
    process.exit(upCode);
  });
