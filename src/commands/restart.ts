import { Command } from "commander";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const DEFAULT_VVV_PATH = join(homedir(), "vvv-local");

function runVagrantCommand(
  command: string[],
  vvvPath: string,
  onComplete: (code: number) => void
): void {
  const vagrant = spawn("vagrant", command, {
    cwd: vvvPath,
    stdio: "inherit",
  });

  vagrant.on("close", (code) => {
    onComplete(code ?? 1);
  });
}

export const restartCommand = new Command("restart")
  .alias("reload")
  .description("Restart VVV (halt then up)")
  .option("--path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action((options) => {
    const vvvPath = options.path;

    if (!existsSync(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      console.error("Run 'vvvlocal install' to install VVV");
      process.exit(1);
    }

    const vagrantCheck = Bun.spawnSync(["which", "vagrant"]);
    if (vagrantCheck.exitCode !== 0) {
      console.error("Vagrant is not installed or not in PATH");
      console.error("Run 'vvvlocal install' to install prerequisites");
      process.exit(1);
    }

    console.log("Stopping VVV...");
    runVagrantCommand(["halt"], vvvPath, (haltCode) => {
      if (haltCode !== 0) {
        console.error("Failed to stop VVV");
        process.exit(haltCode);
      }

      console.log("\nStarting VVV...");
      runVagrantCommand(["up"], vvvPath, (upCode) => {
        process.exit(upCode);
      });
    });
  });
