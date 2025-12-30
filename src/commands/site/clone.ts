import { Command } from "commander";
import { readFileSync, writeFileSync } from "fs";
import { parseDocument, YAMLMap } from "yaml";
import { getConfigPath, loadConfig, getSiteVmPath, DEFAULT_VVV_PATH, type SiteConfig } from "../../utils/config.js";
import { ensureVvvExists, ensureVvvRunning, ensureSiteExists, ensureSiteNotExists, cli, exitWithError, startTimer } from "../../utils/cli.js";
import { vagrantSshSync, vagrantProvisionWith } from "../../utils/vagrant.js";

/**
 * Find the WordPress root directory within a site.
 */
function findWordPressRoot(vvvPath: string, vmPath: string): string | null {
  const locations = ["public_html", "htdocs", ""];

  for (const loc of locations) {
    const testPath = loc ? `${vmPath}/${loc}` : vmPath;
    const result = vagrantSshSync(`test -f ${testPath}/wp-config.php && echo "found"`, vvvPath);
    if (result.stdout?.trim() === "found") {
      return testPath;
    }
  }

  return null;
}

/**
 * Get database name from WordPress site using WP-CLI.
 */
function getDatabaseName(vvvPath: string, wpRoot: string): string | null {
  const result = vagrantSshSync(`cd ${wpRoot} && wp config get DB_NAME 2>/dev/null`, vvvPath);
  if (result.status === 0 && result.stdout?.trim()) {
    return result.stdout.trim();
  }
  return null;
}

/**
 * Check if a hostname is already used by any site.
 */
function isHostnameUsed(vvvPath: string, hostname: string, excludeSite?: string): boolean {
  const config = loadConfig(vvvPath);
  if (!config.sites) return false;

  for (const [siteName, siteConfig] of Object.entries(config.sites)) {
    if (siteName === excludeSite) continue;
    if (siteConfig.hosts?.includes(hostname)) {
      return true;
    }
  }
  return false;
}

/**
 * Clone site configuration to config.yml.
 */
function cloneSiteConfig(
  vvvPath: string,
  sourceSiteName: string,
  newSiteName: string,
  newHosts: string[],
  sourceConfig: SiteConfig
): void {
  const configPath = getConfigPath(vvvPath);
  const content = readFileSync(configPath, "utf-8");
  const doc = parseDocument(content);

  const sites = doc.get("sites") as YAMLMap;
  if (!sites) {
    throw new Error("No sites section in config");
  }

  // Build new site config based on source
  const newConfig: Record<string, unknown> = {};

  // Copy description with modified text
  if (sourceConfig.description) {
    newConfig.description = `Clone of ${sourceSiteName}: ${sourceConfig.description}`;
  } else {
    newConfig.description = `Clone of ${sourceSiteName}`;
  }

  // Copy repo if exists
  if (sourceConfig.repo) {
    newConfig.repo = sourceConfig.repo;
  }

  // Copy PHP version if exists
  if (sourceConfig.php) {
    newConfig.php = sourceConfig.php;
  }

  // Copy custom settings if exists
  if (sourceConfig.custom) {
    newConfig.custom = sourceConfig.custom;
  }

  // Set new hosts
  newConfig.hosts = newHosts;
  newConfig.skip_provisioning = false;

  sites.set(newSiteName, newConfig);

  writeFileSync(configPath, doc.toString(), "utf-8");
}

export const cloneCommand = new Command("clone")
  .description("Clone an existing site")
  .argument("<source>", "Name of the site to clone")
  .argument("<new-name>", "Name for the cloned site")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-H, --host <hostname>", "Hostname for new site (default: {new-name}.test)")
  .option("--skip-db", "Skip database cloning")
  .option("--skip-files", "Skip file copying (config only)")
  .option("--no-provision", "Don't run provisioning after clone")
  .action(async (source, newName, options) => {
    const vvvPath = options.path;
    const getElapsed = startTimer();

    // Validate
    ensureVvvExists(vvvPath);
    ensureVvvRunning(vvvPath);
    ensureSiteExists(vvvPath, source);
    ensureSiteNotExists(vvvPath, newName);

    // Determine hostname
    const newHost = options.host || `${newName}.test`;
    if (isHostnameUsed(vvvPath, newHost)) {
      exitWithError(`Hostname '${newHost}' is already used by another site.`);
    }

    const config = loadConfig(vvvPath);
    const sourceConfig = config.sites?.[source] as SiteConfig;
    if (!sourceConfig) {
      exitWithError(`Source site '${source}' not found.`);
    }

    const sourceVmPath = getSiteVmPath(source, sourceConfig);
    const newVmPath = `/srv/www/${newName}`;
    const sourceHost = sourceConfig.hosts?.[0] || `${source}.test`;

    cli.bold(`Cloning site '${source}' to '${newName}'`);
    console.log("");

    // Step 1: Clone configuration
    console.log("Cloning configuration...");
    try {
      cloneSiteConfig(vvvPath, source, newName, [newHost], sourceConfig);
      cli.success("Configuration cloned");
    } catch (error) {
      exitWithError(`Failed to clone configuration: ${error}`);
    }

    // Step 2: Clone files
    if (!options.skipFiles) {
      console.log("\nCopying site files (this may take a while)...");
      const copyResult = vagrantSshSync(
        `sudo cp -r ${sourceVmPath} ${newVmPath} && sudo chown -R www-data:www-data ${newVmPath}`,
        vvvPath,
        300000 // 5 minute timeout for large sites
      );

      if (copyResult.status !== 0) {
        cli.warning("Failed to copy files: " + (copyResult.stderr || "Unknown error"));
        cli.warning("Continuing with database clone...");
      } else {
        cli.success("Site files copied");
      }
    } else {
      cli.info("Skipping file copy (--skip-files)");
    }

    // Step 3: Clone database
    if (!options.skipDb && !options.skipFiles) {
      console.log("\nCloning database...");

      // Find WordPress root in the NEW site
      const wpRoot = findWordPressRoot(vvvPath, newVmPath);

      if (!wpRoot) {
        cli.warning("WordPress not found in cloned site, skipping database clone");
      } else {
        // Get source database name from the CLONED wp-config (it still has the old DB name)
        const sourceDb = getDatabaseName(vvvPath, wpRoot);

        if (!sourceDb) {
          cli.warning("Could not detect database name, skipping database clone");
        } else {
          // Generate new database name
          const newDb = newName.replace(/-/g, "_");

          console.log(`  Source database: ${sourceDb}`);
          console.log(`  New database: ${newDb}`);

          // Dump source database
          const dumpResult = vagrantSshSync(
            `mysqldump ${sourceDb} > /tmp/clone_dump.sql`,
            vvvPath,
            120000
          );

          if (dumpResult.status !== 0) {
            cli.warning("Failed to dump source database: " + (dumpResult.stderr || ""));
          } else {
            // Create new database
            const createResult = vagrantSshSync(
              `mysql -e "CREATE DATABASE IF NOT EXISTS \\\`${newDb}\\\`"`,
              vvvPath
            );

            if (createResult.status !== 0) {
              cli.warning("Failed to create new database: " + (createResult.stderr || ""));
            } else {
              // Import dump
              const importResult = vagrantSshSync(
                `mysql ${newDb} < /tmp/clone_dump.sql`,
                vvvPath,
                120000
              );

              if (importResult.status !== 0) {
                cli.warning("Failed to import database: " + (importResult.stderr || ""));
              } else {
                // Update wp-config.php with new database name
                const configUpdateResult = vagrantSshSync(
                  `cd ${wpRoot} && wp config set DB_NAME ${newDb}`,
                  vvvPath
                );

                if (configUpdateResult.status !== 0) {
                  cli.warning("Failed to update wp-config.php with new database name");
                }

                // Run search-replace for URLs
                console.log("\n  Running URL search-replace...");
                const searchReplaceResult = vagrantSshSync(
                  `cd ${wpRoot} && wp search-replace '${sourceHost}' '${newHost}' --all-tables --precise`,
                  vvvPath,
                  180000 // 3 minute timeout
                );

                if (searchReplaceResult.status !== 0) {
                  cli.warning("Search-replace had issues: " + (searchReplaceResult.stderr || ""));
                } else {
                  cli.success("Database cloned and URLs updated");
                }
              }
            }

            // Cleanup dump file
            vagrantSshSync("rm -f /tmp/clone_dump.sql", vvvPath);
          }
        }
      }
    } else if (options.skipDb) {
      cli.info("Skipping database clone (--skip-db)");
    }

    // Step 4: Run provisioning
    if (options.provision !== false) {
      console.log("\nProvisioning to set up nginx and hosts...");
      const provisionCode = await vagrantProvisionWith(
        [`site-${newName}`, "extension-core-tls-ca"],
        vvvPath
      );
      if (provisionCode !== 0) {
        cli.warning("Provisioning had issues, you may need to run it again");
      } else {
        cli.success("Provisioning complete");
      }
    } else {
      cli.info("Skipping provisioning (--no-provision)");
      cli.warning("Run 'vvvlocal reprovision' to complete setup");
    }

    const elapsed = getElapsed();
    console.log("");
    cli.success(`Site '${newName}' cloned successfully! (${elapsed})`);
    console.log("");
    console.log("New site details:");
    console.log(`  URL: https://${newHost}/`);
    console.log(`  Admin: https://${newHost}/wp-admin/`);
  });
