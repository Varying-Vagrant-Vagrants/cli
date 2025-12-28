import { Command } from "commander";
import { spawn } from "child_process";
import { platform } from "os";
import { DEFAULT_VVV_PATH, getConfigPath } from "../../utils/config.js";
import { ensureVvvExists, cli, exitWithError } from "../../utils/cli.js";

function getDefaultEditor(): string {
  // Check environment variables first
  if (process.env.EDITOR) {
    return process.env.EDITOR;
  }
  if (process.env.VISUAL) {
    return process.env.VISUAL;
  }

  // Platform-specific defaults
  const plat = platform();
  if (plat === "win32") {
    return "notepad";
  }

  // Unix-like systems - try nano as it's user-friendly
  return "nano";
}

export const editCommand = new Command("edit")
  .description("Open the config file in your editor")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-e, --editor <editor>", "Editor to use (default: $EDITOR or nano)")
  .option("--json", "Output config path as JSON (does not open editor)")
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    const configPath = getConfigPath(vvvPath);
    const editor = options.editor || getDefaultEditor();

    // JSON mode just outputs the path
    if (options.json) {
      console.log(JSON.stringify({ path: configPath, editor }, null, 2));
      return;
    }

    cli.info(`Opening ${configPath} in ${editor}...`);

    // Spawn editor with inherited stdio for interactive use
    const child = spawn(editor, [configPath], {
      stdio: "inherit",
      shell: true,
    });

    child.on("error", (error) => {
      exitWithError(`Failed to open editor '${editor}': ${error.message}`);
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log("");
        cli.success("Editor closed.");
        console.log(cli.format.dim("Run 'vvvlocal config validate' to check for errors."));
        console.log("");
      } else {
        console.log("");
        cli.warning(`Editor exited with code ${code}`);
        console.log("");
      }
      process.exit(code ?? 0);
    });
  });
