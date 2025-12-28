import { Command } from "commander";

export const removeCommand = new Command("remove")
  .description("Remove a site from VVV")
  .argument("<name>", "Name of the site to remove")
  .option("-f, --force", "Skip confirmation prompt")
  .action((name, options) => {
    // TODO: Implement site remove command
    console.log(`Removing site: ${name}`, options);
  });
