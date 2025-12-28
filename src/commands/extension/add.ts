import { Command } from "commander";

export const addCommand = new Command("add")
  .description("Add an extension to VVV")
  .argument("<name>", "Name or URL of the extension to add")
  .action((name) => {
    // TODO: Implement extension add command
    console.log(`Adding extension: ${name}`);
  });
