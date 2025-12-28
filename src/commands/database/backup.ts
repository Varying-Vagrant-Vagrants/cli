import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, ensureVvvRunning, cli } from "../../utils/cli.js";
import { vagrantSsh } from "../../utils/vagrant.js";

export const backupCommand = new Command("backup")
  .description("Backup all databases")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVvvRunning(vvvPath);

    console.log("Backing up databases...");

    const code = await vagrantSsh("db_backup", vvvPath);
    if (code === 0) {
      cli.success("\nBackups saved to: database/sql/backups/");
    } else {
      cli.error("\nBackup failed.");
      process.exit(code);
    }
  });
