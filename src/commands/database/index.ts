import { Command } from "commander";
import { backupCommand } from "./backup.js";
import { dropCommand } from "./drop.js";
import { importCommand } from "./import.js";
import { infoCommand } from "./info.js";
import { listCommand } from "./list.js";
import { queryCommand } from "./query.js";
import { restoreCommand } from "./restore.js";
import { sequelCommand } from "./sequel.js";
import { tableplusCommand } from "./tableplus.js";

export const databaseCommand = new Command("database")
  .alias("db")
  .description("Database management commands")
  .addCommand(backupCommand)
  .addCommand(dropCommand)
  .addCommand(importCommand)
  .addCommand(infoCommand)
  .addCommand(listCommand)
  .addCommand(queryCommand)
  .addCommand(restoreCommand)
  .addCommand(sequelCommand)
  .addCommand(tableplusCommand);
