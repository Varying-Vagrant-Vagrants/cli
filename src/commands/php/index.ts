import { Command } from "commander";
import { listCommand } from "./list.js";
import { debugCommand } from "../debug/index.js";

export const phpCommand = new Command("php")
  .description("Manage PHP versions and extensions")
  .addCommand(listCommand)
  .addCommand(debugCommand);
