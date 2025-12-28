import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, ensureVvvRunning, cli } from "../../utils/cli.js";
import { ensureVagrantInstalled, vagrantSshSync } from "../../utils/vagrant.js";

interface PhpVersion {
  version: string;
  installed: boolean;
  default: boolean;
  available: boolean;
}

// PHP versions available from Ondrej PPA
const AVAILABLE_VERSIONS = [
  "7.0",
  "7.1",
  "7.2",
  "7.3",
  "7.4",
  "8.0",
  "8.1",
  "8.2",
  "8.3",
  "8.4",
];

function getInstalledPhpVersions(vvvPath: string): Set<string> {
  // Check which PHP versions are installed by looking at /etc/php directories
  const result = vagrantSshSync(
    "ls -1 /etc/php/ 2>/dev/null | grep -E '^[0-9]+\\.[0-9]+$'",
    vvvPath
  );

  if (result.status !== 0) {
    return new Set();
  }

  const versions = result.stdout
    .trim()
    .split("\n")
    .map((v) => v.trim())
    .filter((v) => v !== "");

  return new Set(versions);
}

function getDefaultPhpVersion(vvvPath: string): string | null {
  // Get the default PHP version
  const result = vagrantSshSync(
    "php -v 2>/dev/null | head -1 | grep -oE '[0-9]+\\.[0-9]+'",
    vvvPath
  );

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim() || null;
}

export const listCommand = new Command("list")
  .description("List available and installed PHP versions")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();
    ensureVvvRunning(vvvPath);

    const installedVersions = getInstalledPhpVersions(vvvPath);
    const defaultVersion = getDefaultPhpVersion(vvvPath);

    const versions: PhpVersion[] = AVAILABLE_VERSIONS.map((version) => ({
      version,
      installed: installedVersions.has(version),
      default: version === defaultVersion,
      available: true, // All versions in AVAILABLE_VERSIONS are available from Ondrej PPA
    }));

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            versions: versions.map((v) => ({
              version: v.version,
              installed: v.installed,
              default: v.default,
            })),
            default: defaultVersion,
          },
          null,
          2
        )
      );
      return;
    }

    // Display table
    const versionWidth = 10;
    const statusWidth = 14;
    const defaultWidth = 10;

    console.log("");
    console.log(
      `${"Version".padEnd(versionWidth)}${"Status".padEnd(statusWidth)}${"Default"}`
    );
    console.log("─".repeat(versionWidth + statusWidth + defaultWidth));

    for (const v of versions) {
      const status = v.installed
        ? cli.format.success("installed")
        : cli.format.dim("available");
      const defaultMarker = v.default ? cli.format.info("*") : "";
      console.log(
        `${v.version.padEnd(versionWidth)}${status.padEnd(statusWidth + (v.installed ? 10 : 10))}${defaultMarker}`
      );
    }

    console.log("");
  });
