import { Command } from "commander";
import { spawnSync } from "child_process";
import { vvvExists, DEFAULT_VVV_PATH } from "../../utils/config.js";
import React from "react";
import { render } from "ink";
import { DatabaseList } from "../../components/DatabaseList.js";

const SYSTEM_DATABASES = ["information_schema", "mysql", "performance_schema", "sys"];

export const listCommand = new Command("list")
  .alias("ls")
  .description("List databases in VVV")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      process.exit(1);
    }

    // Run mysql command inside VVV to list databases
    // Use -T to disable pseudo-terminal allocation (avoids VVV welcome banner)
    const result = spawnSync(
      "vagrant",
      ["ssh", "-c", "mysql --batch --skip-column-names -e 'SHOW DATABASES'", "--", "-T"],
      {
        cwd: vvvPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    if (result.status !== 0) {
      console.error("Failed to list databases. Is VVV running?");
      if (result.stderr) {
        console.error(result.stderr);
      }
      process.exit(1);
    }

    // Filter out system databases, empty lines, and any box-drawing characters from VVV banner
    const boxChars = /[┌┐└┘│─╔╗╚╝║═▀▄█▌▐░▒▓■□▪▫]/;
    const databases = result.stdout
      .trim()
      .split("\n")
      .map((name) => name.trim())
      .filter((name) => {
        if (name === "") return false;
        if (SYSTEM_DATABASES.includes(name)) return false;
        if (boxChars.test(name)) return false;
        // Valid database names only contain alphanumeric, underscore, hyphen
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) return false;
        return true;
      });

    if (options.json) {
      console.log(JSON.stringify(databases, null, 2));
      return;
    }

    render(React.createElement(DatabaseList, { databases }));
  });
