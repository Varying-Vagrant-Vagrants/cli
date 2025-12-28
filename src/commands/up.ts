import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRunAndExit } from "../utils/vagrant.js";

export const upCommand = new Command("up")
  .alias("start")
  .description("Start VVV and provision if needed")
  .option("-p, --provision", "Force provisioning")
  .option("--path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    const args = ["up"];
    if (options.provision) {
      args.push("--provision");
    }

    console.log(`Starting VVV${options.provision ? " with provisioning" : ""}...`);

    vagrantRunAndExit(args, vvvPath);
  });
