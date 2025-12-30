import { platform } from "os";
import { spawnSync } from "child_process";

export type LaunchTarget = "browser" | "folder" | "vscode";

export interface LaunchOptions {
  target: LaunchTarget;
  location: string; // URL or file path
}

/**
 * Launch an application with a URL or file path
 */
export function launchApplication(options: LaunchOptions): boolean {
  const plat = platform();
  const { target, location } = options;

  let cmd: string;
  let args: string[];

  if (target === "browser") {
    // Browser
    if (plat === "darwin") {
      cmd = "open";
      args = [location];
    } else if (plat === "win32") {
      cmd = "cmd";
      args = ["/c", "start", "", location];
    } else {
      // Linux
      cmd = "xdg-open";
      args = [location];
    }
  } else if (target === "folder") {
    // File manager
    if (plat === "darwin") {
      cmd = "open";
      args = [location];
    } else if (plat === "win32") {
      cmd = "explorer";
      args = [location];
    } else {
      // Linux
      cmd = "xdg-open";
      args = [location];
    }
  } else if (target === "vscode") {
    // VS Code (cross-platform)
    cmd = "code";
    args = [location];
  } else {
    return false;
  }

  const result = spawnSync(cmd, args, { stdio: "inherit" });
  return result.status === 0;
}
