import { Command } from "commander";
import { infoCommand } from "./info.js";
import { listCommand } from "./list.js";
import { backupCommand } from "./backup.js";
import { restoreCommand } from "./restore.js";
import { sequelCommand } from "./sequel.js";
import { tableplusCommand } from "./tableplus.js";

export const databaseCommand = new Command("database")
  .alias("db")
  .description("Database management commands")
  .addCommand(backupCommand)
  .addCommand(infoCommand)
  .addCommand(listCommand)
  .addCommand(restoreCommand)
  .addCommand(sequelCommand)
  .addCommand(tableplusCommand);
