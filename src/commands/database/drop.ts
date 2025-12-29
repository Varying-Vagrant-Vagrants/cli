import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, ensureVvvRunning, confirm, cli, exitWithError } from "../../utils/cli.js";
import { vagrantSshSync, SYSTEM_DATABASES, isValidDatabaseName, escapeMySqlString, escapeMySqlIdentifier } from "../../utils/vagrant.js";

export const dropCommand = new Command("drop")
  .description("Drop (delete) a database")
  .argument("<name>", "Name of the database to drop")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-y, --yes", "Skip confirmation prompt")
  .option("--dry-run", "Show what would be done without making changes")
  .action(async (name, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    // Validate database name to prevent injection
    if (!isValidDatabaseName(name)) {
      exitWithError(
        `Invalid database name '${name}'.`,
        "Database names can only contain letters, numbers, underscores, hyphens, and dollar signs."
      );
    }

    // Prevent dropping system databases
    if (SYSTEM_DATABASES.includes(name)) {
      exitWithError(`Cannot drop system database '${name}'.`);
    }

    // Dry-run mode
    if (options.dryRun) {
      cli.info("Dry run - no changes will be made:");
      console.log("");
      console.log(`  Would drop database '${name}'`);
      console.log("  This action would be permanent and cannot be undone");
      return;
    }

    ensureVvvRunning(vvvPath);

    // Check if database exists (use escaped name in query)
    const escapedName = escapeMySqlString(name);
    const checkResult = vagrantSshSync(
      `mysql --batch --skip-column-names -e "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '${escapedName}'"`,
      vvvPath
    );

    const dbExists = checkResult.stdout?.trim() === name;

    if (!dbExists) {
      exitWithError(`Database '${name}' does not exist.`);
    }

    // Confirm deletion unless --yes is used
    if (!options.yes) {
      cli.error(`Warning: This will permanently delete the database '${name}'.`);
      console.log("This action cannot be undone.");
      console.log("");

      const confirmed = await confirm(`Are you sure you want to drop '${name}'?`);

      if (!confirmed) {
        console.log("Drop cancelled.");
        process.exit(0);
      }
    }

    console.log(`\nDropping database '${name}'...`);

    // Drop the database (use escaped identifier)
    const escapedIdentifier = escapeMySqlIdentifier(name);
    const dropResult = vagrantSshSync(
      `mysql -e "DROP DATABASE \\\`${escapedIdentifier}\\\`"`,
      vvvPath
    );

    if (dropResult.status === 0) {
      cli.success(`Database '${name}' dropped successfully.`);
    } else {
      cli.error(`Failed to drop database '${name}'.`);
      if (dropResult.stderr) {
        console.error(dropResult.stderr);
      }
      process.exit(1);
    }
  });
