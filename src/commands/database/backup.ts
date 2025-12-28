import { Command } from "commander";
import { spawn, spawnSync } from "child_process";
import { vvvExists, DEFAULT_VVV_PATH } from "../../utils/config.js";

export const backupCommand = new Command("backup")
  .description("Backup all databases")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action((options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      process.exit(1);
    }

    // Check if VVV is running
    const statusResult = spawnSync("vagrant", ["status", "--machine-readable"], {
      cwd: vvvPath,
      encoding: "utf-8",
    });

    const isRunning = statusResult.stdout?.includes(",state,running");

    if (!isRunning) {
      console.error("VVV is not running. Start it with 'vvvlocal up' first.");
      process.exit(1);
    }

    console.log("Backing up databases...");

    // Run db_backup command inside VVV
    const child = spawn("vagrant", ["ssh", "-c", "db_backup"], {
      cwd: vvvPath,
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log("\nBackups saved to: database/sql/backups/");
      } else {
        console.error("\nBackup failed.");
        process.exit(code || 1);
      }
    });
  });
