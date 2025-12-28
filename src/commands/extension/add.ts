import { Command } from "commander";
import { cli } from "../../utils/cli.js";

export const addCommand = new Command("add")
  .description("Add an extension to VVV (coming soon)")
  .argument("<name>", "Name or URL of the extension to add")
  .action((name) => {
    cli.warning("The extension add command is coming soon.");
    console.log("");
    console.log("For now, manually add extensions to your config/config.yml:");
    console.log("  extensions:");
    console.log(`    ${name}:`);
    console.log("      repo: https://github.com/...");
  });
