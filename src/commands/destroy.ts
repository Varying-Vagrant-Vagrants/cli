import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, confirm, cli } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRunAndExit } from "../utils/vagrant.js";

export const destroyCommand = new Command("destroy")
  .description("Destroy the VVV virtual machine")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-f, --force", "Skip confirmation prompt")
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    if (!options.force) {
      cli.error("Warning: This will destroy the VVV virtual machine.");
      console.log("All data inside the VM will be lost (databases, logs, etc.).");
      console.log("Your site files in www/ will NOT be deleted.");
      console.log("");

      const confirmed = await confirm("Are you sure you want to destroy the VM?");

      if (!confirmed) {
        console.log("Destroy cancelled.");
        process.exit(0);
      }
    }

    console.log("\nDestroying VVV virtual machine...");

    vagrantRunAndExit(["destroy", "--force"], vvvPath);
  });
