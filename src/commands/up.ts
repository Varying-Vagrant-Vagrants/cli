import { Command } from "commander";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const DEFAULT_VVV_PATH = join(homedir(), "vvv-local");

export const upCommand = new Command("up")
  .alias("start")
  .description("Start VVV and provision if needed")
  .option("-p, --provision", "Force provisioning")
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

    const args = ["up"];
    if (options.provision) {
      args.push("--provision");
    }

    console.log(`Starting VVV${options.provision ? " with provisioning" : ""}...`);

    const vagrant = spawn("vagrant", args, {
      cwd: vvvPath,
      stdio: "inherit",
    });

    vagrant.on("close", (code) => {
      process.exit(code ?? 0);
    });
  });
