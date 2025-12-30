import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, cli, exitWithError } from "../../utils/cli.js";
import { getBoxInfo, getGuestOsInfo, isUbuntuEol } from "../../utils/box.js";
import { vagrantRunSync } from "../../utils/vagrant.js";

export const infoCommand = new Command("info")
  .description("Show information about the current Vagrant box")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const vvvPath = options.path;
    ensureVvvExists(vvvPath);

    // Get box information
    const boxInfo = getBoxInfo(vvvPath);
    if (!boxInfo) {
      exitWithError("Unable to detect box information");
    }

    // Check if VM is running
    const statusResult = vagrantRunSync(["status", "--machine-readable"], vvvPath);
    const isRunning = statusResult.stdout?.includes(",state,running") || false;

    // Get guest OS info (only if running)
    let osInfo = null;
    if (isRunning) {
      osInfo = getGuestOsInfo(vvvPath);
    }

    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        data: {
          box: boxInfo,
          guestOs: osInfo,
          isEol: osInfo ? isUbuntuEol(osInfo.version) : null
        }
      }, null, 2));
      return;
    }

    // Display information
    cli.info("Vagrant Box Information:");
    console.log(`  Name:     ${boxInfo.name}`);
    console.log(`  Version:  ${boxInfo.version}`);
    console.log(`  Provider: ${boxInfo.provider}`);

    if (osInfo) {
      console.log();
      cli.info("Guest OS Information:");
      console.log(`  Name:     ${osInfo.name}`);
      console.log(`  Version:  ${osInfo.version}`);
      console.log(`  Codename: ${osInfo.codename}`);

      if (isUbuntuEol(osInfo.version)) {
        console.log();
        cli.warning("⚠️  This Ubuntu version is end-of-life.");
        cli.info("Consider upgrading with: vvvlocal box upgrade");
      }
    } else if (!isRunning) {
      console.log();
      cli.info("Start VVV to see guest OS information: vvvlocal up");
    }
  });
