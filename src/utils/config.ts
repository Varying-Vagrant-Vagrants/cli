import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { parse, parseDocument } from "yaml";

export const DEFAULT_VVV_PATH = join(homedir(), "vvv-local");

export interface VVVConfig {
  sites?: Record<string, SiteConfig>;
  extensions?: Record<string, string[]>;
  vm_config?: Record<string, unknown>;
  general?: Record<string, unknown>;
  cli?: CliConfig;
}

export interface CliConfig {
  tips?: boolean;
  splash?: boolean;
}

export interface SiteConfig {
  description?: string;
  repo?: string;
  hosts?: string[];
  skip_provisioning?: boolean;
  php?: string;
  local_dir?: string;
  vm_dir?: string;
  custom?: Record<string, unknown>;
}

/**
 * Get the local filesystem path for a site.
 * Uses local_dir if specified, otherwise defaults to {vvvPath}/www/{siteName}
 */
export function getSiteLocalPath(vvvPath: string, siteName: string, site: SiteConfig): string {
  return site.local_dir || join(vvvPath, "www", siteName);
}

/**
 * Get the VM path for a site.
 * Uses vm_dir if specified, otherwise defaults to /srv/www/{siteName}
 */
export function getSiteVmPath(siteName: string, site: SiteConfig): string {
  return site.vm_dir || `/srv/www/${siteName}`;
}

export function getConfigPath(vvvPath: string): string {
  return join(vvvPath, "config", "config.yml");
}

export function loadConfig(vvvPath: string): VVVConfig {
  const configPath = getConfigPath(vvvPath);

  if (!existsSync(configPath)) {
    throw new Error(`Config file not found at ${configPath}`);
  }

  const content = readFileSync(configPath, "utf-8");
  return parse(content) as VVVConfig;
}

/**
 * Get CLI configuration with defaults.
 * Returns empty object if VVV is not set up yet or config is missing.
 */
export function getCliConfig(vvvPath: string): CliConfig {
  try {
    const config = loadConfig(vvvPath);
    return config.cli || {};
  } catch {
    return {};
  }
}

export function vvvExists(vvvPath: string): boolean {
  return existsSync(vvvPath);
}

export function setSiteSkipProvisioning(
  vvvPath: string,
  siteName: string,
  skip: boolean
): void {
  const configPath = getConfigPath(vvvPath);
  const content = readFileSync(configPath, "utf-8");
  const doc = parseDocument(content);

  const sites = doc.get("sites") as any;
  if (!sites) {
    throw new Error("No sites found in config");
  }

  const site = sites.get(siteName);
  if (!site) {
    throw new Error(`Site '${siteName}' not found in config`);
  }

  site.set("skip_provisioning", skip);

  writeFileSync(configPath, doc.toString(), "utf-8");
}

export function enableExtension(
  vvvPath: string,
  extension: string,
  provisioner: string
): void {
  const configPath = getConfigPath(vvvPath);
  const content = readFileSync(configPath, "utf-8");
  const doc = parseDocument(content);

  let extensions = doc.get("extensions") as any;
  if (!extensions) {
    doc.set("extensions", {});
    extensions = doc.get("extensions") as any;
  }

  const extArray = extensions.get(extension);
  if (!extArray) {
    extensions.set(extension, [provisioner]);
  } else {
    const items = extArray.items.map((item: unknown) => (item as { value: string }).value);
    if (!items.includes(provisioner)) {
      extArray.add(provisioner);
    }
  }

  writeFileSync(configPath, doc.toString(), "utf-8");
}

export function disableExtension(
  vvvPath: string,
  extension: string,
  provisioner: string
): void {
  const configPath = getConfigPath(vvvPath);
  const content = readFileSync(configPath, "utf-8");
  const doc = parseDocument(content);

  const extensions = doc.get("extensions") as any;
  if (!extensions) {
    return;
  }

  const extArray = extensions.get(extension);
  if (!extArray || !extArray.items) {
    return;
  }

  const index = extArray.items.findIndex((item: any) => item.value === provisioner);
  if (index !== -1) {
    extArray.items.splice(index, 1);
  }

  writeFileSync(configPath, doc.toString(), "utf-8");
}

export interface SiteUpdateOptions {
  description?: string;
  php?: string;
  addHosts?: string[];
  removeHosts?: string[];
}

/**
 * Update a site's configuration.
 * Only updates fields that are provided in the options.
 */
export function updateSiteConfig(
  vvvPath: string,
  siteName: string,
  options: SiteUpdateOptions
): void {
  const configPath = getConfigPath(vvvPath);
  const content = readFileSync(configPath, "utf-8");
  const doc = parseDocument(content);

  const sites = doc.get("sites") as any;
  if (!sites) {
    throw new Error("No sites found in config");
  }

  const site = sites.get(siteName);
  if (!site) {
    throw new Error(`Site '${siteName}' not found in config`);
  }

  // Update description if provided
  if (options.description !== undefined) {
    site.set("description", options.description);
  }

  // Update PHP version if provided
  if (options.php !== undefined) {
    site.set("php", options.php);
  }

  // Handle hosts modifications
  if (options.addHosts?.length || options.removeHosts?.length) {
    const hosts = site.get("hosts");

    // Get current hosts as array
    let currentHosts: string[] = [];
    if (hosts && hosts.items) {
      currentHosts = hosts.items.map((item: any) => item.value);
    }

    // Remove hosts
    if (options.removeHosts?.length) {
      currentHosts = currentHosts.filter(
        (h: string) => !options.removeHosts?.includes(h)
      );
    }

    // Add new hosts (avoid duplicates)
    if (options.addHosts?.length) {
      for (const host of options.addHosts) {
        if (!currentHosts.includes(host)) {
          currentHosts.push(host);
        }
      }
    }

    // Update the hosts array
    site.set("hosts", currentHosts);
  }

  writeFileSync(configPath, doc.toString(), "utf-8");
}
