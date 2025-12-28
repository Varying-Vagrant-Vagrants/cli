import { Command } from "commander";

export const addCommand = new Command("add")
  .description("Add a new site to VVV")
  .argument("<name>", "Name of the site to add")
  .option("-t, --template <template>", "Site template to use")
  .action((name, options) => {
    // TODO: Implement site add command
    console.log(`Adding site: ${name}`, options);
  });
