/**
 * VVV CLI Integration Tests
 *
 * A single test file that runs all integration tests in sequential order.
 * This ensures proper test ordering: install -> up -> tests -> stop -> destroy
 *
 * Run with: VVV_INTEGRATION_TEST=1 bun test tests/integration/integration.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { existsSync } from "fs";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync, spawn } from "child_process";

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

function shouldRunIntegrationTests(): boolean {
  return (
    process.env.VVV_INTEGRATION_TEST === "1" ||
    process.env.VVV_INTEGRATION_TEST === "true"
  );
}

// ============================================================================
// TEST CONTEXT
// ============================================================================

interface TestContext {
  testDir: string;
  vvvPath: string;
  vvvInstalled: boolean;
  vmStarted: boolean;
}

const ctx: TestContext = {
  testDir: "",
  vvvPath: "",
  vvvInstalled: false,
  vmStarted: false,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCliCommand(args: string[], timeout: number = 60000): CommandResult {
  const cliPath = join(process.cwd(), "src", "index.ts");

  const result = spawnSync("bun", ["run", cliPath, ...args], {
    encoding: "utf-8",
    timeout,
    env: {
      ...process.env,
      CI: "true",
      NO_COLOR: "1",
    },
  });

  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function runCliCommandAsync(
  args: string[],
  timeout: number = 600000
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const cliPath = join(process.cwd(), "src", "index.ts");
    let stdout = "";
    let stderr = "";

    console.log(`\n[CLI] Running: vvvlocal ${args.join(" ")}`);

    const child = spawn("bun", ["run", cliPath, ...args], {
      env: {
        ...process.env,
        CI: "true",
        NO_COLOR: "1",
      },
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        exitCode: 124,
        stdout,
        stderr: stderr + "\n[TIMEOUT]",
      });
    }, timeout);

    child.stdout?.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr?.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout,
        stderr: stderr + `\n[ERROR: ${error.message}]`,
      });
    });
  });
}

function isDockerAvailable(): boolean {
  const result = spawnSync("docker", ["info"], {
    encoding: "utf-8",
    timeout: 10000,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return result.status === 0;
}

function isVagrantInstalled(): boolean {
  const result = spawnSync("vagrant", ["--version"], {
    encoding: "utf-8",
    timeout: 5000,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return result.status === 0;
}

function getVmStatus(vvvPath: string): string {
  const result = spawnSync("vagrant", ["status", "--machine-readable"], {
    cwd: vvvPath,
    encoding: "utf-8",
    timeout: 30000,
  });

  const match = result.stdout?.match(/,state,(\w+)/);
  return match?.[1] || "unknown";
}

async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 60000,
  intervalMs: number = 1000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}

function parseJsonOutput(output: string): unknown {
  const lines = output.trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]?.trim();
    if (line && (line.startsWith("{") || line.startsWith("["))) {
      try {
        const jsonStr = lines.slice(i).join("\n");
        return JSON.parse(jsonStr);
      } catch {
        try {
          return JSON.parse(line);
        } catch {
          continue;
        }
      }
    }
  }
  throw new Error(`No valid JSON found in output: ${output.substring(0, 200)}`);
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe.skipIf(!shouldRunIntegrationTests())("VVV CLI Integration Tests", () => {
  // Setup: Create temp directory
  beforeAll(async () => {
    ctx.testDir = await mkdtemp(join(tmpdir(), "vvv-test-"));
    ctx.vvvPath = join(ctx.testDir, "vvv");

    console.log("\n========================================");
    console.log("VVV CLI Integration Tests");
    console.log("========================================");
    console.log(`Test directory: ${ctx.testDir}`);
    console.log(`VVV path: ${ctx.vvvPath}`);
    console.log("========================================\n");
  });

  // Cleanup: Always runs at the end
  afterAll(async () => {
    console.log("\n========================================");
    console.log("Cleanup");
    console.log("========================================\n");

    // Force destroy VM if it exists
    if (existsSync(join(ctx.vvvPath, "Vagrantfile"))) {
      console.log("Destroying VM...");
      spawnSync("vagrant", ["destroy", "--force"], {
        cwd: ctx.vvvPath,
        encoding: "utf-8",
        timeout: 120000,
      });
    }

    // Remove test directory
    if (ctx.testDir) {
      console.log(`Removing ${ctx.testDir}...`);
      await rm(ctx.testDir, { recursive: true, force: true });
    }

    console.log("Cleanup complete.\n");
  });

  // ==========================================================================
  // PHASE 1: PREREQUISITES
  // ==========================================================================

  describe("Phase 1: Prerequisites", () => {
    test("Vagrant is installed", () => {
      expect(isVagrantInstalled()).toBe(true);
    });

    test("Docker is available and running", () => {
      expect(isDockerAvailable()).toBe(true);
    });
  });

  // ==========================================================================
  // PHASE 2: INSTALL
  // ==========================================================================

  describe("Phase 2: Install", () => {
    test(
      "install command clones VVV with docker provider",
      async () => {
        const result = await runCliCommandAsync(
          [
            "install",
            "--path",
            ctx.vvvPath,
            "--provider",
            "docker",
            "--branch",
            "stable",
          ],
          600000
        );

        if (result.exitCode !== 0) {
          console.error("\n=== INSTALL FAILED ===");
          console.error("Exit code:", result.exitCode);
          console.error("Stdout:", result.stdout);
          console.error("Stderr:", result.stderr);
          console.error("======================\n");
        }

        if (result.exitCode === 0) {
          ctx.vvvInstalled = true;
        }

        expect(result.exitCode).toBe(0);
        expect(existsSync(join(ctx.vvvPath, "Vagrantfile"))).toBe(true);
      },
      700000
    );

    test("VVV directory structure is correct", () => {
      expect(ctx.vvvInstalled).toBe(true);
      expect(existsSync(join(ctx.vvvPath, "config"))).toBe(true);
      expect(existsSync(join(ctx.vvvPath, "www"))).toBe(true);
      expect(existsSync(join(ctx.vvvPath, "config", "config.yml"))).toBe(true);
    });

    test("vagrant plugin system works", () => {
      expect(ctx.vvvInstalled).toBe(true);

      // Verify vagrant plugin command works (not necessarily that plugins are installed)
      // In CI with Docker provider, local plugins might not be required
      const result = spawnSync("vagrant", ["plugin", "list"], {
        cwd: ctx.vvvPath,
        encoding: "utf-8",
        timeout: 30000,
      });

      if (result.status !== 0) {
        console.error("Plugin list command failed:");
        console.error("Status:", result.status);
        console.error("Stdout:", result.stdout);
        console.error("Stderr:", result.stderr);
      }

      // We just need the plugin command to work - actual plugins may vary by provider
      expect(result.status).toBe(0);
    });
  });

  // ==========================================================================
  // PHASE 3: START VM
  // ==========================================================================

  describe("Phase 3: Start VM", () => {
    test(
      "up command starts VM",
      async () => {
        expect(ctx.vvvInstalled).toBe(true);

        const result = await runCliCommandAsync(
          ["up", "--path", ctx.vvvPath],
          900000
        );

        if (result.exitCode !== 0) {
          console.error("\n=== VM START FAILED ===");
          console.error("Exit code:", result.exitCode);
          console.error("Stdout:", result.stdout);
          console.error("Stderr:", result.stderr);
          console.error("=======================\n");

          // Check VM status for debugging
          const status = getVmStatus(ctx.vvvPath);
          console.error("Current VM status:", status);
        }

        if (result.exitCode === 0) {
          ctx.vmStarted = true;
        }

        expect(result.exitCode).toBe(0);
      },
      1000000
    );

    test("VM is in running state", () => {
      expect(ctx.vmStarted).toBe(true);
      const status = getVmStatus(ctx.vvvPath);
      if (status !== "running") {
        console.error("Expected VM to be running, but status is:", status);
      }
      expect(status).toBe("running");
    });
  });

  // ==========================================================================
  // PHASE 4: STATUS COMMAND
  // ==========================================================================

  describe("Phase 4: Status Command", () => {
    test("status command shows running", () => {
      expect(ctx.vmStarted).toBe(true);

      const result = runCliCommand(["status", "--path", ctx.vvvPath]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain("running");
    });
  });

  // ==========================================================================
  // PHASE 5: EXEC COMMAND
  // ==========================================================================

  describe("Phase 5: Exec Command", () => {
    test("exec runs command in VM", () => {
      expect(ctx.vmStarted).toBe(true);

      const result = runCliCommand([
        "exec",
        "--path",
        ctx.vvvPath,
        "echo",
        "hello-from-vm",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("hello-from-vm");
    });

    test("exec can check PHP version", () => {
      expect(ctx.vmStarted).toBe(true);

      const result = runCliCommand([
        "exec",
        "--path",
        ctx.vvvPath,
        "--",
        "php",
        "--version",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/PHP \d+\.\d+/);
    });

    test("exec can run WP-CLI", () => {
      expect(ctx.vmStarted).toBe(true);

      const result = runCliCommand([
        "exec",
        "--path",
        ctx.vvvPath,
        "--",
        "wp",
        "--version",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/WP-CLI \d+\.\d+/);
    });
  });

  // ==========================================================================
  // PHASE 6: SERVICE COMMAND
  // ==========================================================================

  describe("Phase 6: Service Command", () => {
    test("service status shows services", () => {
      expect(ctx.vmStarted).toBe(true);

      const result = runCliCommand([
        "service",
        "status",
        "--path",
        ctx.vvvPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain("nginx");
      expect(result.stdout.toLowerCase()).toContain("mariadb");
    });

    test("service status --json outputs valid JSON", () => {
      expect(ctx.vmStarted).toBe(true);

      const result = runCliCommand([
        "service",
        "status",
        "--path",
        ctx.vvvPath,
        "--json",
      ]);

      expect(result.exitCode).toBe(0);

      const json = parseJsonOutput(result.stdout) as {
        services: Record<string, { running: boolean }>;
      };

      expect(json.services).toBeDefined();
      expect(json.services.nginx?.running).toBe(true);
      expect(json.services.mariadb?.running).toBe(true);
    });

    test("service restart nginx succeeds", () => {
      expect(ctx.vmStarted).toBe(true);

      const result = runCliCommand([
        "service",
        "restart",
        "nginx",
        "--path",
        ctx.vvvPath,
      ]);

      expect(result.exitCode).toBe(0);
    });
  });

  // ==========================================================================
  // PHASE 7: DOCTOR COMMAND
  // ==========================================================================

  describe("Phase 7: Doctor Command", () => {
    test("doctor runs all checks", () => {
      expect(ctx.vmStarted).toBe(true);

      const result = runCliCommand(["doctor", "--path", ctx.vvvPath], 120000);

      expect(result.stdout).toContain("VVV Doctor");
      expect(result.stdout).toContain("passed");
    }, 180000);

    test("doctor --json outputs valid JSON", () => {
      expect(ctx.vmStarted).toBe(true);

      const result = runCliCommand(
        ["doctor", "--path", ctx.vvvPath, "--json"],
        120000
      );

      const json = parseJsonOutput(result.stdout) as {
        results: Array<{ name: string; status: string }>;
        summary: { passed: number };
      };

      expect(json.results).toBeInstanceOf(Array);
      expect(json.summary.passed).toBeGreaterThan(0);
    }, 180000);

    test("doctor reports VM as running", () => {
      expect(ctx.vmStarted).toBe(true);

      const result = runCliCommand(
        ["doctor", "--path", ctx.vvvPath, "--json"],
        120000
      );

      const json = parseJsonOutput(result.stdout) as {
        results: Array<{ name: string; status: string }>;
      };

      const vmCheck = json.results.find((r) => r.name === "VM running");
      expect(vmCheck?.status).toBe("pass");
    }, 180000);
  });

  // ==========================================================================
  // PHASE 8: STOP AND RESTART
  // ==========================================================================

  describe("Phase 8: Stop and Restart", () => {
    test(
      "stop command halts VM",
      async () => {
        expect(ctx.vmStarted).toBe(true);

        const result = await runCliCommandAsync(
          ["stop", "--path", ctx.vvvPath],
          180000
        );

        expect(result.exitCode).toBe(0);
      },
      200000
    );

    test("VM is stopped", async () => {
      const stopped = await waitFor(
        () => getVmStatus(ctx.vvvPath) !== "running",
        60000
      );

      expect(stopped).toBe(true);
    });

    test(
      "up command restarts VM",
      async () => {
        const result = await runCliCommandAsync(
          ["up", "--path", ctx.vvvPath],
          300000
        );

        if (result.exitCode === 0) {
          ctx.vmStarted = true;
        }

        expect(result.exitCode).toBe(0);
        expect(getVmStatus(ctx.vvvPath)).toBe("running");
      },
      400000
    );
  });

  // ==========================================================================
  // PHASE 9: DESTROY
  // ==========================================================================

  describe("Phase 9: Destroy", () => {
    test(
      "destroy --force removes VM",
      async () => {
        const result = await runCliCommandAsync(
          ["destroy", "--path", ctx.vvvPath, "--force"],
          300000
        );

        expect(result.exitCode).toBe(0);
      },
      400000
    );

    test("VM is destroyed", () => {
      const status = getVmStatus(ctx.vvvPath);
      expect(status).toMatch(/not_created|unknown/);
    });
  });
});
