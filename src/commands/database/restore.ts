import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, ensureVvvRunning, cli } from "../../utils/cli.js";
import { vagrantSsh } from "../../utils/vagrant.js";

export const restoreCommand = new Command("restore")
  .description("Restore all databases from backups")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVvvRunning(vvvPath);

    console.log("Restoring databases from backups...");

    const code = await vagrantSsh("db_restore", vvvPath);
    if (code === 0) {
      cli.success("\nDatabases restored from: database/sql/backups/");
    } else {
      cli.error("\nRestore failed.");
      process.exit(code);
    }
  });
