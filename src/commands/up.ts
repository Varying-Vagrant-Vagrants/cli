import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, cli, startTimer } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRun } from "../utils/vagrant.js";

export const upCommand = new Command("up")
  .alias("start")
  .description("Start VVV and provision if needed")
  .option("-p, --provision", "Force provisioning")
  .option("--path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    const args = ["up"];
    if (options.provision) {
      args.push("--provision");
    }

    cli.info(`Starting VVV${options.provision ? " with provisioning" : ""}...`);
    console.log("");

    const getElapsed = startTimer();
    const code = await vagrantRun(args, vvvPath);
    const elapsed = getElapsed();

    console.log("");
    if (code === 0) {
      cli.success(`VVV started successfully (${elapsed})`);
    } else {
      cli.error(`Failed to start VVV (${elapsed})`);
    }
    process.exit(code);
  });
