import { Command } from "commander";
import { spawnSync, spawn } from "child_process";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, confirm, cli, exitWithError } from "../utils/cli.js";
import { vagrantRun } from "../utils/vagrant.js";

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

export const upgradeCommand = new Command("upgrade")
  .alias("update")
  .description("Upgrade VVV to the latest version")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-y, --yes", "Skip confirmation prompts")
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    // Check if it's a git repository
    const gitCheck = spawnSync("git", ["rev-parse", "--git-dir"], {
      cwd: vvvPath,
      encoding: "utf-8",
    });

    if (gitCheck.status !== 0) {
      exitWithError("VVV installation is not a git repository.\nUpgrade requires VVV to be installed via git clone.");
    }

    const currentBranch = getCurrentBranch(vvvPath);

    if (!currentBranch) {
      exitWithError("Failed to determine current git branch.");
    }

    console.log(`Current branch: ${currentBranch}`);

    // Handle branch switching
    let targetBranch = currentBranch;

    if (currentBranch === "master") {
      console.log("The 'master' branch has been renamed to 'stable'.");
      if (!switchBranch(vvvPath, "stable")) {
        exitWithError("Failed to switch to stable branch.");
      }
      targetBranch = "stable";
    } else if (currentBranch !== "stable" && currentBranch !== "develop") {
      cli.warning(`\nWarning: You are on the '${currentBranch}' branch.`);
      console.log("This is not a standard VVV branch (stable or develop).");

      if (!options.yes) {
        const confirmed = await confirm("\nWould you like to switch to 'develop' and continue?");

        if (confirmed) {
          if (!switchBranch(vvvPath, "develop")) {
            exitWithError("Failed to switch to develop branch.");
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
    console.log("Halting VVV...");
    const haltCode = await vagrantRun(["halt"], vvvPath);
    if (haltCode !== 0) {
      cli.warning("Failed to halt VVV. Continuing anyway...");
    }

    // Step 2: Git pull
    const pullSuccess = await gitPull(vvvPath);
    if (!pullSuccess) {
      exitWithError("Failed to pull latest changes.");
    }

    // Step 3: Reprovision
    console.log("Reprovisioning VVV...");
    const provisionCode = await vagrantRun(["up", "--provision"], vvvPath);
    if (provisionCode !== 0) {
      exitWithError("Provisioning failed.");
    }

    cli.success("\nVVV upgrade complete!");
  });
