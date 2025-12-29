import { Command } from "commander";
import { existsSync } from "fs";
import { join } from "path";
import { platform } from "os";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { cli } from "../utils/cli.js";
import {
  PROVIDERS,
  detectAvailableProvidersAsync,
  getCurrentProvider,
} from "../utils/providers.js";

export const providersCommand = new Command("providers")
  .description("List available virtualization providers")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const vvvPath = options.path;
    const currentPlatform = platform();

    // Detect available providers (parallel detection for faster startup)
    const availableProviders = await detectAvailableProvidersAsync();
    const availableNames = new Set(availableProviders.map((p) => p.name));

    // Check if VVV exists to determine current provider
    const vvvExists = existsSync(join(vvvPath, "Vagrantfile"));
    const currentProvider = vvvExists ? getCurrentProvider(vvvPath) : null;

    // JSON output
    if (options.json) {
      const data = PROVIDERS.map((provider) => {
        let available: boolean | null;
        if (provider.platformOnly && provider.platformOnly !== currentPlatform) {
          available = null; // Not applicable on this platform
        } else {
          available = availableNames.has(provider.name);
        }

        const isCurrent =
          currentProvider === provider.name ||
          currentProvider === provider.vagrantName;

        return {
          name: provider.name,
          displayName: provider.displayName,
          vagrantName: provider.vagrantName,
          available,
          current: isCurrent,
          platformOnly: provider.platformOnly || null,
        };
      });

      console.log(JSON.stringify({ providers: data, currentProvider }, null, 2));
      return;
    }

    // Calculate column widths
    const providerWidth = 20;
    const availableWidth = 12;
    const currentWidth = 10;

    // Print header
    console.log("");
    if (vvvExists && currentProvider) {
      console.log(
        `${"Provider".padEnd(providerWidth)}${"Available".padEnd(availableWidth)}${"Current"}`
      );
      console.log("─".repeat(providerWidth + availableWidth + currentWidth));
    } else {
      console.log(`${"Provider".padEnd(providerWidth)}${"Available"}`);
      console.log("─".repeat(providerWidth + availableWidth));
    }

    // Print each provider
    for (const provider of PROVIDERS) {
      const name = provider.displayName;

      // Determine availability status
      let availableStatus: string;
      if (provider.platformOnly && provider.platformOnly !== currentPlatform) {
        // Not available on this platform
        const platformName =
          provider.platformOnly === "darwin"
            ? "macOS"
            : provider.platformOnly === "win32"
              ? "Windows"
              : "Linux";
        availableStatus = `N/A (${platformName} only)`;
      } else if (availableNames.has(provider.name)) {
        availableStatus = cli.format.success("Yes");
      } else {
        availableStatus = cli.format.error("No");
      }

      // Determine current status
      let currentStatus = "";
      if (vvvExists && currentProvider) {
        if (
          currentProvider === provider.name ||
          currentProvider === provider.vagrantName
        ) {
          currentStatus = cli.format.info("*");
        }
      }

      // Print row
      if (vvvExists && currentProvider) {
        console.log(
          `${name.padEnd(providerWidth)}${availableStatus.padEnd(availableWidth + (availableStatus.includes("\x1b") ? 10 : 0))}${currentStatus}`
        );
      } else {
        console.log(`${name.padEnd(providerWidth)}${availableStatus}`);
      }
    }

    console.log("");

    // Show note if VVV doesn't exist
    if (!vvvExists) {
      cli.info("No VVV installation found. Run 'vvvlocal install' to set up VVV.");
      console.log("");
    }
  });
