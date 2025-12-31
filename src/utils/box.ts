import { vagrantRunSync, vagrantSshSync } from "./vagrant.js";

export interface BoxInfo {
  name: string;
  version: string;
  provider: string;
}

export interface GuestOsInfo {
  name: string;
  version: string;
  codename: string;
}

/**
 * Get Vagrant box information
 */
export function getBoxInfo(vvvPath: string): BoxInfo | null {
  const result = vagrantRunSync(["box", "list", "--machine-readable"], vvvPath);

  if (result.status !== 0) {
    return null;
  }

  // Parse machine-readable output
  // Format: <timestamp>,<target>,<type>,<data>
  // Example: 1234567890,vvv,box-name,ubuntu/focal64
  const lines = result.stdout.toString().split("\n");
  const boxLine = lines.find(line => line.includes(",box-name,"));
  const versionLine = lines.find(line => line.includes(",box-version,"));
  const providerLine = lines.find(line => line.includes(",box-provider,"));

  if (!boxLine) return null;

  const nameParts = boxLine.split(",");
  const versionParts = versionLine?.split(",");
  const providerParts = providerLine?.split(",");

  return {
    name: nameParts[3] || "unknown",
    version: versionParts?.[3] || "unknown",
    provider: providerParts?.[3] || "unknown"
  };
}

/**
 * Get guest OS information (Ubuntu version)
 */
export function getGuestOsInfo(vvvPath: string): GuestOsInfo | null {
  const result = vagrantSshSync(
    "cat /etc/os-release | grep -E '^(NAME|VERSION_ID|VERSION_CODENAME)='",
    vvvPath
  );

  if (result.status !== 0 || !result.stdout) {
    return null;
  }

  const output = result.stdout.toString();
  const lines = output.split("\n");

  const getName = (prefix: string): string => {
    const line = lines.find(l => l.startsWith(prefix));
    if (!line) return "";
    const parts = line.split("=");
    return parts[1] ? parts[1].replace(/"/g, "") : "";
  };

  return {
    name: getName("NAME"),
    version: getName("VERSION_ID"),
    codename: getName("VERSION_CODENAME")
  };
}

/**
 * Check if Ubuntu version is end-of-life
 */
export function isUbuntuEol(version: string): boolean {
  // Ubuntu LTS EOL dates
  const eolDates: Record<string, string> = {
    "18.04": "2023-05-31",
    "20.04": "2025-04-30",
    "22.04": "2027-04-21",
    "24.04": "2029-04-25"
  };

  const eolDate = eolDates[version];
  if (!eolDate) return false;

  return new Date(eolDate) < new Date();
}

/**
 * Check if box upgrade is available using Vagrant's built-in check
 * Returns true if a newer box version is available
 */
export function isBoxOutdated(vvvPath: string): boolean {
  const result = vagrantRunSync(["box", "outdated"], vvvPath);

  // Exit code 0 = box is outdated (upgrade available)
  // Exit code 1 = box is up-to-date (no upgrade needed)
  // Any other exit code = treat as error, proceed with upgrade (safe default)

  if (result.status === 1) {
    return false; // Box is current, no upgrade needed
  }

  return true; // Box is outdated or error - proceed with upgrade
}
