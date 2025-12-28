import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, ensureVvvRunning, cli } from "../../utils/cli.js";
import { ensureVagrantInstalled, vagrantSshSync } from "../../utils/vagrant.js";

interface DebugExtension {
  name: string;
  displayName: string;
  active: boolean;
  available: boolean;
}

const KNOWN_EXTENSIONS = [
  { name: "xdebug", displayName: "Xdebug" },
  { name: "pcov", displayName: "PCOV" },
  { name: "tideways", displayName: "Tideways" },
  { name: "none", displayName: "None" },
];

function getActiveDebugExtension(vvvPath: string): string {
  // Query PHP for loaded debug extensions
  const result = vagrantSshSync("php -m 2>/dev/null", vvvPath);

  if (result.status !== 0) {
    return "unknown";
  }

  const modules = result.stdout.toLowerCase();

  // Check which debug extension is currently loaded
  if (modules.includes("xdebug")) {
    return "xdebug";
  }
  if (modules.includes("pcov")) {
    return "pcov";
  }
  if (modules.includes("tideways")) {
    return "tideways";
  }

  return "none";
}

function getAvailableExtensions(vvvPath: string): Set<string> {
  // Check which extensions are available (installed but not necessarily active)
  // xdebug, pcov, and none are always available in VVV
  const available = new Set(["xdebug", "pcov", "none"]);

  // Check if tideways is installed
  const result = vagrantSshSync(
    "ls /etc/php/*/mods-available/tideways*.ini 2>/dev/null | head -1",
    vvvPath
  );

  if (result.status === 0 && result.stdout.trim()) {
    available.add("tideways");
  }

  return available;
}

export const listCommand = new Command("list")
  .description("List available PHP debug extensions")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();
    ensureVvvRunning(vvvPath);

    const activeExtension = getActiveDebugExtension(vvvPath);
    const availableExtensions = getAvailableExtensions(vvvPath);

    const extensions: DebugExtension[] = KNOWN_EXTENSIONS.filter(
      (ext) => ext.name === "none" || availableExtensions.has(ext.name)
    ).map((ext) => ({
      name: ext.name,
      displayName: ext.displayName,
      active: ext.name === activeExtension,
      available: availableExtensions.has(ext.name) || ext.name === "none",
    }));

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            extensions: extensions.map((e) => ({
              name: e.name,
              active: e.active,
            })),
            current: activeExtension,
          },
          null,
          2
        )
      );
      return;
    }

    // Display table
    const extWidth = 14;
    const statusWidth = 12;

    console.log("");
    console.log(`${"Extension".padEnd(extWidth)}${"Status"}`);
    console.log("─".repeat(extWidth + statusWidth));

    for (const ext of extensions) {
      const status = ext.active
        ? cli.format.success("active")
        : cli.format.dim("available");
      console.log(`${ext.displayName.padEnd(extWidth)}${status}`);
    }

    console.log("");
  });
