import { Command } from "commander";

export const removeCommand = new Command("remove")
  .description("Remove an extension from VVV")
  .argument("<name>", "Name of the extension to remove")
  .option("-f, --force", "Skip confirmation prompt")
  .action((name, options) => {
    // TODO: Implement extension remove command
    console.log(`Removing extension: ${name}`, options);
  });
