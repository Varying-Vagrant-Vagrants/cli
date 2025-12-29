import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, ensureVvvRunning } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantSshAndExit } from "../utils/vagrant.js";

export const execCommand = new Command("exec")
  .description("Execute a command inside the VVV virtual machine")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .argument("<command...>", "Command to execute inside the VM")
  .allowUnknownOption(true)
  .action((commandParts, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();
    ensureVvvRunning(vvvPath);

    // Join command parts back together
    const command = commandParts.join(" ");

    vagrantSshAndExit(command, vvvPath);
  });
