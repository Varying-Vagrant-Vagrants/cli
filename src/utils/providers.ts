import { spawnSync } from "child_process";
import { platform } from "os";
import { loadConfig } from "./config.js";

export interface Provider {
  name: string;
  command: string;
  args: string[];
  displayName: string;
  vagrantName: string;
  platformOnly?: "darwin" | "win32" | "linux";
}

export const PROVIDERS: Provider[] = [
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
    platformOnly: "darwin",
  },
  {
    name: "vmware",
    command: "vmrun",
    args: ["-T", "ws", "list"],
    displayName: "VMware",
    vagrantName: "vmware_desktop",
  },
  {
    name: "hyperv",
    command: "powershell",
    args: ["-Command", "(Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V).State"],
    displayName: "Hyper-V",
    vagrantName: "hyperv",
    platformOnly: "win32",
  },
];

/**
 * Get all providers that are relevant for the current platform
 */
export function getProvidersForPlatform(): Provider[] {
  const currentPlatform = platform();
  return PROVIDERS.filter(
    (p) => !p.platformOnly || p.platformOnly === currentPlatform
  );
}

/**
 * Detect which providers are available/installed on the current system
 */
export function detectAvailableProviders(): Provider[] {
  const available: Provider[] = [];
  const currentPlatform = platform();

  for (const provider of PROVIDERS) {
    // Skip providers not available on this platform
    if (provider.platformOnly && provider.platformOnly !== currentPlatform) {
      continue;
    }

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

/**
 * Check if a specific provider is available on the system
 */
export function isProviderAvailable(providerName: string): boolean {
  const available = detectAvailableProviders();
  return available.some((p) => p.name === providerName || p.vagrantName === providerName);
}

/**
 * Get the current provider configured for VVV
 */
export function getCurrentProvider(vvvPath: string): string | null {
  try {
    const config = loadConfig(vvvPath);
    return (config.vm_config?.provider as string) || "virtualbox";
  } catch {
    return null;
  }
}

/**
 * Find a provider by name or vagrant name
 */
export function findProvider(name: string): Provider | undefined {
  return PROVIDERS.find((p) => p.name === name || p.vagrantName === name);
}
