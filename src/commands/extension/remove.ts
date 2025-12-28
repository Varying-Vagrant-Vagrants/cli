import { Command } from "commander";
import { cli } from "../../utils/cli.js";

export const removeCommand = new Command("remove")
  .description("Remove an extension from VVV (coming soon)")
  .argument("<name>", "Name of the extension to remove")
  .option("-f, --force", "Skip confirmation prompt")
  .action((name) => {
    cli.warning("The extension remove command is coming soon.");
    console.log("");
    console.log(`For now, manually remove '${name}' from your config/config.yml extensions section.`);
  });
