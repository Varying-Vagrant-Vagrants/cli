import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRunAndExit } from "../utils/vagrant.js";

export const statusCommand = new Command("status")
  .description("Show VVV status")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    vagrantRunAndExit(["status"], vvvPath);
  });
