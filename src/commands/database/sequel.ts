import { Command } from "commander";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { vvvExists, DEFAULT_VVV_PATH } from "../../utils/config.js";
import { exitWithError, cli } from "../../utils/cli.js";

export const sequelCommand = new Command("sequel")
  .aliases(["sequelace", "sequelpro"])
  .description("Open database in Sequel Ace")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action((options) => {
    const vvvPath = options.path;

    if (!vvvExists(vvvPath)) {
      exitWithError(`VVV not found at ${vvvPath}`);
    }

    const spfPath = join(vvvPath, "database", "sequelpro.spf");

    if (!existsSync(spfPath)) {
      exitWithError(
        "Sequel Pro/Ace connection file not found.",
        `Expected at: ${spfPath}`
      );
    }

    cli.info("Opening Sequel Ace...");

    // Use 'open' on macOS to open the .spf file with the default handler
    const child = spawn("open", [spfPath], {
      stdio: "inherit",
      detached: true,
    });

    child.unref();
  });
