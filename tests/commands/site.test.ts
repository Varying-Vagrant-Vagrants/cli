import { describe, test, expect } from "bun:test";

// Import site command
import { siteCommand } from "../../src/commands/site/index.js";

describe("Site Command Group", () => {
  test("has correct name", () => {
    expect(siteCommand.name()).toBe("site");
  });

  test("has description", () => {
    expect(siteCommand.description()).toBeTruthy();
  });

  test("has subcommands", () => {
    expect(siteCommand.commands.length).toBeGreaterThan(0);
  });

  describe("list subcommand", () => {
    const listCmd = siteCommand.commands.find((c) => c.name() === "list");

    test("exists", () => {
      expect(listCmd).toBeDefined();
    });

    test("has --json option", () => {
      const options = listCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--json");
    });

    test("has --path option", () => {
      const options = listCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--path");
    });
  });

  describe("info subcommand", () => {
    const infoCmd = siteCommand.commands.find((c) => c.name() === "info");

    test("exists", () => {
      expect(infoCmd).toBeDefined();
    });

    test("requires site name argument", () => {
      const args = infoCmd?.registeredArguments || [];
      expect(args.length).toBeGreaterThan(0);
      expect(args[0].name()).toBe("name");
    });

    test("has --json option", () => {
      const options = infoCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--json");
    });
  });

  describe("add subcommand", () => {
    const addCmd = siteCommand.commands.find((c) => c.name() === "add");

    test("exists", () => {
      expect(addCmd).toBeDefined();
    });

    test("has new alias", () => {
      expect(addCmd?.aliases()).toContain("new");
    });

    test("requires site name argument", () => {
      const args = addCmd?.registeredArguments || [];
      expect(args.length).toBeGreaterThan(0);
      expect(args[0].name()).toBe("name");
    });

    test("has --host option", () => {
      const options = addCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--host");
    });

    test("has --description option", () => {
      const options = addCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--description");
    });
  });

  describe("remove subcommand", () => {
    const removeCmd = siteCommand.commands.find((c) => c.name() === "remove");

    test("exists", () => {
      expect(removeCmd).toBeDefined();
    });

    test("has delete alias", () => {
      expect(removeCmd?.aliases()).toContain("delete");
    });

    test("has --force option", () => {
      const options = removeCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--force");
    });

    test("has --dry-run option", () => {
      const options = removeCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--dry-run");
    });
  });

  describe("enable subcommand", () => {
    const enableCmd = siteCommand.commands.find((c) => c.name() === "enable");

    test("exists", () => {
      expect(enableCmd).toBeDefined();
    });

    test("requires site name argument", () => {
      const args = enableCmd?.registeredArguments || [];
      expect(args.length).toBeGreaterThan(0);
    });
  });

  describe("disable subcommand", () => {
    const disableCmd = siteCommand.commands.find((c) => c.name() === "disable");

    test("exists", () => {
      expect(disableCmd).toBeDefined();
    });

    test("requires site name argument", () => {
      const args = disableCmd?.registeredArguments || [];
      expect(args.length).toBeGreaterThan(0);
    });
  });
});
