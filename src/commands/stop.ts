import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRunAndExit } from "../utils/vagrant.js";

export const stopCommand = new Command("stop")
  .alias("halt")
  .description("Stop VVV")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    console.log("Stopping VVV...");

    vagrantRunAndExit(["halt"], vvvPath);
  });
