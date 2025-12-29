import { describe, test, expect } from "bun:test";
import { Command } from "commander";

// Import all commands to test their structure
import { upCommand } from "../../src/commands/up.js";
import { stopCommand } from "../../src/commands/stop.js";
import { restartCommand } from "../../src/commands/restart.js";
import { statusCommand } from "../../src/commands/status.js";
import { destroyCommand } from "../../src/commands/destroy.js";
import { reprovisionCommand } from "../../src/commands/reprovision.js";
import { sshCommand } from "../../src/commands/ssh.js";
import { execCommand } from "../../src/commands/exec.js";
import { infoCommand } from "../../src/commands/info.js";
import { installCommand } from "../../src/commands/install.js";
import { completionCommand } from "../../src/commands/completion.js";

describe("VM Management Commands", () => {
  describe("up command", () => {
    test("has correct name and alias", () => {
      expect(upCommand.name()).toBe("up");
      expect(upCommand.aliases()).toContain("start");
    });

    test("has --provision option", () => {
      const options = upCommand.options.map((o) => o.long);
      expect(options).toContain("--provision");
    });

    test("has --path option", () => {
      const options = upCommand.options.map((o) => o.long);
      expect(options).toContain("--path");
    });
  });

  describe("stop command", () => {
    test("has correct name and alias", () => {
      expect(stopCommand.name()).toBe("stop");
      expect(stopCommand.aliases()).toContain("halt");
    });
  });

  describe("restart command", () => {
    test("has correct name and alias", () => {
      expect(restartCommand.name()).toBe("restart");
      expect(restartCommand.aliases()).toContain("reload");
    });
  });

  describe("status command", () => {
    test("has correct name", () => {
      expect(statusCommand.name()).toBe("status");
    });

    test("has --path option", () => {
      const options = statusCommand.options.map((o) => o.long);
      expect(options).toContain("--path");
    });
  });

  describe("destroy command", () => {
    test("has correct name", () => {
      expect(destroyCommand.name()).toBe("destroy");
    });

    test("has --force option", () => {
      const options = destroyCommand.options.map((o) => o.long);
      expect(options).toContain("--force");
    });

    test("has --dry-run option", () => {
      const options = destroyCommand.options.map((o) => o.long);
      expect(options).toContain("--dry-run");
    });
  });

  describe("reprovision command", () => {
    test("has correct name and alias", () => {
      expect(reprovisionCommand.name()).toBe("reprovision");
      expect(reprovisionCommand.aliases()).toContain("provision");
    });
  });

  describe("ssh command", () => {
    test("has correct name and alias", () => {
      expect(sshCommand.name()).toBe("ssh");
      expect(sshCommand.aliases()).toContain("shell");
    });
  });

  describe("exec command", () => {
    test("has correct name", () => {
      expect(execCommand.name()).toBe("exec");
    });

    test("requires command argument", () => {
      const args = execCommand.registeredArguments;
      expect(args.length).toBeGreaterThan(0);
      expect(args[0].name()).toBe("command");
      expect(args[0].required).toBe(true);
    });
  });
});

describe("System Commands", () => {
  describe("info command", () => {
    test("has correct name", () => {
      expect(infoCommand.name()).toBe("info");
    });

    test("has --json option", () => {
      const options = infoCommand.options.map((o) => o.long);
      expect(options).toContain("--json");
    });
  });

  describe("install command", () => {
    test("has correct name", () => {
      expect(installCommand.name()).toBe("install");
    });

    test("has --branch option", () => {
      const options = installCommand.options.map((o) => o.long);
      expect(options).toContain("--branch");
    });

    test("has --provider option", () => {
      const options = installCommand.options.map((o) => o.long);
      expect(options).toContain("--provider");
    });
  });

  describe("completion command", () => {
    test("has correct name", () => {
      expect(completionCommand.name()).toBe("completion");
    });

    test("requires shell argument", () => {
      const args = completionCommand.registeredArguments;
      expect(args.length).toBeGreaterThan(0);
      expect(args[0].name()).toBe("shell");
    });
  });
});

describe("Command consistency", () => {
  const commands = [
    upCommand,
    stopCommand,
    restartCommand,
    statusCommand,
    destroyCommand,
    reprovisionCommand,
    sshCommand,
    execCommand,
    infoCommand,
    installCommand,
    completionCommand,
  ];

  test("all commands have descriptions", () => {
    for (const cmd of commands) {
      expect(cmd.description()).toBeTruthy();
      expect(cmd.description().length).toBeGreaterThan(0);
    }
  });

  test("all commands have --path option or are special commands", () => {
    const specialCommands = ["completion"]; // Commands that don't need --path
    for (const cmd of commands) {
      if (specialCommands.includes(cmd.name())) {
        continue;
      }
      const options = cmd.options.map((o) => o.long);
      expect(options).toContain("--path");
    }
  });
});
