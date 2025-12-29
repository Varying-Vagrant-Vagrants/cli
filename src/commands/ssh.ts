import { Command } from "commander";
import { resolve } from "path";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, verbose } from "../utils/cli.js";
import { ensureVagrantInstalled, vagrantRunAndExit } from "../utils/vagrant.js";

/**
 * Convert a local path inside VVV to the equivalent VM path.
 * Returns null if the path is not inside VVV's www directory.
 *
 * Example:
 *   Local: /Users/tom/vvv-local/www/wordpress-one/public_html
 *   VM:    /srv/www/wordpress-one/public_html
 */
function getVmPathForLocalPath(localPath: string, vvvPath: string): string | null {
  const resolvedLocal = resolve(localPath);
  const resolvedVvv = resolve(vvvPath);
  const wwwPath = resolve(vvvPath, "www");

  // Check if the current path is inside VVV's www directory
  if (!resolvedLocal.startsWith(wwwPath)) {
    return null;
  }

  // Get the relative path from www/
  const relativePath = resolvedLocal.slice(wwwPath.length);

  // Convert to VM path: /srv/www + relative path
  return `/srv/www${relativePath}`;
}

export const sshCommand = new Command("ssh")
  .alias("shell")
  .description("SSH into the VVV virtual machine")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-d, --directory <dir>", "Start in this directory inside the VM")
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);
    ensureVagrantInstalled();

    // Determine the target directory in the VM
    let targetDir: string | null = null;

    if (options.directory) {
      // Explicitly specified directory
      targetDir = options.directory;
      verbose(`Using specified directory: ${targetDir}`);
    } else {
      // Try to detect from current working directory
      const cwd = process.cwd();
      targetDir = getVmPathForLocalPath(cwd, vvvPath);

      if (targetDir) {
        verbose(`Detected VM path from cwd: ${targetDir}`);
      }
    }

    if (targetDir) {
      // SSH with a command to cd to the target directory and start an interactive shell
      // Using exec to replace the shell process so exit works correctly
      const command = `cd '${targetDir}' 2>/dev/null && exec $SHELL -l || exec $SHELL -l`;
      vagrantRunAndExit(["ssh", "-c", command], vvvPath);
    } else {
      // Standard SSH without directory change
      vagrantRunAndExit(["ssh"], vvvPath);
    }
  });
