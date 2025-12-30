import { Command } from "commander";
import { listCommand } from "./list.js";
import { sudoersCommand } from "./sudoers.js";

export const hostsCommand = new Command("hosts")
  .description("Manage VVV hosts and hosts file access")
  .addCommand(listCommand)
  .addCommand(sudoersCommand);
