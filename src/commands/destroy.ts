import { Command } from "commander";
import { rmSync } from "fs";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, confirm, cli, startTimer } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRun } from "../utils/vagrant.js";

export const destroyCommand = new Command("destroy")
  .description("Destroy the VVV virtual machine and optionally remove files")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-f, --force", "Skip confirmation prompts")
  .option("--dry-run", "Show what would be done without making changes")
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    // Dry-run mode
    if (options.dryRun) {
      cli.info("Dry run - no changes will be made:");
      console.log("");
      console.log(`  Would destroy VM at: ${vvvPath}`);
      console.log("  Would run: vagrant destroy --force");
      console.log("");
      console.log("  After VM destruction, you would be asked to remove files.");
      return;
    }

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

    cli.info("Destroying VVV virtual machine...");
    console.log("");

    const getElapsed = startTimer();
    const code = await vagrantRun(["destroy", "--force"], vvvPath);
    const elapsed = getElapsed();

    if (code !== 0) {
      console.log("");
      cli.error(`Failed to destroy VM (${elapsed})`);
      process.exit(code);
    }

    console.log("");
    cli.success(`VM destroyed successfully (${elapsed})`);
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
