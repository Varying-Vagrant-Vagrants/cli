import { Command } from "commander";
import { infoCommand } from "./info.js";
import { upgradeCommand } from "./upgrade.js";

export const boxCommand = new Command("box")
  .alias("vm")
  .description("Manage Vagrant box")
  .addCommand(infoCommand)
  .addCommand(upgradeCommand);
