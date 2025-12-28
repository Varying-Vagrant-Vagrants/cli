import { Command } from "commander";
import { createInterface } from "readline";
import { readFileSync, writeFileSync } from "fs";
import { parseDocument } from "yaml";
import { vvvExists, loadConfig, getConfigPath, DEFAULT_VVV_PATH } from "../../utils/config.js";

function askQuestion(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

function siteExists(vvvPath: string, siteName: string): boolean {
  try {
    const config = loadConfig(vvvPath);
    return config.sites ? siteName in config.sites : false;
  } catch {
    return false;
  }
}

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
  .action(async (name, options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      process.exit(1);
    }

    // Check if site exists
    if (!siteExists(vvvPath, name)) {
      console.error(`Site '${name}' does not exist.`);
      process.exit(1);
    }

    // Confirm removal unless --force is used
    if (!options.force) {
      console.log(`\x1b[33mWarning:\x1b[0m This will remove site '${name}' from the VVV configuration.`);
      console.log("The site files will remain on disk until you reprovision.");
      console.log("");

      const answer = await askQuestion(`Are you sure you want to remove '${name}'? (y/n): `);

      if (answer !== "y" && answer !== "yes") {
        console.log("Removal cancelled.");
        process.exit(0);
      }
    }

    console.log(`\nRemoving site '${name}'...`);

    try {
      removeSiteFromConfig(vvvPath, name);

      console.log(`Site '${name}' removed from configuration.`);
      console.log("");
      console.log("\x1b[33mNote:\x1b[0m The site files and database still exist.");
      console.log("Run \x1b[1mvvvlocal reprovision\x1b[0m to update the VM.");
      console.log("");
      console.log("To completely remove the site:");
      console.log(`  Files:    ${vvvPath}/www/${name}`);
      console.log("  Database: use \x1b[1mvvvlocal db list\x1b[0m to find and manually remove any databases");
    } catch (error) {
      console.error(`Failed to remove site: ${error}`);
      process.exit(1);
    }
  });
