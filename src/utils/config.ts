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
}

export interface SiteConfig {
  description?: string;
  repo?: string;
  hosts?: string[];
  skip_provisioning?: boolean;
  php?: string;
  custom?: Record<string, unknown>;
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

  let extArray = extensions.get(extension);
  if (!extArray) {
    extensions.set(extension, [provisioner]);
  } else {
    const items = extArray.items.map((item: any) => item.value);
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
