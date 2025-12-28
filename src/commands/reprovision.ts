import { Command } from "commander";
import { spawn, spawnSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const DEFAULT_VVV_PATH = join(homedir(), "vvv-local");

function isVVVRunning(vvvPath: string): boolean {
  const result = spawnSync("vagrant", ["status", "--machine-readable"], {
    cwd: vvvPath,
    encoding: "utf-8",
  });

  if (result.status !== 0) {
    return false;
  }

  // Look for state,running in the output
  const output = result.stdout || "";
  return output.includes(",state,running");
}

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

export const reprovisionCommand = new Command("reprovision")
  .alias("provision")
  .description("Reprovision VVV (starts VVV if not running)")
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

    const running = isVVVRunning(vvvPath);

    if (!running) {
      console.log("VVV is not running. Starting VVV first...");
      runVagrantCommand(["up"], vvvPath, (code) => {
        if (code !== 0) {
          console.error("Failed to start VVV");
          process.exit(code);
        }

        console.log("\nRunning provisioning...");
        runVagrantCommand(["provision"], vvvPath, (provisionCode) => {
          process.exit(provisionCode);
        });
      });
    } else {
      console.log("VVV is running. Starting provisioning...");
      runVagrantCommand(["provision"], vvvPath, (code) => {
        process.exit(code);
      });
    }
  });
