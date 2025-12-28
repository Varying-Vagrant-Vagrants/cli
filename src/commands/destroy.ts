import { Command } from "commander";
import { rmSync } from "fs";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, confirm, cli } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRun } from "../utils/vagrant.js";

export const destroyCommand = new Command("destroy")
  .description("Destroy the VVV virtual machine and optionally remove files")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-f, --force", "Skip confirmation prompts")
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    if (!options.force) {
      cli.error("Warning: This will destroy the VVV virtual machine.");
      console.log("All data inside the VM will be lost (databases, logs, etc.).");
      console.log("");

      const confirmed = await confirm("Are you sure you want to destroy the VM?");

      if (!confirmed) {
        console.log("Destroy cancelled.");
        process.exit(0);
      }
    }

    console.log("\nDestroying VVV virtual machine...");

    const code = await vagrantRun(["destroy", "--force"], vvvPath);

    if (code !== 0) {
      cli.error("Failed to destroy VM.");
      process.exit(code);
    }

    cli.success("VM destroyed successfully.");
    console.log("");

    // Ask about removing files
    let removeFiles = options.force;
    if (!options.force) {
      removeFiles = await confirm("Do you also want to remove the VVV files?");
    }

    if (removeFiles) {
      console.log(`\nRemoving ${vvvPath}...`);
      try {
        rmSync(vvvPath, { recursive: true, force: true });
        cli.success("VVV files removed.");
      } catch (error) {
        cli.error(`Failed to remove files: ${(error as Error).message}`);
        process.exit(1);
      }
    } else {
      console.log(`\nVVV files remain at: ${vvvPath}`);
    }
  });
