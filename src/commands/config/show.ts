import { Command } from "commander";
import { readFileSync } from "fs";
import { DEFAULT_VVV_PATH, getConfigPath, loadConfig } from "../../utils/config.js";
import { ensureVvvExists, cli } from "../../utils/cli.js";

export const showCommand = new Command("show")
  .description("Display the current VVV configuration")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .option("--raw", "Show raw YAML without formatting")
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    const configPath = getConfigPath(vvvPath);

    // JSON output - parse and return as JSON
    if (options.json) {
      try {
        const config = loadConfig(vvvPath);
        console.log(JSON.stringify(config, null, 2));
      } catch (error) {
        console.log(JSON.stringify({ success: false, error: (error as Error).message }, null, 2));
        process.exit(1);
      }
      return;
    }

    // Raw output - just cat the file
    if (options.raw) {
      const content = readFileSync(configPath, "utf-8");
      console.log(content);
      return;
    }

    // Pretty output with some structure
    try {
      const config = loadConfig(vvvPath);
      const content = readFileSync(configPath, "utf-8");

      console.log("");
      cli.bold(`VVV Configuration (${configPath})`);
      console.log("");

      // Show sites summary
      if (config.sites) {
        cli.info("Sites:");
        for (const [name, site] of Object.entries(config.sites)) {
          const status = site.skip_provisioning ? cli.format.dim("(skipped)") : "";
          const hosts = site.hosts?.join(", ") || "(no hosts)";
          console.log(`  ${name} ${status}`);
          console.log(`    ${cli.format.dim(hosts)}`);
        }
        console.log("");
      }

      // Show extensions summary
      if (config.extensions) {
        cli.info("Extensions:");
        for (const [name, provisioners] of Object.entries(config.extensions)) {
          console.log(`  ${name}: ${(provisioners as string[]).join(", ")}`);
        }
        console.log("");
      }

      // Show VM config
      if (config.vm_config) {
        cli.info("VM Config:");
        for (const [key, value] of Object.entries(config.vm_config)) {
          console.log(`  ${key}: ${value}`);
        }
        console.log("");
      }

      console.log(cli.format.dim(`Use --raw to see the full YAML file`));
      console.log("");
    } catch (error) {
      cli.error(`Failed to load config: ${(error as Error).message}`);
      process.exit(1);
    }
  });
