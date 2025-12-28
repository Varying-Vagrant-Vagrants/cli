import { Command } from "commander";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const DEFAULT_VVV_PATH = join(homedir(), "vvv-local");

export const stopCommand = new Command("stop")
  .alias("halt")
  .description("Stop VVV")
  .option("--path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action((options) => {
    const vvvPath = options.path;

    if (!existsSync(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      process.exit(1);
    }

    const vagrantCheck = Bun.spawnSync(["which", "vagrant"]);
    if (vagrantCheck.exitCode !== 0) {
      console.error("Vagrant is not installed or not in PATH");
      process.exit(1);
    }

    console.log("Stopping VVV...");

    const vagrant = spawn("vagrant", ["halt"], {
      cwd: vvvPath,
      stdio: "inherit",
    });

    vagrant.on("close", (code) => {
      process.exit(code ?? 0);
    });
  });
