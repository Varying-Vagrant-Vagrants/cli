import { Command } from "commander";
import { readFileSync } from "fs";
import { parse } from "yaml";
import { DEFAULT_VVV_PATH, getConfigPath, type VVVConfig } from "../../utils/config.js";
import { ensureVvvExists, cli } from "../../utils/cli.js";

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateConfig(configPath: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Try to read the file
  let content: string;
  try {
    content = readFileSync(configPath, "utf-8");
  } catch (error) {
    errors.push(`Cannot read config file: ${(error as Error).message}`);
    return { valid: false, errors, warnings };
  }

  // Try to parse YAML
  let config: VVVConfig;
  try {
    config = parse(content) as VVVConfig;
  } catch (error) {
    const err = error as Error;
    errors.push(`YAML syntax error: ${err.message}`);
    return { valid: false, errors, warnings };
  }

  // Validate structure
  if (!config) {
    errors.push("Config file is empty");
    return { valid: false, errors, warnings };
  }

  // Check for sites section
  if (!config.sites) {
    warnings.push("No 'sites' section found - no sites will be provisioned");
  } else {
    // Validate each site
    for (const [name, site] of Object.entries(config.sites)) {
      if (!site) {
        warnings.push(`Site '${name}' has no configuration`);
        continue;
      }

      // Check for hosts
      if (!site.hosts || site.hosts.length === 0) {
        warnings.push(`Site '${name}' has no hosts defined`);
      }

      // Check for valid PHP version
      if (site.php) {
        const validVersions = ["7.0", "7.1", "7.2", "7.3", "7.4", "8.0", "8.1", "8.2", "8.3", "8.4"];
        if (!validVersions.includes(site.php)) {
          warnings.push(`Site '${name}' has unusual PHP version: ${site.php}`);
        }
      }

      // Check for repo without description
      if (site.repo && !site.description) {
        warnings.push(`Site '${name}' has a repo but no description`);
      }
    }
  }

  // Check vm_config
  if (config.vm_config) {
    const vmConfig = config.vm_config;

    // Validate provider
    const validProviders = ["virtualbox", "parallels", "vmware_desktop", "hyperv", "docker"];
    if (vmConfig.provider && !validProviders.includes(vmConfig.provider as string)) {
      warnings.push(`Unknown VM provider: ${vmConfig.provider}`);
    }

    // Validate memory
    if (vmConfig.memory && typeof vmConfig.memory === "number") {
      if (vmConfig.memory < 1024) {
        warnings.push(`VM memory is very low (${vmConfig.memory}MB) - recommend at least 2048MB`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export const validateCommand = new Command("validate")
  .description("Validate the VVV configuration file")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    const configPath = getConfigPath(vvvPath);
    const result = validateConfig(configPath);

    if (options.json) {
      console.log(JSON.stringify({
        valid: result.valid,
        configPath,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        errors: result.errors,
        warnings: result.warnings,
      }, null, 2));
      process.exit(result.valid ? 0 : 1);
    }

    console.log("");
    cli.bold(`Validating: ${configPath}`);
    console.log("");

    // Show errors
    if (result.errors.length > 0) {
      cli.error("Errors:");
      for (const error of result.errors) {
        console.log(`  ${cli.format.error("✗")} ${error}`);
      }
      console.log("");
    }

    // Show warnings
    if (result.warnings.length > 0) {
      cli.warning("Warnings:");
      for (const warning of result.warnings) {
        console.log(`  ${cli.format.warning("!")} ${warning}`);
      }
      console.log("");
    }

    // Summary
    if (result.valid) {
      if (result.warnings.length === 0) {
        cli.success("Configuration is valid!");
      } else {
        cli.success(`Configuration is valid with ${result.warnings.length} warning(s).`);
      }
    } else {
      cli.error(`Configuration is invalid with ${result.errors.length} error(s).`);
    }
    console.log("");

    process.exit(result.valid ? 0 : 1);
  });
