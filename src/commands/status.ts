import { Command } from "commander";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const DEFAULT_VVV_PATH = join(homedir(), "vvv-local");

export const statusCommand = new Command("status")
  .description("Show VVV status")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action(async (options) => {
    const vvvPath = options.path;

    // Check if VVV directory exists
    if (!existsSync(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      console.error("Run 'vvvlocal install' to install VVV, or use --path to specify location");
      process.exit(1);
    }

    // Check if vagrant is available
    const vagrantCheck = Bun.spawnSync(["which", "vagrant"]);
    if (vagrantCheck.exitCode !== 0) {
      console.error("Vagrant is not installed or not in PATH");
      console.error("Run 'vvvlocal install' to install prerequisites");
      process.exit(1);
    }

    // Run vagrant status in VVV directory
    const vagrant = spawn("vagrant", ["status"], {
      cwd: vvvPath,
      stdio: "inherit",
    });

    vagrant.on("close", (code) => {
      process.exit(code ?? 0);
    });
  });
