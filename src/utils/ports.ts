/**
 * Port conflict detection utilities for Docker provider
 */

import { spawnSync } from "child_process";
import { platform } from "os";

export interface PortConflict {
  port: number;
  service: string;
  process: string;
  pid?: number;
  suggestion: string;
}

interface PortUser {
  process: string;
  pid?: number;
}

const PORT_SERVICES: Record<number, string> = {
  80: "HTTP",
  443: "HTTPS",
  3306: "MySQL",
  8025: "Mailhog",
};

/**
 * Get a helpful suggestion based on what process is using the port
 */
function getSuggestionForProcess(process: string, pid?: number): string {
  const processLower = process.toLowerCase();

  // Apache
  if (processLower.includes("apache") || processLower.includes("httpd")) {
    if (platform() === "darwin") {
      return "Stop Apache: sudo apachectl stop or brew services stop httpd";
    }
    return "Stop Apache: sudo systemctl stop apache2 or sudo service apache2 stop";
  }

  // nginx (system, not Docker)
  if (processLower === "nginx" || processLower.startsWith("nginx:")) {
    if (platform() === "darwin") {
      return "Stop nginx: sudo nginx -s stop or brew services stop nginx";
    }
    return "Stop nginx: sudo systemctl stop nginx or sudo service nginx stop";
  }

  // Docker proxy (another container)
  if (processLower.includes("docker") || processLower.includes("com.docker")) {
    return "Another Docker container is using this port. Run 'docker ps' to find it and 'docker stop <name>' to stop it";
  }

  // MAMP
  if (processLower.includes("mamp")) {
    return "Stop MAMP from the MAMP application";
  }

  // Laravel Valet
  if (processLower.includes("valet") || processLower.includes("php-fpm")) {
    return "Stop Valet: valet stop";
  }

  // MySQL/MariaDB
  if (processLower.includes("mysql") || processLower.includes("mariadb")) {
    if (platform() === "darwin") {
      return "Stop MySQL: brew services stop mysql or brew services stop mariadb";
    }
    return "Stop MySQL: sudo systemctl stop mysql or sudo service mysql stop";
  }

  // Node.js
  if (processLower.includes("node")) {
    return pid
      ? `Stop Node.js process: kill ${pid}`
      : "Stop the Node.js application using this port";
  }

  // Generic suggestion
  return pid
    ? `Stop the process: kill ${pid}`
    : "Stop the process using this port";
}

/**
 * Parse lsof output to extract process name and PID
 * lsof output format: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
 */
function parseLsofOutput(output: string): PortUser | null {
  const lines = output.trim().split("\n");

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const process = parts[0] || "unknown";
      const pid = parseInt(parts[1] || "0", 10);
      return { process, pid: isNaN(pid) ? undefined : pid };
    }
  }

  return null;
}

/**
 * Detect what process is using a specific port
 * Returns null if the port is available
 */
export function detectPortUser(port: number): PortUser | null {
  // Try lsof first (macOS/Linux)
  const lsof = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 5000,
  });

  if (lsof.status === 0 && lsof.stdout && lsof.stdout.trim()) {
    return parseLsofOutput(lsof.stdout);
  }

  // Fallback: try netstat (Linux)
  if (platform() === "linux") {
    const netstat = spawnSync("netstat", ["-tlnp"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    });

    if (netstat.status === 0 && netstat.stdout) {
      const lines = netstat.stdout.split("\n");
      for (const line of lines) {
        if (line.includes(`:${port}`) && line.includes("LISTEN")) {
          // Extract PID/Program from last column
          const match = line.match(/(\d+)\/(\S+)\s*$/);
          if (match) {
            return {
              process: match[2] || "unknown",
              pid: parseInt(match[1] || "0", 10),
            };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Check multiple ports for conflicts
 * Returns an array of conflicts found
 */
export function checkPortConflicts(ports: number[]): PortConflict[] {
  const conflicts: PortConflict[] = [];

  for (const port of ports) {
    const user = detectPortUser(port);
    if (user) {
      conflicts.push({
        port,
        service: PORT_SERVICES[port] || `Port ${port}`,
        process: user.process,
        pid: user.pid,
        suggestion: getSuggestionForProcess(user.process, user.pid),
      });
    }
  }

  return conflicts;
}

/**
 * Check if a specific port is available
 */
export function isPortAvailable(port: number): boolean {
  return detectPortUser(port) === null;
}

/**
 * Default ports used by VVV that need to be checked
 */
export const VVV_PORTS = [80, 443, 3306];
