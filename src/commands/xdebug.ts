import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, ensureVvvRunning, cli, exitWithError } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantSsh, vagrantSshSync } from "../utils/vagrant.js";

/**
 * Get the currently active debug extension.
 */
function getActiveDebugExtension(vvvPath: string): string {
  const result = vagrantSshSync("php -m 2>/dev/null", vvvPath);

  if (result.status !== 0) {
    return "unknown";
  }

  const modules = result.stdout.toLowerCase();

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

export const xdebugCommand = new Command("xdebug")
  .description("Quick xdebug on/off shortcuts")
  .argument("[action]", "Action: on, off, or status (default: status)")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action(async (action, options) => {
    const vvvPath = options.path;
    const cmd = (action || "status").toLowerCase();

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();
    ensureVvvRunning(vvvPath);

    // Status command
    if (cmd === "status") {
      const current = getActiveDebugExtension(vvvPath);
      const isXdebugOn = current === "xdebug";

      if (options.json) {
        console.log(JSON.stringify({ current, xdebugEnabled: isXdebugOn }, null, 2));
        return;
      }

      console.log("");
      if (isXdebugOn) {
        cli.success("Xdebug is ON");
      } else if (current === "none") {
        cli.info("Xdebug is OFF (no debug extension active)");
      } else {
        cli.info(`Xdebug is OFF (${current} is active)`);
      }
      console.log("");
      return;
    }

    // On command - enable xdebug
    if (cmd === "on") {
      if (!options.json) {
        cli.info("Enabling Xdebug...");
      }

      const code = await vagrantSsh("switch_php_debugmod xdebug", vvvPath);

      if (options.json) {
        console.log(JSON.stringify({ success: code === 0, action: "on", extension: "xdebug" }, null, 2));
        process.exit(code);
      }

      if (code === 0) {
        cli.success("Xdebug enabled.");
      } else {
        cli.error("Failed to enable Xdebug.");
        process.exit(code);
      }
      return;
    }

    // Off command - disable all debug extensions
    if (cmd === "off") {
      if (!options.json) {
        cli.info("Disabling debug extensions...");
      }

      const code = await vagrantSsh("switch_php_debugmod none", vvvPath);

      if (options.json) {
        console.log(JSON.stringify({ success: code === 0, action: "off", extension: "none" }, null, 2));
        process.exit(code);
      }

      if (code === 0) {
        cli.success("Debug extensions disabled.");
      } else {
        cli.error("Failed to disable debug extensions.");
        process.exit(code);
      }
      return;
    }

    // Unknown action
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: `Unknown action: ${cmd}` }, null, 2));
      process.exit(1);
    }
    exitWithError(`Unknown action: ${cmd}\nUsage: vvvlocal xdebug [on|off|status]`);
  });
