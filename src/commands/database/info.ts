import { Command } from "commander";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import React from "react";
import { render } from "ink";
import { vvvExists, DEFAULT_VVV_PATH } from "../../utils/config.js";
import { DatabaseInfo } from "../../components/DatabaseInfo.js";

interface ConnectionDetails {
  host: string;
  port: number;
  user: string;
  password: string;
  version?: string;
}

function parseSequelProFile(vvvPath: string): ConnectionDetails | null {
  const spfPath = join(vvvPath, "database", "sequelpro.spf");

  if (!existsSync(spfPath)) {
    return null;
  }

  try {
    const content = readFileSync(spfPath, "utf-8");

    // Simple XML parsing for plist
    const getValue = (key: string): string | undefined => {
      const keyPattern = new RegExp(`<key>${key}</key>\\s*<(string|integer)>([^<]*)<`);
      const match = content.match(keyPattern);
      return match?.[2];
    };

    const host = getValue("host") || "vvv.test";
    const port = parseInt(getValue("port") || "3306", 10);
    const user = getValue("user") || "external";
    const password = getValue("password") || "external";
    const version = getValue("rdbms_version");

    return { host, port, user, password, version };
  } catch {
    return null;
  }
}

function getDefaultDetails(): ConnectionDetails {
  return {
    host: "vvv.test",
    port: 3306,
    user: "external",
    password: "external",
  };
}

export const infoCommand = new Command("info")
  .description("Show database connection details")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      process.exit(1);
    }

    const details = parseSequelProFile(vvvPath) || getDefaultDetails();

    if (options.json) {
      console.log(JSON.stringify(details, null, 2));
      return;
    }

    render(React.createElement(DatabaseInfo, details));
  });
