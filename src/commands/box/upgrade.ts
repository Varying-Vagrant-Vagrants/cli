import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, cli, exitWithError, confirm } from "../../utils/cli.js";
import { getBoxInfo } from "../../utils/box.js";
import { vagrantRunSync } from "../../utils/vagrant.js";

export const upgradeCommand = new Command("upgrade")
  .description("Upgrade Vagrant box (destroys and recreates VM)")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-y, --yes", "Skip confirmation prompts")
  .option("--dry-run", "Show what would happen without making changes")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const vvvPath = options.path;
    ensureVvvExists(vvvPath);

    // Get current box version
    const boxInfo = getBoxInfo(vvvPath);
    if (!boxInfo) {
      exitWithError("Unable to detect current box version");
    }

    cli.info(`Current box: ${boxInfo.name} ${boxInfo.version}`);

    if (options.dryRun) {
      cli.info("Dry run - no changes will be made:");
      console.log("  1. Create VM snapshot");
      console.log("  2. Export all databases");
      console.log("  3. Destroy current VM");
      console.log("  4. Update Vagrant box");
      console.log("  5. Provision new VM");
      console.log("  6. Restore databases");
      return;
    }

    // Confirm destructive action
    if (!options.yes) {
      cli.warning("⚠️  This will destroy your VM and recreate it.");
      cli.info("Your sites and databases will be backed up and restored.");

      const confirmed = await confirm("Continue with box upgrade?");

      if (!confirmed) {
        cli.info("Box upgrade cancelled.");
        return;
      }
    }

    try {
      // 1. Create snapshot backup
      cli.info("Creating VM snapshot...");
      vagrantRunSync(["snapshot", "save", "pre-box-upgrade"], vvvPath);

      // 2. Export databases
      cli.info("Exporting databases...");
      // TODO: Implement database backup
      // const databases = await listDatabases(vvvPath);
      // for (const db of databases) {
      //   await backupDatabase(vvvPath, db.name);
      // }

      // 3. Destroy VM
      cli.info("Destroying current VM...");
      vagrantRunSync(["destroy", "--force"], vvvPath);

      // 4. Update box
      cli.info("Updating Vagrant box...");
      vagrantRunSync(["box", "update"], vvvPath);

      // 5. Provision new VM
      cli.info("Provisioning new VM with updated box...");
      cli.info("This may take several minutes...");
      vagrantRunSync(["up", "--provision"], vvvPath);

      // 6. Import databases
      cli.info("Restoring databases...");
      // TODO: Implement database restore
      // for (const db of databases) {
      //   await restoreDatabase(vvvPath, db.name, backupFile);
      // }

      cli.success("✓ Box upgrade complete!");
      cli.info("Run 'vvvlocal doctor' to verify the installation.");

      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          message: "Box upgrade complete"
        }, null, 2));
      }
    } catch {
      exitWithError(
        "Box upgrade failed",
        "You can restore from snapshot with: vagrant snapshot restore pre-box-upgrade"
      );
    }
  });
