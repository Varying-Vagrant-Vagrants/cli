import { Command } from "commander";
import { readFileSync, writeFileSync } from "fs";
import { parseDocument } from "yaml";
import { loadConfig, getConfigPath, getSiteLocalPath, DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, ensureSiteExists, confirm, cli, exitWithError } from "../../utils/cli.js";

function removeSiteFromConfig(vvvPath: string, siteName: string): void {
  const configPath = getConfigPath(vvvPath);
  const content = readFileSync(configPath, "utf-8");
  const doc = parseDocument(content);

  const sites = doc.get("sites") as any;
  if (!sites) {
    throw new Error("No sites found in config");
  }

  if (!sites.get(siteName)) {
    throw new Error(`Site '${siteName}' not found in config`);
  }

  sites.delete(siteName);

  writeFileSync(configPath, doc.toString(), "utf-8");
}

export const removeCommand = new Command("remove")
  .alias("delete")
  .description("Remove a site from VVV")
  .argument("<name>", "Name of the site to remove")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-f, --force", "Skip confirmation prompt")
  .option("--dry-run", "Show what would be done without making changes")
  .action(async (name, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureSiteExists(vvvPath, name);

    // Get site config for path info
    const config = loadConfig(vvvPath);
    const siteConfig = config.sites?.[name];

    if (!siteConfig) {
      exitWithError(`Site '${name}' not found in config.`);
    }

    const sitePath = getSiteLocalPath(vvvPath, name, siteConfig);

    // Dry-run mode
    if (options.dryRun) {
      cli.info("Dry run - no changes will be made:");
      console.log("");
      console.log(`  Would remove site '${name}' from config.yml`);
      console.log(`  Site files would remain at: ${sitePath}`);
      console.log(`  You would need to run 'vvvlocal reprovision' to update the VM`);
      return;
    }

    // Confirm removal unless --force is used
    if (!options.force) {
      cli.warning(`Warning: This will remove site '${name}' from the VVV configuration.`);
      console.log("The site files will remain on disk until you reprovision.");
      console.log("");

      const confirmed = await confirm(`Are you sure you want to remove '${name}'?`);

      if (!confirmed) {
        console.log("Removal cancelled.");
        process.exit(0);
      }
    }

    console.log(`\nRemoving site '${name}'...`);

    try {
      removeSiteFromConfig(vvvPath, name);

      cli.success(`Site '${name}' removed from configuration.`);
      console.log("");
      cli.warning("Note: The site files and database still exist.");
      console.log(`Run ${cli.format.bold("vvvlocal reprovision")} to update the VM.`);
      console.log("");
      console.log("To completely remove the site:");
      console.log(`  Files:    ${sitePath}`);
      console.log(`  Database: use ${cli.format.bold("vvvlocal db list")} to find and manually remove any databases`);
    } catch (error) {
      exitWithError(`Failed to remove site: ${error}`);
    }
  });
