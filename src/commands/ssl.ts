import { Command } from "commander";
import { spawnSync } from "child_process";
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, copyFileSync } from "fs";
import { join } from "path";
import { platform } from "os";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, cli, exitWithError } from "../utils/cli.js";

/**
 * Get the local certificates directory path.
 */
function getCertsDir(vvvPath: string): string {
  return join(vvvPath, "certificates");
}

/**
 * Get the CA certificate path.
 */
function getCaPath(vvvPath: string): string {
  return join(getCertsDir(vvvPath), "ca", "ca.crt");
}

/**
 * Check if the VVV CA is trusted on macOS.
 */
function isCaTrustedMac(): boolean {
  const result = spawnSync("security", ["find-certificate", "-c", "VVV", "-a", "-Z", "/Library/Keychains/System.keychain"], {
    encoding: "utf-8",
  });
  return result.status === 0 && result.stdout.includes("VVV");
}

/**
 * Check if the VVV CA is trusted on Linux.
 */
function isCaTrustedLinux(): boolean {
  const certPaths = [
    "/usr/local/share/ca-certificates/vvv-ca.crt",
    "/etc/ssl/certs/vvv-ca.pem",
  ];
  return certPaths.some(p => existsSync(p));
}

/**
 * Check if the VVV CA is trusted.
 */
function isCaTrusted(): boolean {
  const plat = platform();
  if (plat === "darwin") {
    return isCaTrustedMac();
  } else if (plat === "linux") {
    return isCaTrustedLinux();
  }
  // Windows or other - assume not trusted
  return false;
}

/**
 * Trust the CA certificate on macOS.
 */
function trustCaMac(certPath: string): boolean {
  cli.info("Adding VVV CA to system keychain (requires sudo)...");
  const result = spawnSync("sudo", [
    "security", "add-trusted-cert",
    "-d", "-r", "trustRoot",
    "-k", "/Library/Keychains/System.keychain",
    certPath,
  ], {
    stdio: "inherit",
  });
  return result.status === 0;
}

/**
 * Trust the CA certificate on Linux.
 */
function trustCaLinux(certPath: string): boolean {
  cli.info("Adding VVV CA to system certificates (requires sudo)...");

  // Copy to ca-certificates directory
  const destPath = "/usr/local/share/ca-certificates/vvv-ca.crt";
  const copyResult = spawnSync("sudo", ["cp", certPath, destPath], { stdio: "inherit" });
  if (copyResult.status !== 0) {
    return false;
  }

  // Update certificates
  const updateResult = spawnSync("sudo", ["update-ca-certificates"], { stdio: "inherit" });
  return updateResult.status === 0;
}

// List subcommand
const listCommand = new Command("list")
  .description("List SSL certificates for all sites")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    const certsDir = getCertsDir(vvvPath);

    if (!existsSync(certsDir)) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Certificates directory not found: ${certsDir}` }, null, 2));
        process.exit(1);
      }
      exitWithError(`Certificates directory not found: ${certsDir}\nMake sure VVV has been provisioned at least once.`);
    }

    // List certificate directories (exclude 'ca' directory)
    const sites = readdirSync(certsDir)
      .filter(name => {
        const fullPath = join(certsDir, name);
        return statSync(fullPath).isDirectory() && name !== "ca";
      })
      .sort();

    // Get cert details for each site
    const certs: Array<{ site: string; path: string; exists: boolean }> = [];

    for (const site of sites) {
      const certPath = join(certsDir, site, "dev.crt");
      certs.push({
        site,
        path: certPath,
        exists: existsSync(certPath),
      });
    }

    if (options.json) {
      console.log(JSON.stringify({ certificates: certs }, null, 2));
      return;
    }

    console.log("");
    cli.bold("SSL Certificates");
    console.log("");

    if (certs.length === 0) {
      cli.info("No site certificates found.");
    } else {
      const siteWidth = 25;
      console.log(`${"Site".padEnd(siteWidth)}Status`);
      console.log("─".repeat(siteWidth + 15));

      for (const cert of certs) {
        const status = cert.exists
          ? cli.format.success("certificate exists")
          : cli.format.warning("no certificate");
        console.log(`${cert.site.padEnd(siteWidth)}${status}`);
      }
    }

    console.log("");
  });

// Trust subcommand
const trustCommand = new Command("trust")
  .description("Trust the VVV CA certificate in system keychain")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--status", "Check if CA is already trusted")
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;

    // Status check mode
    if (options.status) {
      const trusted = isCaTrusted();

      if (options.json) {
        console.log(JSON.stringify({ trusted, platform: platform() }, null, 2));
        return;
      }

      console.log("");
      if (trusted) {
        cli.success("VVV CA certificate is trusted.");
      } else {
        cli.warning("VVV CA certificate is NOT trusted.");
        console.log("");
        console.log("Run 'vvvlocal ssl trust' to trust it.");
      }
      console.log("");
      return;
    }

    ensureVvvExists(vvvPath);

    // Check if already trusted
    if (isCaTrusted()) {
      if (options.json) {
        console.log(JSON.stringify({ success: true, message: "CA already trusted" }, null, 2));
        return;
      }
      cli.success("VVV CA certificate is already trusted.");
      return;
    }

    // Get CA certificate from local path
    const caPath = getCaPath(vvvPath);
    if (!existsSync(caPath)) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `CA certificate not found: ${caPath}` }, null, 2));
        process.exit(1);
      }
      exitWithError(`CA certificate not found: ${caPath}\nMake sure VVV has been provisioned and the tls-ca extension is enabled.`);
    }

    // Trust based on platform
    const plat = platform();
    let success = false;

    if (plat === "darwin") {
      success = trustCaMac(caPath);
    } else if (plat === "linux") {
      success = trustCaLinux(caPath);
    } else if (plat === "win32") {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: "Windows trust not yet implemented" }, null, 2));
        process.exit(1);
      }
      cli.warning("Windows certificate trust requires manual steps:");
      console.log("");
      console.log(`1. Open the CA certificate: ${caPath}`);
      console.log("");
      console.log("2. Double-click the certificate and install to 'Trusted Root Certification Authorities'");
      console.log("");
      return;
    } else {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: `Unsupported platform: ${plat}` }, null, 2));
        process.exit(1);
      }
      exitWithError(`Unsupported platform: ${plat}`);
    }

    if (options.json) {
      console.log(JSON.stringify({ success, platform: plat }, null, 2));
      process.exit(success ? 0 : 1);
    }

    if (success) {
      console.log("");
      cli.success("VVV CA certificate trusted successfully.");
      cli.info("You may need to restart your browser for changes to take effect.");
      console.log("");
    } else {
      cli.error("Failed to trust CA certificate.");
      process.exit(1);
    }
  });

export const sslCommand = new Command("ssl")
  .description("Manage SSL certificates")
  .addCommand(listCommand)
  .addCommand(trustCommand);
