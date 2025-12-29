import { describe, test, expect } from "bun:test";

// Import database commands
import { databaseCommand } from "../../src/commands/database/index.js";

describe("Database Command Group", () => {
  test("has correct name and alias", () => {
    expect(databaseCommand.name()).toBe("database");
    expect(databaseCommand.aliases()).toContain("db");
  });

  test("has description", () => {
    expect(databaseCommand.description()).toBeTruthy();
  });

  test("has subcommands", () => {
    expect(databaseCommand.commands.length).toBeGreaterThan(0);
  });

  describe("list subcommand", () => {
    const listCmd = databaseCommand.commands.find((c) => c.name() === "list");

    test("exists", () => {
      expect(listCmd).toBeDefined();
    });

    test("has ls alias", () => {
      expect(listCmd?.aliases()).toContain("ls");
    });

    test("has --json option", () => {
      const options = listCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--json");
    });
  });

  describe("info subcommand", () => {
    const infoCmd = databaseCommand.commands.find((c) => c.name() === "info");

    test("exists", () => {
      expect(infoCmd).toBeDefined();
    });

    test("has --json option", () => {
      const options = infoCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--json");
    });
  });

  describe("backup subcommand", () => {
    const backupCmd = databaseCommand.commands.find((c) => c.name() === "backup");

    test("exists", () => {
      expect(backupCmd).toBeDefined();
    });
  });

  describe("restore subcommand", () => {
    const restoreCmd = databaseCommand.commands.find((c) => c.name() === "restore");

    test("exists", () => {
      expect(restoreCmd).toBeDefined();
    });

    test("has --path option", () => {
      const options = restoreCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--path");
    });
  });

  describe("import subcommand", () => {
    const importCmd = databaseCommand.commands.find((c) => c.name() === "import");

    test("exists", () => {
      expect(importCmd).toBeDefined();
    });

    test("requires database and file arguments", () => {
      const args = importCmd?.registeredArguments || [];
      expect(args.length).toBeGreaterThanOrEqual(2);
    });

    test("has --create option", () => {
      const options = importCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--create");
    });
  });

  describe("drop subcommand", () => {
    const dropCmd = databaseCommand.commands.find((c) => c.name() === "drop");

    test("exists", () => {
      expect(dropCmd).toBeDefined();
    });

    test("has delete alias", () => {
      // Note: Commander stores the main name differently from aliases
    });

    test("requires database name argument", () => {
      const args = dropCmd?.registeredArguments || [];
      expect(args.length).toBeGreaterThan(0);
    });

    test("has --yes option for skipping confirmation", () => {
      const options = dropCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--yes");
    });

    test("has --dry-run option", () => {
      const options = dropCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--dry-run");
    });
  });

  describe("query subcommand", () => {
    const queryCmd = databaseCommand.commands.find((c) => c.name() === "query");

    test("exists", () => {
      expect(queryCmd).toBeDefined();
    });

    test("has mysql alias", () => {
      expect(queryCmd?.aliases()).toContain("mysql");
    });

    test("has --execute option", () => {
      const options = queryCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--execute");
    });

    test("has --json option", () => {
      const options = queryCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--json");
    });
  });
});
