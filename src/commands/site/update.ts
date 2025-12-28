import { Command } from "commander";
import {
  DEFAULT_VVV_PATH,
  loadConfig,
  updateSiteConfig,
  type SiteUpdateOptions,
} from "../../utils/config.js";
import { ensureVvvExists, cli, exitWithError, askQuestion } from "../../utils/cli.js";

export const updateCommand = new Command("update")
  .description("Update a site's configuration")
  .argument("<site>", "Name of the site to update")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-d, --description <text>", "Set site description")
  .option("-H, --host <hostname>", "Add hostname (can be used multiple times)", collect, [])
  .option("--remove-host <hostname>", "Remove hostname (can be used multiple times)", collect, [])
  .option("--php <version>", "Set PHP version (e.g., 8.2)")
  .option("-i, --interactive", "Interactive mode")
  .option("--json", "Output as JSON")
  .action(async (siteName, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    // Load current config to verify site exists and get current values
    const config = loadConfig(vvvPath);
    const site = config.sites?.[siteName];

    if (!site) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Site '${siteName}' not found` }, null, 2));
        process.exit(1);
      }
      exitWithError(`Site '${siteName}' not found in config.`);
    }

    const updateOptions: SiteUpdateOptions = {};
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    // Check if any updates were specified via flags
    const hasFlags =
      options.description !== undefined ||
      options.php !== undefined ||
      options.host.length > 0 ||
      options.removeHost.length > 0;

    if (!hasFlags && !options.interactive) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: "No updates specified" }, null, 2));
        process.exit(1);
      }
      cli.error("No updates specified.");
      console.log("");
      console.log("Usage:");
      console.log("  vvvlocal site update <site> --description \"New description\"");
      console.log("  vvvlocal site update <site> --php 8.2");
      console.log("  vvvlocal site update <site> --host new.site.test");
      console.log("  vvvlocal site update <site> -i  (interactive mode)");
      process.exit(1);
    }

    // Interactive mode
    if (options.interactive) {
      if (!options.json) {
        console.log("");
        cli.bold(`Updating site: ${siteName}`);
        console.log("");
      }

      // Description
      const currentDesc = site.description || "";
      const newDesc = await askQuestion(
        `Description [${currentDesc || "(none)"}]`,
        currentDesc
      );
      if (newDesc !== currentDesc) {
        updateOptions.description = newDesc;
        changes.description = { from: currentDesc || null, to: newDesc };
      }

      // PHP version
      const currentPhp = site.php || "";
      const newPhp = await askQuestion(
        `PHP version [${currentPhp || "(default)"}]`,
        currentPhp
      );
      if (newPhp !== currentPhp) {
        updateOptions.php = newPhp;
        changes.php = { from: currentPhp || null, to: newPhp };
      }

      // Hosts
      const currentHosts = site.hosts || [];
      if (!options.json) {
        console.log(`Current hosts: ${currentHosts.join(", ") || "(none)"}`);
      }

      // Add hosts
      const addHostsInput = await askQuestion("Add hosts (comma-separated, empty to skip)", "");
      if (addHostsInput) {
        const newHosts = addHostsInput.split(",").map((h) => h.trim()).filter((h) => h);
        if (newHosts.length > 0) {
          updateOptions.addHosts = newHosts;
          changes.hostsAdded = { from: null, to: newHosts };
        }
      }

      // Remove hosts
      if (currentHosts.length > 0) {
        const removeHostsInput = await askQuestion("Remove hosts (comma-separated, empty to skip)", "");
        if (removeHostsInput) {
          const hostsToRemove = removeHostsInput.split(",").map((h) => h.trim()).filter((h) => h);
          if (hostsToRemove.length > 0) {
            updateOptions.removeHosts = hostsToRemove;
            changes.hostsRemoved = { from: hostsToRemove, to: null };
          }
        }
      }
    } else {
      // Flag-based updates
      if (options.description !== undefined) {
        updateOptions.description = options.description;
        changes.description = { from: site.description || null, to: options.description };
      }

      if (options.php !== undefined) {
        updateOptions.php = options.php;
        changes.php = { from: site.php || null, to: options.php };
      }

      if (options.host.length > 0) {
        updateOptions.addHosts = options.host;
        changes.hostsAdded = { from: null, to: options.host };
      }

      if (options.removeHost.length > 0) {
        updateOptions.removeHosts = options.removeHost;
        changes.hostsRemoved = { from: options.removeHost, to: null };
      }
    }

    // Check if there are any changes to apply
    if (Object.keys(changes).length === 0) {
      if (options.json) {
        console.log(JSON.stringify({ success: true, site: siteName, changes: {} }, null, 2));
      } else {
        cli.info("No changes to apply.");
      }
      return;
    }

    // Apply updates
    try {
      updateSiteConfig(vvvPath, siteName, updateOptions);

      if (options.json) {
        console.log(JSON.stringify({ success: true, site: siteName, changes }, null, 2));
      } else {
        console.log("");
        cli.success(`Updated site '${siteName}':`);
        for (const [field, change] of Object.entries(changes)) {
          if (field === "hostsAdded") {
            console.log(`  hosts added: ${(change.to as string[]).join(", ")}`);
          } else if (field === "hostsRemoved") {
            console.log(`  hosts removed: ${(change.from as string[]).join(", ")}`);
          } else {
            console.log(`  ${field}: ${change.to}`);
          }
        }
        console.log("");
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: (error as Error).message }, null, 2));
        process.exit(1);
      }
      exitWithError((error as Error).message);
    }
  });

// Helper function to collect multiple values for an option
function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
