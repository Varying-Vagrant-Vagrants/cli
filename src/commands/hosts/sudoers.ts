import { Command } from "commander";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { platform, arch } from "os";
import { spawnSync } from "child_process";
import { DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, cli, exitWithError, askQuestion } from "../../utils/cli.js";

const SUDOERS_FILE = "/etc/sudoers.d/goodhosts";

/**
 * Find the goodhosts CLI binary in the VVV vagrant plugins directory.
 */
export function findGoodhostsBinary(vvvPath: string): string | null {
  const pluginsDir = join(vvvPath, ".vagrant", "plugins", "gems");

  if (!existsSync(pluginsDir)) {
    return null;
  }

  // Find Ruby version directories (e.g., "3.1.2")
  let rubyVersionDirs: string[];
  try {
    rubyVersionDirs = readdirSync(pluginsDir).filter((d) =>
      /^\d+\.\d+\.\d+$/.test(d)
    );
  } catch {
    return null;
  }

  // Determine expected binary name based on OS and architecture
  // Note: goodhosts uses "osx" not "darwin" for macOS
  const os = platform() === "darwin" ? "osx" : "linux";
  const cpuArch = arch() === "arm64" ? "arm64" : "amd64";
  const binaryName = `cli_${cpuArch}_${os}`;

  // Search for the binary
  for (const rubyVersion of rubyVersionDirs) {
    const gemsDir = join(pluginsDir, rubyVersion, "gems");

    if (!existsSync(gemsDir)) continue;

    let gemDirs: string[];
    try {
      gemDirs = readdirSync(gemsDir).filter((d) =>
        d.startsWith("vagrant-goodhosts-")
      );
    } catch {
      continue;
    }

    for (const gemDir of gemDirs) {
      const bundleDir = join(
        gemsDir,
        gemDir,
        "lib",
        "vagrant-goodhosts",
        "bundle"
      );

      if (!existsSync(bundleDir)) continue;

      const binaryPath = join(bundleDir, binaryName);
      if (existsSync(binaryPath)) {
        return binaryPath;
      }
    }
  }

  return null;
}

/**
 * Generate sudoers content for the goodhosts binary.
 */
function generateSudoersContent(binaryPath: string): string {
  // macOS uses %admin group, Linux uses %sudo
  const group = platform() === "darwin" ? "%admin" : "%sudo";
  return `${group} ALL=(root) NOPASSWD: ${binaryPath}\n`;
}

/**
 * Check if sudoers is already configured.
 */
export function isSudoersConfigured(): boolean {
  return existsSync(SUDOERS_FILE);
}

/**
 * Get the current configured binary path from sudoers file.
 */
function getCurrentConfiguredPath(): string | null {
  if (!isSudoersConfigured()) return null;

  const result = spawnSync("sudo", ["cat", SUDOERS_FILE], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.status !== 0) return null;

  // Extract path from: %admin ALL=(root) NOPASSWD: /path/to/binary
  const match = result.stdout.match(/NOPASSWD:\s*(.+)$/m);
  return match?.[1]?.trim() || null;
}

/**
 * Validate sudoers syntax before installing.
 */
function validateSudoersContent(content: string): boolean {
  // Write to a temp file and validate with visudo -c
  const result = spawnSync("sudo", ["visudo", "-c", "-f", "-"], {
    input: content,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  return result.status === 0;
}

/**
 * Install the sudoers file.
 */
function installSudoersFile(content: string): boolean {
  // Use tee to write the file with sudo
  const teeResult = spawnSync("sudo", ["tee", SUDOERS_FILE], {
    input: content,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (teeResult.status !== 0) {
    return false;
  }

  // Set correct permissions (440)
  const chmodResult = spawnSync("sudo", ["chmod", "440", SUDOERS_FILE], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  return chmodResult.status === 0;
}

/**
 * Remove the sudoers file.
 */
function removeSudoersFile(): boolean {
  const result = spawnSync("sudo", ["rm", "-f", SUDOERS_FILE], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  return result.status === 0;
}

export const sudoersCommand = new Command("sudoers")
  .description("Configure passwordless hosts file access for vagrant-goodhosts")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--remove", "Remove the sudoers configuration")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    // Handle removal
    if (options.remove) {
      if (!isSudoersConfigured()) {
        cli.info("Sudoers configuration not found. Nothing to remove.");
        return;
      }

      if (!options.yes) {
        const confirm = await askQuestion(
          "Remove passwordless hosts file access configuration? [y/N]"
        );
        if (confirm.toLowerCase() !== "y") {
          cli.info("Cancelled.");
          return;
        }
      }

      console.log("");
      cli.info("Removing sudoers configuration...");

      if (removeSudoersFile()) {
        cli.success("Sudoers configuration removed.");
        console.log("");
        console.log("Vagrant will now prompt for password when managing hosts.");
      } else {
        exitWithError("Failed to remove sudoers configuration.");
      }
      return;
    }

    // Find the goodhosts binary
    const binaryPath = findGoodhostsBinary(vvvPath);

    if (!binaryPath) {
      exitWithError(
        "Could not find vagrant-goodhosts plugin binary.",
        "Run 'vagrant plugin install vagrant-goodhosts --local' in your VVV directory."
      );
    }

    // Check if already configured
    const currentPath = getCurrentConfiguredPath();
    if (currentPath === binaryPath) {
      cli.success("Passwordless hosts file access is already configured.");
      console.log("");
      console.log(`Binary: ${binaryPath}`);
      return;
    }

    if (currentPath && currentPath !== binaryPath) {
      cli.warning("Existing configuration found with different path.");
      console.log(`  Current: ${currentPath}`);
      console.log(`  New:     ${binaryPath}`);
      console.log("");
    }

    // Generate sudoers content
    const sudoersContent = generateSudoersContent(binaryPath);
    const group = platform() === "darwin" ? "%admin" : "%sudo";

    // Show what will be configured
    console.log("");
    cli.bold("Configuring passwordless hosts file access for vagrant-goodhosts");
    console.log("");
    console.log("This will create /etc/sudoers.d/goodhosts allowing the goodhosts CLI");
    console.log("to modify /etc/hosts without a password prompt.");
    console.log("");
    console.log(`Binary: ${cli.format.dim(binaryPath)}`);
    console.log("");
    console.log("Sudoers rule:");
    console.log(`  ${cli.format.dim(`${group} ALL=(root) NOPASSWD: ${binaryPath}`)}`);
    console.log("");

    // Confirm
    if (!options.yes) {
      const confirm = await askQuestion("Continue? [y/N]");
      if (confirm.toLowerCase() !== "y") {
        cli.info("Cancelled.");
        return;
      }
    }

    console.log("");

    // Validate sudoers syntax
    cli.info("Validating sudoers syntax...");
    if (!validateSudoersContent(sudoersContent)) {
      exitWithError(
        "Sudoers syntax validation failed.",
        "This is unexpected. Please report this issue."
      );
    }

    // Install
    cli.info("Installing sudoers configuration...");
    if (!installSudoersFile(sudoersContent)) {
      exitWithError("Failed to install sudoers configuration.");
    }

    console.log("");
    cli.success("Sudoers configured successfully!");
    console.log("");
    console.log("Vagrant will no longer prompt for password when managing hosts.");
  });
