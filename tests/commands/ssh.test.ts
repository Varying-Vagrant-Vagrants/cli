import { describe, test, expect } from "bun:test";

import { sshCommand } from "../../src/commands/ssh.js";

describe("SSH Command", () => {
  test("has correct name", () => {
    expect(sshCommand.name()).toBe("ssh");
  });

  test("has shell alias", () => {
    expect(sshCommand.aliases()).toContain("shell");
  });

  test("has description", () => {
    expect(sshCommand.description()).toBeTruthy();
  });

  test("has --path option", () => {
    const options = sshCommand.options.map((o) => o.long);
    expect(options).toContain("--path");
  });

  test("has --directory option for starting in specific directory", () => {
    const options = sshCommand.options.map((o) => o.long);
    expect(options).toContain("--directory");
  });

  test("--directory has short flag -d", () => {
    const dirOption = sshCommand.options.find((o) => o.long === "--directory");
    expect(dirOption).toBeDefined();
    expect(dirOption!.short).toBe("-d");
  });
});
