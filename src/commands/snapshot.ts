import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, cli, exitWithError, confirm } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRun, vagrantRunSync } from "../utils/vagrant.js";

/**
 * Parse vagrant snapshot list output into array of snapshot names.
 */
function parseSnapshotList(output: string): string[] {
  const lines = output.trim().split("\n");
  const snapshots: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and headers
    if (!trimmed || trimmed.startsWith("==>")) {
      continue;
    }
    snapshots.push(trimmed);
  }

  return snapshots;
}

// List subcommand
const listCommand = new Command("list")
  .alias("ls")
  .description("List all VM snapshots")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    const result = vagrantRunSync(["snapshot", "list"], vvvPath);

    if (result.status !== 0) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: result.stderr?.trim() || "Failed to list snapshots" }, null, 2));
        process.exit(1);
      }
      // Check if it's just "no snapshots" message
      if (result.stderr?.includes("No snapshots") || result.stdout?.includes("No snapshots")) {
        console.log("");
        cli.info("No snapshots found.");
        console.log("");
        return;
      }
      exitWithError(result.stderr?.trim() || "Failed to list snapshots");
    }

    const snapshots = parseSnapshotList(result.stdout);

    if (options.json) {
      console.log(JSON.stringify({ snapshots }, null, 2));
      return;
    }

    console.log("");
    if (snapshots.length === 0) {
      cli.info("No snapshots found.");
    } else {
      cli.bold("VM Snapshots");
      console.log("");
      for (const snapshot of snapshots) {
        console.log(`  ${snapshot}`);
      }
    }
    console.log("");
  });

// Save subcommand
const saveCommand = new Command("save")
  .description("Save current VM state as a snapshot")
  .argument("<name>", "Name for the snapshot")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action(async (name, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    if (!options.json) {
      cli.info(`Saving snapshot '${name}'...`);
      console.log("");
    }

    const code = await vagrantRun(["snapshot", "save", name], vvvPath);

    if (options.json) {
      console.log(JSON.stringify({ success: code === 0, snapshot: name, action: "save" }, null, 2));
      process.exit(code);
    }

    if (code === 0) {
      console.log("");
      cli.success(`Snapshot '${name}' saved successfully.`);
    } else {
      cli.error(`Failed to save snapshot '${name}'.`);
      process.exit(code);
    }
  });

// Restore subcommand
const restoreCommand = new Command("restore")
  .description("Restore VM to a snapshot")
  .argument("<name>", "Name of the snapshot to restore")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-y, --yes", "Skip confirmation prompt")
  .option("--json", "Output as JSON")
  .action(async (name, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    // Confirm unless --yes flag
    if (!options.yes && !options.json) {
      cli.warning(`This will restore the VM to snapshot '${name}'.`);
      cli.warning("Any unsaved changes will be lost.");
      console.log("");
      const confirmed = await confirm("Are you sure you want to continue?");
      if (!confirmed) {
        cli.info("Restore cancelled.");
        return;
      }
      console.log("");
    }

    if (!options.json) {
      cli.info(`Restoring snapshot '${name}'...`);
      console.log("");
    }

    const code = await vagrantRun(["snapshot", "restore", name], vvvPath);

    if (options.json) {
      console.log(JSON.stringify({ success: code === 0, snapshot: name, action: "restore" }, null, 2));
      process.exit(code);
    }

    if (code === 0) {
      console.log("");
      cli.success(`Snapshot '${name}' restored successfully.`);
    } else {
      cli.error(`Failed to restore snapshot '${name}'.`);
      process.exit(code);
    }
  });

// Delete subcommand
const deleteCommand = new Command("delete")
  .alias("remove")
  .description("Delete a snapshot")
  .argument("<name>", "Name of the snapshot to delete")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-y, --yes", "Skip confirmation prompt")
  .option("--json", "Output as JSON")
  .action(async (name, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    // Confirm unless --yes flag
    if (!options.yes && !options.json) {
      const confirmed = await confirm(`Delete snapshot '${name}'?`);
      if (!confirmed) {
        cli.info("Delete cancelled.");
        return;
      }
      console.log("");
    }

    if (!options.json) {
      cli.info(`Deleting snapshot '${name}'...`);
      console.log("");
    }

    const code = await vagrantRun(["snapshot", "delete", name], vvvPath);

    if (options.json) {
      console.log(JSON.stringify({ success: code === 0, snapshot: name, action: "delete" }, null, 2));
      process.exit(code);
    }

    if (code === 0) {
      console.log("");
      cli.success(`Snapshot '${name}' deleted successfully.`);
    } else {
      cli.error(`Failed to delete snapshot '${name}'.`);
      process.exit(code);
    }
  });

export const snapshotCommand = new Command("snapshot")
  .description("Manage VM snapshots")
  .addCommand(listCommand)
  .addCommand(saveCommand)
  .addCommand(restoreCommand)
  .addCommand(deleteCommand);
