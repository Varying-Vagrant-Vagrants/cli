import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, cli, startTimer, isVvvRunning } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRun } from "../utils/vagrant.js";
import { getCurrentProvider } from "../utils/providers.js";
import { checkPortConflicts, VVV_PORTS } from "../utils/ports.js";

export const upCommand = new Command("up")
  .alias("start")
  .description("Start VVV and provision if needed")
  .option("-p, --provision", "Force provisioning")
  .option("--path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    // Check for port conflicts when using Docker provider
    // Skip check if VVV is already running (it's using those ports)
    const provider = getCurrentProvider(vvvPath);
    const alreadyRunning = isVvvRunning(vvvPath);
    if (provider === "docker" && !alreadyRunning) {
      const conflicts = checkPortConflicts(VVV_PORTS);
      if (conflicts.length > 0) {
        cli.error("Port conflicts detected - VVV cannot start");
        console.log("");
        for (const conflict of conflicts) {
          console.log(`  Port ${conflict.port} (${conflict.service}): ${conflict.process}`);
          console.log(cli.format.dim(`    → ${conflict.suggestion}`));
        }
        console.log("");
        console.log("Resolve conflicts and try again, or run 'vvvlocal doctor' for details.");
        process.exit(1);
      }
    }

    const args = ["up"];
    if (options.provision) {
      args.push("--provision");
    }

    cli.info(`Starting VVV${options.provision ? " with provisioning" : ""}...`);
    console.log("");

    const getElapsed = startTimer();
    const code = await vagrantRun(args, vvvPath);
    const elapsed = getElapsed();

    console.log("");
    if (code === 0) {
      cli.success(`VVV started successfully (${elapsed})`);
    } else {
      cli.error(`Failed to start VVV (${elapsed})`);
    }
    process.exit(code);
  });
