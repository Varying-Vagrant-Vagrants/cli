import { Command } from "commander";
import { listCommand } from "./list.js";
import { infoCommand } from "./info.js";
import { addCommand } from "./add.js";
import { removeCommand } from "./remove.js";
import { enableCommand } from "./enable.js";
import { disableCommand } from "./disable.js";
import { openCommand } from "./open.js";
import { updateCommand } from "./update.js";
import { wpCommand } from "./wp.js";
import { cloneCommand } from "./clone.js";

export const siteCommand = new Command("site")
  .description("Manage VVV sites")
  .addCommand(addCommand)
  .addCommand(cloneCommand)
  .addCommand(disableCommand)
  .addCommand(enableCommand)
  .addCommand(infoCommand)
  .addCommand(listCommand)
  .addCommand(openCommand)
  .addCommand(removeCommand)
  .addCommand(updateCommand)
  .addCommand(wpCommand);
