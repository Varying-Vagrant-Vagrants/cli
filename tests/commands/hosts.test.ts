import { describe, test, expect } from "bun:test";
import { hostsCommand } from "../../src/commands/hosts/index.js";

describe("Hosts Command Group", () => {
  test("has correct name", () => {
    expect(hostsCommand.name()).toBe("hosts");
  });

  test("has description", () => {
    expect(hostsCommand.description()).toBeTruthy();
  });

  test("has subcommands", () => {
    expect(hostsCommand.commands.length).toBeGreaterThan(0);
  });

  describe("list subcommand", () => {
    const listCmd = hostsCommand.commands.find((c) => c.name() === "list");

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

  describe("sudoers subcommand", () => {
    const sudoersCmd = hostsCommand.commands.find((c) => c.name() === "sudoers");

    test("exists", () => {
      expect(sudoersCmd).toBeDefined();
    });

    test("has --path option", () => {
      const options = sudoersCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--path");
    });

    test("has --remove option", () => {
      const options = sudoersCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--remove");
    });

    test("has --yes option", () => {
      const options = sudoersCmd?.options.map((o) => o.long) || [];
      expect(options).toContain("--yes");
    });
  });
});
