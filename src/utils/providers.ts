import { spawnSync, spawn } from "child_process";
import { platform } from "os";
import { loadConfig } from "./config.js";
import { verbose } from "./cli.js";

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
 * Check if a single provider is available (async with timeout)
 */
async function checkProviderAsync(provider: Provider, timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(provider.command, provider.args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill();
        verbose(`Provider check timed out: ${provider.name}`);
        resolve(false);
      }
    }, timeout);

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.on("close", (code) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);

      // Special handling for Hyper-V check
      if (provider.name === "hyperv") {
        resolve(code === 0 && stdout.includes("Enabled"));
      } else {
        resolve(code === 0);
      }
    });

    child.on("error", () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve(false);
    });
  });
}

/**
 * Detect which providers are available/installed on the current system (async, parallel)
 */
export async function detectAvailableProvidersAsync(): Promise<Provider[]> {
  const currentPlatform = platform();
  const startTime = Date.now();

  // Filter providers for current platform
  const providersToCheck = PROVIDERS.filter(
    (p) => !p.platformOnly || p.platformOnly === currentPlatform
  );

  verbose(`Checking ${providersToCheck.length} providers in parallel...`);

  // Check all providers in parallel
  const results = await Promise.all(
    providersToCheck.map(async (provider) => {
      const available = await checkProviderAsync(provider);
      verbose(`Provider ${provider.name}: ${available ? "available" : "not found"}`);
      return { provider, available };
    })
  );

  const available = results
    .filter((r) => r.available)
    .map((r) => r.provider);

  verbose(`Provider detection completed in ${Date.now() - startTime}ms`);

  return available;
}

/**
 * Detect which providers are available/installed on the current system (sync, sequential)
 * @deprecated Use detectAvailableProvidersAsync for better performance
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
      timeout: 5000, // Add timeout
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
