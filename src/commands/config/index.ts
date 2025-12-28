import { Command } from "commander";
import { showCommand } from "./show.js";
import { validateCommand } from "./validate.js";
import { editCommand } from "./edit.js";
import { pathCommand } from "./path.js";

export const configCommand = new Command("config")
  .description("Manage VVV configuration")
  .addCommand(showCommand)
  .addCommand(validateCommand)
  .addCommand(editCommand)
  .addCommand(pathCommand);
