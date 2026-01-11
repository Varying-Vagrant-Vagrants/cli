import { Command } from "commander";
import { spawnSync, spawn } from "child_process";
import { existsSync } from "fs";
import { platform } from "os";
import { join } from "path";
import { cli, askQuestion, confirm, exitWithError, startTimer } from "../utils/cli.js";
import { DEFAULT_VVV_PATH, setVmProvider } from "../utils/config.js";
import { type Provider, detectAvailableProvidersAsync } from "../utils/providers.js";
import { findGoodhostsBinary, isSudoersConfigured } from "./hosts/sudoers.js";
import { displayTip } from "../utils/tips.js";

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

    // Step 1: Check if VVV already exists
    if (existsSync(targetPath)) {
      const vagrantfile = join(targetPath, "Vagrantfile");
      if (existsSync(vagrantfile)) {
        cli.warning(`VVV already exists at ${targetPath}`);
        console.log("");
        console.log("To reinstall, first destroy the existing installation:");
        console.log("  vvvlocal destroy");
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

    // Step 2: Check for Vagrant
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

    // Step 3: Check for providers (parallel detection)
    const availableProviders = await detectAvailableProvidersAsync();

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

    // Step 4: Select provider
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
      const provider = availableProviders[0];
      if (!provider) {
        exitWithError("No providers available.");
      }
      selectedProvider = provider;
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

      const provider = availableProviders[index];
      if (!provider) {
        exitWithError("Invalid selection.");
      }

      selectedProvider = provider;
    }

    cli.success(`Selected provider: ${selectedProvider.displayName}`);

    // Step 5: Check for git
    const gitCheck = spawnSync("git", ["--version"], { encoding: "utf-8" });
    if (gitCheck.status !== 0) {
      exitWithError("Git is not installed. Please install git first.");
    }

    // Step 6: Clone VVV
    console.log("");
    cli.info(`Installing VVV (${options.branch} branch)...`);

    const getElapsed = startTimer();
    const cloneResult = await cloneVVV(targetPath, options.branch);
    if (cloneResult !== 0) {
      exitWithError("Failed to clone VVV repository.");
    }

    cli.success("VVV cloned successfully");

    // Step 7: Install Vagrant plugins
    console.log("\nInstalling Vagrant plugins...");
    const pluginResult = spawnSync("vagrant", ["plugin", "install", "--local"], {
      cwd: targetPath,
      encoding: "utf-8",
      stdio: "inherit",
      timeout: 300000,
    });

    if (pluginResult.status === 0) {
      cli.success("Vagrant plugins installed");

      // Step 7b: Offer to configure passwordless hosts file access
      // Skip in CI since it requires sudo and user interaction
      if (!isSudoersConfigured() && process.env.CI === undefined) {
        const goodhostsBinary = findGoodhostsBinary(targetPath);
        if (goodhostsBinary) {
          console.log("");
          cli.info("vagrant-goodhosts plugin detected.");
          console.log("");
          console.log("VVV modifies your hosts file to map hostnames like 'mysite.test' to the VM.");
          console.log("By default, this requires entering your password each time you start VVV.");
          console.log("");

          const setupSudoers = await confirm(
            "Would you like to configure passwordless hosts file access?"
          );

          if (setupSudoers) {
            console.log("");
            cli.info("You can configure this now or later with: vvvlocal hosts sudoers");
            console.log("");

            // Generate sudoers content
            const group = platform() === "darwin" ? "%admin" : "%sudo";
            const sudoersContent = `${group} ALL=(root) NOPASSWD: ${goodhostsBinary}\n`;

            // Validate and install
            const validateResult = spawnSync("sudo", ["visudo", "-c", "-f", "-"], {
              input: sudoersContent,
              encoding: "utf-8",
              stdio: ["pipe", "pipe", "pipe"],
            });

            if (validateResult.status === 0) {
              const teeResult = spawnSync("sudo", ["tee", "/etc/sudoers.d/goodhosts"], {
                input: sudoersContent,
                encoding: "utf-8",
                stdio: ["pipe", "pipe", "pipe"],
              });

              if (teeResult.status === 0) {
                spawnSync("sudo", ["chmod", "440", "/etc/sudoers.d/goodhosts"], {
                  encoding: "utf-8",
                  stdio: ["pipe", "pipe", "pipe"],
                });
                cli.success("Passwordless hosts file access configured");
              } else {
                cli.warning("Could not configure sudoers. You can try later with: vvvlocal hosts sudoers");
              }
            } else {
              cli.warning("Sudoers validation failed. You can try later with: vvvlocal hosts sudoers");
            }
          } else {
            console.log("");
            cli.info("You can configure this later with: vvvlocal hosts sudoers");
          }
        }
      }
    } else {
      cli.warning("Failed to install Vagrant plugins. You may need to run 'vagrant plugin install --local' manually.");
    }

    // Step 8: Copy default config
    if (copyDefaultConfig(targetPath)) {
      cli.success("Default configuration created");

      // Step 8b: Set the provider in the config file
      try {
        setVmProvider(targetPath, selectedProvider.vagrantName);
        cli.success(`Provider set to ${selectedProvider.vagrantName} in config`);
      } catch (error) {
        cli.warning(`Could not set provider in config: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const elapsed = getElapsed();

    // Step 8: Show next steps
    console.log("");
    cli.success(`VVV installation complete! (${elapsed})`);
    console.log("");
    console.log("Next steps:");
    console.log(`  1. cd ${targetPath}`);
    console.log(`  2. vagrant up --provider=${selectedProvider.vagrantName}`);
    console.log("");
    console.log("Or simply run:");
    cli.bold(`  vvvlocal up`);
    console.log("");
    console.log("The first boot will take some time as it downloads and configures the VM.");
    displayTip("install", "success", targetPath);
  });
