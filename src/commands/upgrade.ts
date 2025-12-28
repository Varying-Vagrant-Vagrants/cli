import { Command } from "commander";
import { spawnSync, spawn } from "child_process";
import { createInterface } from "readline";
import { vvvExists, DEFAULT_VVV_PATH } from "../utils/config.js";

function getCurrentBranch(vvvPath: string): string | null {
  const result = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: vvvPath,
    encoding: "utf-8",
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
}

function switchBranch(vvvPath: string, branch: string): boolean {
  console.log(`Switching to ${branch} branch...`);
  const result = spawnSync("git", ["checkout", branch], {
    cwd: vvvPath,
    encoding: "utf-8",
    stdio: "inherit",
  });

  return result.status === 0;
}

function haltVVV(vvvPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log("Halting VVV...");
    const child = spawn("vagrant", ["halt"], {
      cwd: vvvPath,
      stdio: "inherit",
    });

    child.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

function gitPull(vvvPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log("Pulling latest changes...");
    const child = spawn("git", ["pull"], {
      cwd: vvvPath,
      stdio: "inherit",
    });

    child.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

function reprovision(vvvPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log("Reprovisioning VVV...");
    const child = spawn("vagrant", ["up", "--provision"], {
      cwd: vvvPath,
      stdio: "inherit",
    });

    child.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

function askQuestion(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

export const upgradeCommand = new Command("upgrade")
  .alias("update")
  .description("Upgrade VVV to the latest version")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-y, --yes", "Skip confirmation prompts")
  .action(async (options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      process.exit(1);
    }

    // Check if it's a git repository
    const gitCheck = spawnSync("git", ["rev-parse", "--git-dir"], {
      cwd: vvvPath,
      encoding: "utf-8",
    });

    if (gitCheck.status !== 0) {
      console.error("VVV installation is not a git repository.");
      console.error("Upgrade requires VVV to be installed via git clone.");
      process.exit(1);
    }

    const currentBranch = getCurrentBranch(vvvPath);

    if (!currentBranch) {
      console.error("Failed to determine current git branch.");
      process.exit(1);
    }

    console.log(`Current branch: ${currentBranch}`);

    // Handle branch switching
    let targetBranch = currentBranch;

    if (currentBranch === "master") {
      console.log("The 'master' branch has been renamed to 'stable'.");
      if (!switchBranch(vvvPath, "stable")) {
        console.error("Failed to switch to stable branch.");
        process.exit(1);
      }
      targetBranch = "stable";
    } else if (currentBranch !== "stable" && currentBranch !== "develop") {
      console.warn(`\nWarning: You are on the '${currentBranch}' branch.`);
      console.warn("This is not a standard VVV branch (stable or develop).");

      if (!options.yes) {
        const answer = await askQuestion(
          "\nWould you like to switch to 'develop' and continue? (y/n): "
        );

        if (answer === "y" || answer === "yes") {
          if (!switchBranch(vvvPath, "develop")) {
            console.error("Failed to switch to develop branch.");
            process.exit(1);
          }
          targetBranch = "develop";
        } else {
          console.log("Upgrade aborted.");
          process.exit(0);
        }
      } else {
        console.log("Skipping branch switch due to --yes flag.");
      }
    }

    console.log(`\nUpgrading VVV on '${targetBranch}' branch...\n`);

    // Step 1: Halt VVV
    const haltSuccess = await haltVVV(vvvPath);
    if (!haltSuccess) {
      console.error("Failed to halt VVV. Continuing anyway...");
    }

    // Step 2: Git pull
    const pullSuccess = await gitPull(vvvPath);
    if (!pullSuccess) {
      console.error("Failed to pull latest changes.");
      process.exit(1);
    }

    // Step 3: Reprovision
    const provisionSuccess = await reprovision(vvvPath);
    if (!provisionSuccess) {
      console.error("Provisioning failed.");
      process.exit(1);
    }

    console.log("\nVVV upgrade complete!");
  });
