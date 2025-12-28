import { Command } from "commander";
import { spawn, spawnSync } from "child_process";
import { createInterface } from "readline";
import { vvvExists, DEFAULT_VVV_PATH } from "../../utils/config.js";

const SYSTEM_DATABASES = ["information_schema", "mysql", "performance_schema", "sys"];

function askQuestion(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

export const dropCommand = new Command("drop")
  .description("Drop (delete) a database")
  .argument("<name>", "Name of the database to drop")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (name, options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      console.error(`VVV not found at ${vvvPath}`);
      process.exit(1);
    }

    // Prevent dropping system databases
    if (SYSTEM_DATABASES.includes(name)) {
      console.error(`Cannot drop system database '${name}'.`);
      process.exit(1);
    }

    // Check if VVV is running
    const statusResult = spawnSync("vagrant", ["status", "--machine-readable"], {
      cwd: vvvPath,
      encoding: "utf-8",
    });

    const isRunning = statusResult.stdout?.includes(",state,running");

    if (!isRunning) {
      console.error("VVV is not running. Start it with 'vvvlocal up' first.");
      process.exit(1);
    }

    // Check if database exists
    const checkResult = spawnSync(
      "vagrant",
      ["ssh", "-c", `mysql --batch --skip-column-names -e "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '${name}'"`, "--", "-T"],
      {
        cwd: vvvPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    const dbExists = checkResult.stdout?.trim() === name;

    if (!dbExists) {
      console.error(`Database '${name}' does not exist.`);
      process.exit(1);
    }

    // Confirm deletion unless --yes is used
    if (!options.yes) {
      console.log(`\x1b[31mWarning:\x1b[0m This will permanently delete the database '${name}'.`);
      console.log("This action cannot be undone.");
      console.log("");

      const answer = await askQuestion(`Are you sure you want to drop '${name}'? (y/n): `);

      if (answer !== "y" && answer !== "yes") {
        console.log("Drop cancelled.");
        process.exit(0);
      }
    }

    console.log(`\nDropping database '${name}'...`);

    // Drop the database
    const dropResult = spawnSync(
      "vagrant",
      ["ssh", "-c", `mysql -e "DROP DATABASE \\\`${name}\\\`"`, "--", "-T"],
      {
        cwd: vvvPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    if (dropResult.status === 0) {
      console.log(`Database '${name}' dropped successfully.`);
    } else {
      console.error(`Failed to drop database '${name}'.`);
      if (dropResult.stderr) {
        console.error(dropResult.stderr);
      }
      process.exit(1);
    }
  });
