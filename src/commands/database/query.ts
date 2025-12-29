import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, ensureVvvRunning, cli } from "../../utils/cli.js";
import { ensureVagrantInstalled, vagrantSshAndExit, vagrantSshSync, isValidDatabaseName, escapeShellArg } from "../../utils/vagrant.js";

export const queryCommand = new Command("query")
  .alias("mysql")
  .description("Open MySQL shell or execute a query")
  .argument("[database]", "Database to connect to (optional)")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-e, --execute <query>", "Execute SQL query and exit")
  .option("--json", "Output query results as JSON (requires -e)")
  .action((database, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();
    ensureVvvRunning(vvvPath);

    // Build mysql command parts
    const mysqlArgs = ["mysql", "-u", "root"];

    if (database) {
      // Validate database name if provided
      if (!isValidDatabaseName(database)) {
        cli.error(`Invalid database name '${database}'.`);
        console.log("Database names can only contain letters, numbers, underscores, hyphens, and dollar signs.");
        process.exit(1);
      }
      mysqlArgs.push(`'${escapeShellArg(database)}'`);
    }

    // Execute query mode
    if (options.execute) {
      const query = options.execute;
      // Escape the query for shell single quotes
      const escapedQuery = escapeShellArg(query);

      // Build the full command using single quotes for safety
      const cmd = [...mysqlArgs, "-e", `'${escapedQuery}'`].join(" ");

      if (options.json) {
        // Run with --batch for clean output and parse as JSON
        const batchCmd = [...mysqlArgs, "--batch", "--skip-column-names", "-e", `'${escapedQuery}'`].join(" ");
        const result = vagrantSshSync(batchCmd, vvvPath);

        if (result.status !== 0) {
          console.log(JSON.stringify({ success: false, error: result.stderr?.trim() || "Query failed" }, null, 2));
          process.exit(1);
        }

        // Parse tabular output into rows
        const lines = result.stdout.trim().split("\n").filter((l) => l.trim());
        const rows = lines.map((line) => line.split("\t"));

        console.log(JSON.stringify({ success: true, rowCount: rows.length, rows }, null, 2));
        return;
      }

      // Non-JSON query execution
      if (!options.json) {
        cli.info(`Executing: ${query}`);
        console.log("");
      }

      vagrantSshAndExit(cmd, vvvPath);
      return;
    }

    // Interactive shell mode
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: "--json requires -e flag to execute a query" }, null, 2));
      process.exit(1);
    }

    const target = database ? `database '${database}'` : "MySQL";
    cli.info(`Opening ${target}...`);
    console.log("");

    vagrantSshAndExit(mysqlArgs.join(" "), vvvPath);
  });
