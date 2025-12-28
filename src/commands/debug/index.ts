import { Command } from "commander";
import { listCommand } from "./list.js";
import { switchCommand } from "./switch.js";

export const debugCommand = new Command("debug")
  .description("Manage PHP debug extensions")
  .addCommand(listCommand)
  .addCommand(switchCommand);
