import { Command } from "commander";
import { readdirSync, statSync } from "fs";
import { join } from "path";
import React from "react";
import { render } from "ink";
import { loadConfig, vvvExists, DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ExtensionTable } from "../../components/ExtensionTable.js";

interface ExtensionInfo {
  extension: string;
  provisioner: string;
  enabled: boolean;
}

function getInstalledExtensions(vvvPath: string): Map<string, Set<string>> {
  const extensionsPath = join(vvvPath, "provision", "extensions");
  const installed = new Map<string, Set<string>>();

  try {
    const extensions = readdirSync(extensionsPath);

    for (const extension of extensions) {
      const extensionPath = join(extensionsPath, extension);

      if (!statSync(extensionPath).isDirectory()) {
        continue;
      }

      const provisioners = new Set<string>();
      const entries = readdirSync(extensionPath);

      for (const entry of entries) {
        // Skip hidden directories like .git
        if (entry.startsWith(".")) {
          continue;
        }
        const entryPath = join(extensionPath, entry);
        if (statSync(entryPath).isDirectory()) {
          provisioners.add(entry);
        }
      }

      if (provisioners.size > 0) {
        installed.set(extension, provisioners);
      }
    }
  } catch {
    // Extensions folder may not exist yet
  }

  return installed;
}

function getEnabledExtensions(vvvPath: string): Map<string, Set<string>> {
  const enabled = new Map<string, Set<string>>();

  try {
    const config = loadConfig(vvvPath);
    const extensions = config.extensions;

    if (extensions) {
      for (const [extension, provisionerList] of Object.entries(extensions)) {
        if (Array.isArray(provisionerList)) {
          enabled.set(extension, new Set(provisionerList));
        }
      }
    }
  } catch {
    // Config may not exist
  }

  return enabled;
}

export const listCommand = new Command("list")
  .description("List all VVV extensions")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      process.exit(1);
    }

    const installed = getInstalledExtensions(vvvPath);
    const enabled = getEnabledExtensions(vvvPath);

    const extList: ExtensionInfo[] = [];

    // Collect all provisioners from installed extension folders
    for (const [extension, provisioners] of installed) {
      const enabledSet = enabled.get(extension) || new Set();

      for (const provisioner of provisioners) {
        extList.push({
          extension,
          provisioner,
          enabled: enabledSet.has(provisioner),
        });
      }
    }

    // Sort by extension, then provisioner
    extList.sort((a, b) => {
      if (a.extension !== b.extension) {
        return a.extension.localeCompare(b.extension);
      }
      return a.provisioner.localeCompare(b.provisioner);
    });

    if (extList.length === 0) {
      if (options.json) {
        console.log(JSON.stringify([], null, 2));
      } else {
        console.log("No extensions installed.");
      }
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(extList, null, 2));
      return;
    }

    render(React.createElement(ExtensionTable, { extensions: extList }));
  });
