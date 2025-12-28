import { Command } from "commander";
import { spawnSync, spawn } from "child_process";
import { existsSync } from "fs";
import { platform } from "os";
import { join } from "path";
import { cli, askQuestion, confirm, exitWithError } from "../utils/cli.js";
import { DEFAULT_VVV_PATH } from "../utils/config.js";

interface Provider {
  name: string;
  command: string;
  args: string[];
  displayName: string;
  vagrantName: string;
}

const PROVIDERS: Provider[] = [
  {
    name: "virtualbox",
    command: "VBoxManage",
    args: ["--version"],
    displayName: "VirtualBox",
    vagrantName: "virtualbox",
  },
  {
    name: "docker",
    command: "docker",
    args: ["--version"],
    displayName: "Docker",
    vagrantName: "docker",
  },
  {
    name: "parallels",
    command: "prlctl",
    args: ["--version"],
    displayName: "Parallels Desktop",
    vagrantName: "parallels",
  },
  {
    name: "vmware",
    command: "vmrun",
    args: ["-T", "ws", "list"],
    displayName: "VMware",
    vagrantName: "vmware_desktop",
  },
];

// Add Hyper-V only on Windows
if (platform() === "win32") {
  PROVIDERS.push({
    name: "hyperv",
    command: "powershell",
    args: ["-Command", "(Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V).State"],
    displayName: "Hyper-V",
    vagrantName: "hyperv",
  });
}

function isVagrantInstalled(): boolean {
  const result = spawnSync("vagrant", ["--version"], { encoding: "utf-8" });
  return result.status === 0;
}

function getVagrantVersion(): string | null {
  const result = spawnSync("vagrant", ["--version"], { encoding: "utf-8" });
  if (result.status === 0) {
    return result.stdout.trim().replace("Vagrant ", "");
  }
  return null;
}

function detectProviders(): Provider[] {
  const available: Provider[] = [];

  for (const provider of PROVIDERS) {
    const result = spawnSync(provider.command, provider.args, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Special handling for Hyper-V check
    if (provider.name === "hyperv") {
      if (result.status === 0 && result.stdout.includes("Enabled")) {
        available.push(provider);
      }
    } else if (result.status === 0) {
      available.push(provider);
    }
  }

  return available;
}

function cloneVVV(targetPath: string, branch: string): Promise<number> {
  return new Promise((resolve) => {
    console.log(`\nCloning VVV to ${targetPath}...`);
    const child = spawn(
      "git",
      ["clone", "-b", branch, "https://github.com/Varying-Vagrant-Vagrants/VVV.git", targetPath],
      { stdio: "inherit" }
    );

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

function copyDefaultConfig(vvvPath: string): boolean {
  const defaultConfig = join(vvvPath, "config", "default-config.yml");
  const configPath = join(vvvPath, "config", "config.yml");

  if (existsSync(configPath)) {
    return true; // Config already exists
  }

  if (!existsSync(defaultConfig)) {
    return false;
  }

  const result = spawnSync("cp", [defaultConfig, configPath], { encoding: "utf-8" });
  return result.status === 0;
}

export const installCommand = new Command("install")
  .description("Download and install VVV")
  .option("-p, --path <path>", "Path to install VVV", DEFAULT_VVV_PATH)
  .option("-b, --branch <branch>", "Git branch to clone", "stable")
  .option("--provider <provider>", "Vagrant provider to use (virtualbox, docker, parallels, vmware, hyperv)")
  .action(async (options) => {
    const targetPath = options.path;

    cli.bold("VVV Installation");
    console.log("");

    // Step 1: Check for Vagrant
    if (!isVagrantInstalled()) {
      cli.error("Vagrant is not installed.");
      console.log("");
      console.log("Please install Vagrant first:");
      console.log("  https://www.vagrantup.com/downloads");
      console.log("");
      console.log("After installing Vagrant, run this command again.");
      process.exit(1);
    }

    const vagrantVersion = getVagrantVersion();
    cli.success(`Vagrant ${vagrantVersion} found`);

    // Step 2: Check for providers
    const availableProviders = detectProviders();

    if (availableProviders.length === 0) {
      cli.error("No supported virtualization provider found.");
      console.log("");
      console.log("Please install one of the following:");
      console.log("  - VirtualBox: https://www.virtualbox.org/");
      console.log("  - Docker Desktop: https://www.docker.com/products/docker-desktop/");
      if (platform() === "darwin") {
        console.log("  - Parallels Desktop: https://www.parallels.com/");
      }
      console.log("  - VMware: https://www.vmware.com/");
      if (platform() === "win32") {
        console.log("  - Hyper-V: Enable in Windows Features");
      }
      console.log("");
      console.log("After installing a provider, run this command again.");
      process.exit(1);
    }

    // Step 3: Select provider
    let selectedProvider: Provider;

    if (options.provider) {
      // User specified a provider
      const found = availableProviders.find(
        (p) => p.name === options.provider || p.vagrantName === options.provider
      );
      if (!found) {
        const available = availableProviders.map((p) => p.name).join(", ");
        exitWithError(
          `Provider '${options.provider}' is not available.\nAvailable providers: ${available}`
        );
      }
      selectedProvider = found;
    } else if (availableProviders.length === 1) {
      // Only one provider available
      selectedProvider = availableProviders[0];
      cli.success(`Using ${selectedProvider.displayName} as provider`);
    } else {
      // Multiple providers - ask user to choose
      console.log("");
      cli.info("Multiple providers available:");
      availableProviders.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.displayName}`);
      });
      console.log("");

      const choice = await askQuestion(
        `Select provider (1-${availableProviders.length})`,
        "1"
      );
      const index = parseInt(choice, 10) - 1;

      if (isNaN(index) || index < 0 || index >= availableProviders.length) {
        exitWithError("Invalid selection.");
      }

      selectedProvider = availableProviders[index];
    }

    cli.success(`Selected provider: ${selectedProvider.displayName}`);

    // Step 4: Check if VVV already exists
    if (existsSync(targetPath)) {
      const vagrantfile = join(targetPath, "Vagrantfile");
      if (existsSync(vagrantfile)) {
        cli.warning(`VVV already exists at ${targetPath}`);
        console.log("");
        console.log("To reinstall, please remove the existing installation first:");
        console.log(`  rm -rf ${targetPath}`);
        console.log("");
        console.log("Or specify a different path:");
        console.log(`  vvvlocal install --path ~/my-vvv`);
        process.exit(1);
      } else {
        // Directory exists but doesn't look like VVV
        cli.warning(`Directory ${targetPath} already exists but doesn't appear to be VVV.`);
        const proceed = await confirm("Do you want to continue anyway?");
        if (!proceed) {
          console.log("Installation cancelled.");
          process.exit(0);
        }
      }
    }

    // Step 5: Check for git
    const gitCheck = spawnSync("git", ["--version"], { encoding: "utf-8" });
    if (gitCheck.status !== 0) {
      exitWithError("Git is not installed. Please install git first.");
    }

    // Step 6: Clone VVV
    console.log("");
    cli.info(`Installing VVV (${options.branch} branch)...`);

    const cloneResult = await cloneVVV(targetPath, options.branch);
    if (cloneResult !== 0) {
      exitWithError("Failed to clone VVV repository.");
    }

    cli.success("VVV cloned successfully");

    // Step 7: Copy default config
    if (copyDefaultConfig(targetPath)) {
      cli.success("Default configuration created");
    }

    // Step 8: Show next steps
    console.log("");
    cli.success("VVV installation complete!");
    console.log("");
    console.log("Next steps:");
    console.log(`  1. cd ${targetPath}`);
    console.log(`  2. vagrant up --provider=${selectedProvider.vagrantName}`);
    console.log("");
    console.log("Or simply run:");
    cli.bold(`  vvvlocal up`);
    console.log("");
    console.log("The first boot will take some time as it downloads and configures the VM.");
  });
