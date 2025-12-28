import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../../utils/config.js";
import { runWpCommand } from "../wp.js";
import { cli } from "../../utils/cli.js";

export const wpCommand = new Command("wp")
  .description("Run WP-CLI commands for a site")
  .argument("<site>", "Name of the site")
  .argument("[wp-args...]", "WP-CLI command and arguments")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .action((siteName, wpArgs, options) => {
    const vvvPath = options.path;

    if (!wpArgs || wpArgs.length === 0) {
      // No WP-CLI command provided, show help
      cli.error("No WP-CLI command provided.");
      console.log("");
      console.log("Usage: vvvlocal site wp <site> <wp-command>");
      console.log("");
      console.log("Examples:");
      console.log("  vvvlocal site wp wordpress-one plugin list");
      console.log("  vvvlocal site wp wordpress-one user list --format=json");
      console.log("  vvvlocal site wp wordpress-one db export backup.sql");
      process.exit(1);
    }

    runWpCommand(vvvPath, siteName, wpArgs);
  });
