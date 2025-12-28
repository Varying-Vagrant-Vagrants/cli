import { Command } from "commander";
import { listCommand } from "./list.js";
import { addCommand } from "./add.js";
import { removeCommand } from "./remove.js";
import { enableCommand } from "./enable.js";
import { disableCommand } from "./disable.js";

export const extensionCommand = new Command("extension")
  .description("Manage VVV extensions")
  .addCommand(addCommand)
  .addCommand(disableCommand)
  .addCommand(enableCommand)
  .addCommand(listCommand)
  .addCommand(removeCommand);
