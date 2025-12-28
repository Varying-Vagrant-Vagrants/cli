#!/usr/bin/env bun
import { Command } from "commander";
import { upCommand, stopCommand, restartCommand, statusCommand, reprovisionCommand, sshCommand, infoCommand, siteCommand, extensionCommand, databaseCommand, installCommand, upgradeCommand } from "./commands/index.js";

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
const reset = "\x1b[0m";

const logo = `
${red}__ ${green}__ ${blue}__ __
${red}\\ V${green}\\ V${blue}\\ V /${reset}  vvvlocal
${red} \\_/${green}\\_/${blue}\\_/${reset}   CLI for VVV
`;

function printLogo(): void {
  console.log(logo);
}

const program = new Command();

program
  .name("vvvlocal")
  .description("CLI tool for VVV (Varying Vagrant Vagrants)")
  .version("0.1.0")
  .addHelpText("beforeAll", logo)
  .action(() => {
    // When run without arguments, show help
    program.help();
  });

program.addCommand(databaseCommand);
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
