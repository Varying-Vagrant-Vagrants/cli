import { Command } from "commander";
import { readFileSync, writeFileSync } from "fs";
import { parseDocument } from "yaml";
import { getConfigPath, DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, ensureSiteNotExists, askQuestion, cli, exitWithError } from "../../utils/cli.js";

function addSiteToConfig(
  vvvPath: string,
  siteName: string,
  options: {
    description?: string;
    repo?: string;
    hosts: string[];
    localDir?: string;
    vmDir?: string;
  }
): void {
  const configPath = getConfigPath(vvvPath);
  const content = readFileSync(configPath, "utf-8");
  const doc = parseDocument(content);

  let sites = doc.get("sites") as any;
  if (!sites) {
    doc.set("sites", {});
    sites = doc.get("sites") as any;
  }

  // Build the site config object
  const siteConfig: Record<string, unknown> = {};

  if (options.description) {
    siteConfig.description = options.description;
  }

  if (options.repo) {
    siteConfig.repo = options.repo;
  }

  // Custom paths - both must be specified together
  if (options.localDir && options.vmDir) {
    siteConfig.local_dir = options.localDir;
    siteConfig.vm_dir = options.vmDir;
  }

  siteConfig.hosts = options.hosts;
  siteConfig.skip_provisioning = false;

  sites.set(siteName, siteConfig);

  writeFileSync(configPath, doc.toString(), "utf-8");
}

export const addCommand = new Command("add")
  .alias("new")
  .description("Add a new site to VVV")
  .argument("<name>", "Name of the site to add")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-d, --description <description>", "Site description")
  .option("-r, --repo <repo>", "Git repository URL for custom site template")
  .option("-H, --host <hosts...>", "Hostnames for the site (can specify multiple)")
  .option("--local-dir <path>", "Custom local directory path (requires --vm-dir)")
  .option("--vm-dir <path>", "Custom VM directory path (requires --local-dir)")
  .option("-y, --yes", "Skip interactive prompts and use defaults")
  .action(async (name, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureSiteNotExists(vvvPath, name);

    // Validate custom paths - both must be specified together
    const localDir = options.localDir;
    const vmDir = options.vmDir;
    if ((localDir && !vmDir) || (!localDir && vmDir)) {
      exitWithError("Both --local-dir and --vm-dir must be specified together.");
    }

    let description = options.description;
    let repo = options.repo;
    let hosts: string[] = options.host || [];

    // Interactive prompts if not using --yes and values not provided
    if (!options.yes) {
      // Description
      if (!description) {
        description = await askQuestion("Site description (optional)");
      }

      // Hosts
      if (hosts.length === 0) {
        const defaultHost = `${name}.test`;
        const hostsInput = await askQuestion("Hostname(s) (comma-separated)", defaultHost);
        hosts = hostsInput.split(",").map((h) => h.trim()).filter((h) => h !== "");
      }

      // Repo (custom site template)
      if (!repo) {
        const repoInput = await askQuestion("Git repo URL for custom template (optional, press Enter to skip)");
        repo = repoInput || undefined;
      }
    } else {
      // Use defaults when --yes is specified
      if (hosts.length === 0) {
        hosts = [`${name}.test`];
      }
    }

    // Ensure we have at least one host
    if (hosts.length === 0) {
      hosts = [`${name}.test`];
    }

    console.log("");
    console.log(`Adding site '${name}'...`);

    try {
      addSiteToConfig(vvvPath, name, {
        description: description || undefined,
        repo,
        hosts,
        localDir,
        vmDir,
      });

      cli.success(`\nSite '${name}' added successfully!`);
      console.log("");
      console.log("Site configuration:");
      console.log(`  Hosts: ${hosts.join(", ")}`);
      if (description) {
        console.log(`  Description: ${description}`);
      }
      if (repo) {
        console.log(`  Repo: ${repo}`);
      }
      if (localDir && vmDir) {
        console.log(`  Local path: ${localDir}`);
        console.log(`  VM path: ${vmDir}`);
      }
      console.log("");
      cli.warning(`Note: Run ${cli.format.bold("vvvlocal reprovision")} to create the site.`);
    } catch (error) {
      exitWithError(`Failed to add site: ${error}`);
    }
  });
