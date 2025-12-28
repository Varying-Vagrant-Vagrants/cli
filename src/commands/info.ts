import { Command } from "commander";
import { spawnSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { arch, platform, release } from "os";
import React from "react";
import { render } from "ink";
import { loadConfig, DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists } from "../utils/cli.js";
import { SystemInfo } from "../components/SystemInfo.js";

function getVVVVersion(vvvPath: string): string {
  const versionFile = join(vvvPath, "version");
  if (existsSync(versionFile)) {
    return readFileSync(versionFile, "utf-8").trim();
  }
  return "unknown";
}

function isGitInstall(vvvPath: string): boolean {
  return existsSync(join(vvvPath, ".git"));
}

function getGitBranch(vvvPath: string): string | null {
  if (!isGitInstall(vvvPath)) {
    return null;
  }
  const result = spawnSync("git", ["branch", "--show-current"], {
    cwd: vvvPath,
    encoding: "utf-8",
  });
  if (result.status === 0) {
    return result.stdout.trim();
  }
  return null;
}

async function getLatestVVVVersion(): Promise<string | null> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/Varying-Vagrant-Vagrants/VVV/releases/latest"
    );
    if (response.ok) {
      const data = await response.json() as { tag_name?: string };
      return data.tag_name?.replace(/^v/, "") || null;
    }
  } catch {
    // Network error, ignore
  }
  return null;
}

function getVagrantVersion(): string {
  const result = spawnSync("vagrant", ["--version"], { encoding: "utf-8" });
  if (result.status === 0) {
    // Output is like "Vagrant 2.4.1"
    return result.stdout.trim().replace("Vagrant ", "");
  }
  return "not installed";
}

function getProvider(vvvPath: string): string {
  try {
    const config = loadConfig(vvvPath);
    return config.vm_config?.provider as string || "virtualbox";
  } catch {
    return "unknown";
  }
}

function getArchitecture(): string {
  const cpuArch = arch();
  if (cpuArch === "arm64") {
    return "ARM (Apple Silicon)";
  } else if (cpuArch === "x64") {
    return "Intel (x86_64)";
  }
  return cpuArch;
}

function getOSName(): string {
  const plat = platform();
  const rel = release();

  if (plat === "darwin") {
    // Parse macOS version from Darwin kernel version
    // Darwin 23.x = macOS 14 Sonoma, 24.x = macOS 15 Sequoia, etc.
    const majorVersion = parseInt(rel.split(".")[0] || "0");
    const macVersion = majorVersion - 9; // Darwin 20 = macOS 11
    if (macVersion >= 15) {
      return `macOS ${macVersion} Sequoia`;
    } else if (macVersion >= 14) {
      return `macOS ${macVersion} Sonoma`;
    } else if (macVersion >= 13) {
      return `macOS ${macVersion} Ventura`;
    } else if (macVersion >= 12) {
      return `macOS ${macVersion} Monterey`;
    } else if (macVersion >= 11) {
      return `macOS ${macVersion} Big Sur`;
    }
    return `macOS ${macVersion}`;
  } else if (plat === "win32") {
    // Windows version detection
    const build = parseInt(rel.split(".")[2] || "0");
    if (build >= 22000) {
      return "Windows 11";
    }
    return "Windows 10";
  } else if (plat === "linux") {
    return `Linux ${rel}`;
  }
  return `${plat} ${rel}`;
}

export const infoCommand = new Command("info")
  .description("Show VVV and system information")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    const gitInstall = isGitInstall(vvvPath);
    const gitBranch = getGitBranch(vvvPath);
    const vvvVersion = getVVVVersion(vvvPath);
    const latestVersion = await getLatestVVVVersion();

    const info = {
      vvvVersion,
      latestVersion,
      vagrantVersion: getVagrantVersion(),
      provider: getProvider(vvvPath),
      arch: getArchitecture(),
      os: getOSName(),
      vvvPath,
      gitInstall,
      gitBranch,
    };

    if (options.json) {
      console.log(JSON.stringify(info, null, 2));
      return;
    }

    render(React.createElement(SystemInfo, info));
  });
