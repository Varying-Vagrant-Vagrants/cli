#!/usr/bin/env bun
import { Command } from "commander";
import { upCommand, stopCommand, restartCommand, statusCommand, reprovisionCommand, sshCommand, destroyCommand, execCommand, infoCommand, siteCommand, extensionCommand, databaseCommand, phpCommand, configCommand, hostsCommand, logsCommand, openCommand, serviceCommand, snapshotCommand, sslCommand, wpCommand, xdebugCommand, boxCommand, installCommand, providersCommand, upgradeCommand, completionCommand, doctorCommand } from "./commands/index.js";
import { setVerboseMode, cli, shouldUseColors } from "./utils/cli.js";
import { setTipsEnabledFromCli } from "./utils/tips.js";
import { getBuildDate, formatBuildDate, isCompiledBinary } from "./utils/version.js";
import { VERSION } from "./version.js";
import { getVVVVersion } from "./commands/info.js";
import { DEFAULT_VVV_PATH, vvvExists, loadConfig } from "./utils/config.js";

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, _promise) => {
  cli.error("An unexpected error occurred.");
  if (reason instanceof Error) {
    console.error(`Error: ${reason.message}`);
    if (process.env.DEBUG) {
      console.error(reason.stack);
    }
  } else {
    console.error(reason);
  }
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  cli.error("An unexpected error occurred.");
  console.error(`Error: ${error.message}`);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

// Track active child processes for cleanup
const activeProcesses = new Set<number>();

export function registerChildProcess(pid: number): void {
  activeProcesses.add(pid);
}

export function unregisterChildProcess(pid: number): void {
  activeProcesses.delete(pid);
}

// Graceful shutdown on SIGINT (Ctrl+C)
let shuttingDown = false;
process.on("SIGINT", () => {
  if (shuttingDown) {
    // Second SIGINT - force exit
    process.exit(130);
  }
  shuttingDown = true;

  console.log("\n");
  cli.warning("Shutting down...");

  // Kill any active child processes
  for (const pid of activeProcesses) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Process may already be dead
    }
  }

  // Give processes time to clean up, then exit
  setTimeout(() => {
    process.exit(130);
  }, 1000);
});

// Handle SIGTERM for graceful shutdown
process.on("SIGTERM", () => {
  cli.warning("Received SIGTERM, shutting down...");
  for (const pid of activeProcesses) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Process may already be dead
    }
  }
  process.exit(143);
});

// Prevent running as root
if (process.getuid && process.getuid() === 0) {
  console.error("\x1b[31mError: Do not run vvvlocal as root or with sudo.\x1b[0m");
  console.error("Running Vagrant as root can cause permission issues with your VVV installation.");
  console.error("Please run vvvlocal as your normal user.");
  process.exit(1);
}

// ANSI color codes (respects TTY detection)
function getCliColors() {
  if (!shouldUseColors()) {
    return { red: "", green: "", blue: "", cyan: "", yellow: "", reset: "", bold: "", dim: "" };
  }
  return {
    red: "\x1b[38;5;9m",
    green: "\x1b[1;38;5;2m",
    blue: "\x1b[38;5;4m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
  };
}

function shouldShowSplash(): boolean {
  // Check if splash is disabled in config
  try {
    if (vvvExists(DEFAULT_VVV_PATH)) {
      const config = loadConfig(DEFAULT_VVV_PATH);
      if (config.cli?.splash === false) {
        return false;
      }
    }
  } catch {
    // If config can't be loaded, show splash
  }
  return true;
}

function getLogo() {
  // Check if splash is disabled
  if (!shouldShowSplash()) {
    return "";
  }

  const { red, green, blue, reset, dim } = getCliColors();

  // Get CLI version info
  const cliVersion = isCompiledBinary()
    ? `v${VERSION} (${formatBuildDate(getBuildDate())})`
    : `v${VERSION}-dev`;

  // Always try to get VVV version from default path
  let vvvVersion = "";
  if (vvvExists(DEFAULT_VVV_PATH)) {
    const vvvVer = getVVVVersion(DEFAULT_VVV_PATH);
    vvvVersion = vvvVer !== "unknown" ? vvvVer : "";
  }

  return `
${red}__ ${green}__ ${blue}__ __
${red}\\ V${green}\\ V${blue}\\ V /${reset}  cli: ${dim}${cliVersion}${reset}
${red} \\_/${green}\\_/${blue}\\_/${reset}   ${vvvVersion ? `VVV: ${dim}v${vvvVersion}${reset}` : "CLI for VVV"}
`;
}

// Define command groups with their commands
const commandGroups = [
  {
    name: "VM Management",
    commands: ["up", "stop", "restart", "status", "ssh", "exec", "reprovision", "destroy", "snapshot"],
  },
  {
    name: "Site Management",
    commands: ["site", "open", "wp"],
  },
  {
    name: "Extension Management",
    commands: ["extension"],
  },
  {
    name: "Database Management",
    commands: ["database"],
  },
  {
    name: "PHP",
    commands: ["php", "xdebug"],
  },
  {
    name: "System",
    commands: ["completion", "config", "doctor", "hosts", "info", "install", "logs", "providers", "service", "ssl", "upgrade"],
  },
];

function formatGroupedHelp(program: Command): string {
  const { bold, reset, cyan, yellow, dim } = getCliColors();
  const lines: string[] = [];

  lines.push(`${bold}Usage:${reset} ${program.name()} [options] [command]`);
  lines.push("");
  lines.push(program.description());
  lines.push("");

  // Options
  lines.push(`${bold}Options:${reset}`);
  const optionWidth = 30;
  lines.push(`  ${cyan}${"-V, --version".padEnd(optionWidth)}${reset}output the version number`);
  lines.push(`  ${cyan}${"--verbose".padEnd(optionWidth)}${reset}show detailed output`);
  lines.push(`  ${cyan}${"-h, --help".padEnd(optionWidth)}${reset}display help for command`);
  lines.push("");

  // Commands grouped
  lines.push(`${bold}Commands:${reset}`);

  // Build command map
  const commandMap = new Map<string, Command>();
  for (const cmd of program.commands) {
    commandMap.set(cmd.name(), cmd);
  }

  const cmdWidth = 34;

  for (const group of commandGroups) {
    const groupCmds: Command[] = [];
    for (const cmdName of group.commands) {
      const cmd = commandMap.get(cmdName);
      if (cmd) {
        groupCmds.push(cmd);
        commandMap.delete(cmdName);
      }
    }

    if (groupCmds.length > 0) {
      lines.push("");
      lines.push(`  ${dim}${group.name}${reset}`);
      for (const cmd of groupCmds) {
        const aliases = cmd.aliases();
        const nameWithAlias = aliases.length > 0
          ? `${cmd.name()}|${aliases[0]}`
          : cmd.name();
        const args = cmd.registeredArguments?.map(a => `<${a.name()}>`).join(" ") || "";
        const opts = cmd.options.length > 0 ? " [options]" : "";
        const term = `${nameWithAlias}${opts}${args ? " " + args : ""}`;
        lines.push(`    ${yellow}${term.padEnd(cmdWidth)}${reset}${cmd.description()}`);
      }
    }
  }

  // Any ungrouped commands
  if (commandMap.size > 0) {
    lines.push("");
    lines.push(`  ${dim}Other${reset}`);
    for (const cmd of commandMap.values()) {
      const aliases = cmd.aliases();
      const nameWithAlias = aliases.length > 0
        ? `${cmd.name()}|${aliases[0]}`
        : cmd.name();
      const opts = cmd.options.length > 0 ? " [options]" : "";
      const term = `${nameWithAlias}${opts}`;
      lines.push(`    ${yellow}${term.padEnd(cmdWidth)}${reset}${cmd.description()}`);
    }
  }

  lines.push("");
  lines.push(`Run ${cyan}vvvlocal <command> --help${reset} for more information on a command.`);

  return lines.join("\n");
}

const program = new Command();

program
  .name("vvvlocal")
  .description("CLI tool for VVV (Varying Vagrant Vagrants)")
  .version(VERSION)
  .option("--verbose", "Show detailed output")
  .option("--no-tips", "Disable helpful tips")
  .addHelpText("beforeAll", () => getLogo())
  .addHelpCommand(false) // Disable help subcommand
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      setVerboseMode(true);
    }
    if (opts.tips === false) {
      setTipsEnabledFromCli(false);
    }
  })
  .action(() => {
    // When run without arguments, show custom help
    console.log(getLogo());
    console.log(formatGroupedHelp(program));
    process.exit(0);
  });

// Override help for root command only
program.helpInformation = function() {
  return formatGroupedHelp(program);
};

program.addCommand(boxCommand);
program.addCommand(completionCommand);
program.addCommand(configCommand);
program.addCommand(databaseCommand);
program.addCommand(destroyCommand);
program.addCommand(doctorCommand);
program.addCommand(execCommand);
program.addCommand(extensionCommand);
program.addCommand(hostsCommand);
program.addCommand(infoCommand);
program.addCommand(installCommand);
program.addCommand(logsCommand);
program.addCommand(openCommand);
program.addCommand(phpCommand);
program.addCommand(providersCommand);
program.addCommand(reprovisionCommand);
program.addCommand(restartCommand);
program.addCommand(serviceCommand);
program.addCommand(siteCommand);
program.addCommand(snapshotCommand);
program.addCommand(sshCommand);
program.addCommand(sslCommand);
program.addCommand(statusCommand);
program.addCommand(stopCommand);
program.addCommand(upCommand);
program.addCommand(upgradeCommand);
program.addCommand(wpCommand);
program.addCommand(xdebugCommand);

// Better error handling for unknown commands
program.showHelpAfterError('(add --help for additional information)');

program.on('command:*', (operands) => {
  console.error(`\nUnknown command: ${operands.join(' ')}`);
  console.error(`\nRun 'vvvlocal --help' to see available commands.`);
  process.exitCode = 1;
});

program.parse();
