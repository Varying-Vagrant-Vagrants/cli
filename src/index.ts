#!/usr/bin/env bun
import { Command } from "commander";
import { upCommand, stopCommand, restartCommand, statusCommand, reprovisionCommand, sshCommand, destroyCommand, infoCommand, siteCommand, extensionCommand, databaseCommand, installCommand, upgradeCommand } from "./commands/index.js";

// Prevent running as root
if (process.getuid && process.getuid() === 0) {
  console.error("\x1b[31mError: Do not run vvvlocal as root or with sudo.\x1b[0m");
  console.error("Running Vagrant as root can cause permission issues with your VVV installation.");
  console.error("Please run vvvlocal as your normal user.");
  process.exit(1);
}

// ANSI color codes
const red = "\x1b[38;5;9m";
const green = "\x1b[1;38;5;2m";
const blue = "\x1b[38;5;4m";
const cyan = "\x1b[36m";
const yellow = "\x1b[33m";
const reset = "\x1b[0m";
const bold = "\x1b[1m";
const dim = "\x1b[2m";

const logo = `
${red}__ ${green}__ ${blue}__ __
${red}\\ V${green}\\ V${blue}\\ V /${reset}  vvvlocal
${red} \\_/${green}\\_/${blue}\\_/${reset}   CLI for VVV
`;

// Define command groups with their commands
const commandGroups = [
  {
    name: "VM Management",
    commands: ["up", "stop", "restart", "status", "ssh", "reprovision", "destroy"],
  },
  {
    name: "Site Management",
    commands: ["site"],
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
    name: "System",
    commands: ["info", "install", "upgrade"],
  },
];

function formatGroupedHelp(program: Command): string {
  const lines: string[] = [];

  lines.push(`${bold}Usage:${reset} ${program.name()} [options] [command]`);
  lines.push("");
  lines.push(program.description());
  lines.push("");

  // Options
  lines.push(`${bold}Options:${reset}`);
  const optionWidth = 30;
  lines.push(`  ${cyan}${"-V, --version".padEnd(optionWidth)}${reset}output the version number`);
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
  .version("0.1.0")
  .addHelpText("beforeAll", logo)
  .addHelpCommand(false) // Disable help subcommand
  .action(() => {
    // When run without arguments, show custom help
    console.log(logo);
    console.log(formatGroupedHelp(program));
    process.exit(0);
  });

// Override help for root command only
program.helpInformation = function() {
  return formatGroupedHelp(program);
};

program.addCommand(databaseCommand);
program.addCommand(destroyCommand);
program.addCommand(extensionCommand);
program.addCommand(infoCommand);
program.addCommand(installCommand);
program.addCommand(reprovisionCommand);
program.addCommand(restartCommand);
program.addCommand(siteCommand);
program.addCommand(sshCommand);
program.addCommand(statusCommand);
program.addCommand(stopCommand);
program.addCommand(upCommand);
program.addCommand(upgradeCommand);

program.parse();
