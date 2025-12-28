import { Command } from "commander";
import { existsSync, copyFileSync, unlinkSync } from "fs";
import { basename, join } from "path";
import { DEFAULT_VVV_PATH } from "../../utils/config.js";
import { ensureVvvExists, ensureVvvRunning, cli, exitWithError } from "../../utils/cli.js";
import { vagrantSsh } from "../../utils/vagrant.js";

function getDecompressCommand(filename: string): string | null {
  if (filename.endsWith(".sql.gz") || filename.endsWith(".gz")) {
    return "gunzip -c";
  }
  if (filename.endsWith(".sql.zip") || filename.endsWith(".zip")) {
    return "unzip -p";
  }
  if (filename.endsWith(".sql.bz2") || filename.endsWith(".bz2")) {
    return "bunzip2 -c";
  }
  if (filename.endsWith(".sql.xz") || filename.endsWith(".xz")) {
    return "xzcat";
  }
  if (filename.endsWith(".sql.zst") || filename.endsWith(".zst")) {
    return "zstdcat";
  }
  if (filename.endsWith(".sql")) {
    return null; // No decompression needed
  }
  return null;
}

function isCompressed(filename: string): boolean {
  return (
    filename.endsWith(".gz") ||
    filename.endsWith(".zip") ||
    filename.endsWith(".bz2") ||
    filename.endsWith(".xz") ||
    filename.endsWith(".zst")
  );
}

export const importCommand = new Command("import")
  .description("Import an SQL file into a database")
  .argument("<database>", "Name of the database to import into")
  .argument("<file>", "Path to SQL file (supports .sql, .sql.gz, .sql.zip, .sql.bz2, .sql.xz, .sql.zst)")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("-c, --create", "Create the database if it doesn't exist")
  .action(async (database, file, options) => {
    const vvvPath = options.path;

    ensureVvvExists(vvvPath);

    // Check if file exists
    if (!existsSync(file)) {
      exitWithError(`File not found: ${file}`);
    }

    // Validate file extension
    const filename = basename(file);
    if (!filename.endsWith(".sql") && !isCompressed(filename)) {
      exitWithError(
        "Unsupported file format. Supported: .sql, .sql.gz, .sql.zip, .sql.bz2, .sql.xz, .sql.zst"
      );
    }

    ensureVvvRunning(vvvPath);

    // Copy file to VVV's database/sql directory (which is accessible in the VM)
    const importDir = join(vvvPath, "database", "sql");
    const tempFilename = `import-${Date.now()}-${filename}`;
    const tempPath = join(importDir, tempFilename);
    const vmTempPath = `/srv/database/sql/${tempFilename}`;

    cli.info(`Importing ${filename} into database '${database}'...`);

    try {
      // Copy file to shared location
      copyFileSync(file, tempPath);

      // Create database if requested
      if (options.create) {
        console.log(`Creating database '${database}' if it doesn't exist...`);
        const createCode = await vagrantSsh(
          `mysql -e "CREATE DATABASE IF NOT EXISTS \\\`${database}\\\`"`,
          vvvPath
        );
        if (createCode !== 0) {
          exitWithError(`Failed to create database '${database}'.`);
        }
      }

      // Build import command
      const decompressCmd = getDecompressCommand(filename);
      let importCmd: string;

      if (decompressCmd) {
        // Decompress and pipe to mysql
        importCmd = `${decompressCmd} "${vmTempPath}" | mysql "${database}"`;
      } else {
        // Direct import
        importCmd = `mysql "${database}" < "${vmTempPath}"`;
      }

      console.log("Importing data...");
      const importCode = await vagrantSsh(importCmd, vvvPath);

      if (importCode === 0) {
        cli.success(`\nSuccessfully imported into '${database}'.`);
      } else {
        cli.error("\nImport failed.");
        process.exit(importCode);
      }
    } finally {
      // Clean up temp file
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    }
  });
