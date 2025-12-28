import { Command } from "commander";
import { listCommand } from "./list.js";
import { infoCommand } from "./info.js";
import { addCommand } from "./add.js";
import { removeCommand } from "./remove.js";
import { enableCommand } from "./enable.js";
import { disableCommand } from "./disable.js";

export const siteCommand = new Command("site")
  .description("Manage VVV sites")
  .addCommand(addCommand)
  .addCommand(disableCommand)
  .addCommand(enableCommand)
  .addCommand(infoCommand)
  .addCommand(listCommand)
  .addCommand(removeCommand);
