import { Command } from "commander";
import { spawn } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { vvvExists, DEFAULT_VVV_PATH } from "../../utils/config.js";

function getConnectionDetails(vvvPath: string): {
  host: string;
  port: number;
  user: string;
  password: string;
} {
  const spfPath = join(vvvPath, "database", "sequelpro.spf");

  if (existsSync(spfPath)) {
    try {
      const content = readFileSync(spfPath, "utf-8");

      const getValue = (key: string): string | undefined => {
        const keyPattern = new RegExp(`<key>${key}</key>\\s*<(string|integer)>([^<]*)<`);
        const match = content.match(keyPattern);
        return match?.[2];
      };

      return {
        host: getValue("host") || "vvv.test",
        port: parseInt(getValue("port") || "3306", 10),
        user: getValue("user") || "external",
        password: getValue("password") || "external",
      };
    } catch {
      // Fall through to defaults
    }
  }

  return {
    host: "vvv.test",
    port: 3306,
    user: "external",
    password: "external",
  };
}

export const tableplusCommand = new Command("tableplus")
  .description("Open database in TablePlus")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-d, --database <name>", "Database to open", "mysql")
  .action((options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      process.exit(1);
    }

    const { host, port, user, password } = getConnectionDetails(vvvPath);
    const database = options.database;

    // TablePlus URL scheme: mysql://user:password@host:port/database
    const url = `mysql://${user}:${password}@${host}:${port}/${database}?statusColor=007F3D&environment=local&name=VVV`;

    console.log("Opening TablePlus...");

    // Use 'open' on macOS to open the URL with TablePlus
    const child = spawn("open", [url], {
      stdio: "inherit",
      detached: true,
    });

    child.unref();
  });
