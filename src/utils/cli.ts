/**
 * Shared CLI utilities for consistent user interaction and error handling.
 */

import { createInterface } from "readline";
import { spawnSync } from "child_process";
import { vvvExists, loadConfig } from "./config.js";
import React from "react";
import { render, Text, Box } from "ink";
import Spinner from "ink-spinner";

// Global verbose mode state
let verboseMode = false;

/**
 * Enable or disable verbose mode globally.
 */
export function setVerboseMode(enabled: boolean): void {
  verboseMode = enabled;
}

/**
 * Check if verbose mode is enabled.
 */
export function isVerbose(): boolean {
  return verboseMode;
}

/**
 * Log a message only if verbose mode is enabled.
 */
export function verbose(message: string): void {
  if (verboseMode) {
    console.log(`\x1b[2m[verbose] ${message}\x1b[0m`);
  }
}

/**
 * Check if colors should be used.
 * Disabled when:
 * - stdout is not a TTY (piped to another command)
 * - NO_COLOR environment variable is set (standard convention)
 * - CI environment variable is set (running in CI)
 */
export function shouldUseColors(): boolean {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.CI !== undefined) return false;
  return process.stdout.isTTY === true;
}

// ANSI color codes (empty strings when colors disabled)
function getColors() {
  if (!shouldUseColors()) {
    return {
      red: "",
      green: "",
      yellow: "",
      blue: "",
      cyan: "",
      bold: "",
      dim: "",
      reset: "",
    };
  }
  return {
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    reset: "\x1b[0m",
  };
}

/**
 * Console output helpers with consistent colors.
 * Colors are automatically disabled when output is piped.
 */
export const cli = {
  error: (msg: string) => {
    const c = getColors();
    console.error(`${c.red}${msg}${c.reset}`);
  },
  warning: (msg: string) => {
    const c = getColors();
    console.log(`${c.yellow}${msg}${c.reset}`);
  },
  success: (msg: string) => {
    const c = getColors();
    console.log(`${c.green}${msg}${c.reset}`);
  },
  info: (msg: string) => {
    const c = getColors();
    console.log(`${c.cyan}${msg}${c.reset}`);
  },
  bold: (msg: string) => {
    const c = getColors();
    console.log(`${c.bold}${msg}${c.reset}`);
  },
  dim: (msg: string) => {
    const c = getColors();
    console.log(`${c.dim}${msg}${c.reset}`);
  },

  // Inline formatting helpers (return strings, don't print)
  format: {
    error: (msg: string) => {
      const c = getColors();
      return `${c.red}${msg}${c.reset}`;
    },
    warning: (msg: string) => {
      const c = getColors();
      return `${c.yellow}${msg}${c.reset}`;
    },
    success: (msg: string) => {
      const c = getColors();
      return `${c.green}${msg}${c.reset}`;
    },
    info: (msg: string) => {
      const c = getColors();
      return `${c.cyan}${msg}${c.reset}`;
    },
    bold: (msg: string) => {
      const c = getColors();
      return `${c.bold}${msg}${c.reset}`;
    },
    dim: (msg: string) => {
      const c = getColors();
      return `${c.dim}${msg}${c.reset}`;
    },
  },
};

/**
 * Exit with an error message and optional suggestion.
 */
export function exitWithError(message: string, suggestion?: string | number, code: number = 1): never {
  // Handle backwards compatibility: if suggestion is a number, it's the exit code
  if (typeof suggestion === "number") {
    cli.error(message);
    process.exit(suggestion);
  }

  cli.error(message);
  if (suggestion) {
    const c = getColors();
    console.log("");
    console.log(`${c.dim}Suggestion:${c.reset} ${suggestion}`);
  }
  process.exit(code);
}

/**
 * Ask the user a question and return their response.
 * If a default value is provided, it will be shown and used if the user presses Enter.
 * In CI mode, automatically returns the default value without prompting.
 */
export function askQuestion(question: string, defaultValue?: string): Promise<string> {
  // In CI mode, return default value without prompting
  if (process.env.CI !== undefined) {
    if (defaultValue !== undefined) {
      verbose(`[CI] Auto-answering: ${question} => ${defaultValue}`);
      return Promise.resolve(defaultValue);
    }
    // No default in CI - this is a problem
    throw new Error(`Cannot prompt in CI mode without default: ${question}`);
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

/**
 * Ask for yes/no confirmation. Returns true for yes, false for no.
 * In CI mode, defaults to 'no' (false) for safety.
 */
export async function confirm(question: string, defaultYes = false): Promise<boolean> {
  // In CI mode, return default without prompting
  if (process.env.CI !== undefined) {
    verbose(`[CI] Auto-answering: ${question} => ${defaultYes ? "yes" : "no"}`);
    return defaultYes;
  }

  const answer = await askQuestion(`${question} (y/n)`);
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

/**
 * Ensure VVV exists at the given path, exit with error if not.
 */
export function ensureVvvExists(vvvPath: string): void {
  if (!vvvExists(vvvPath)) {
    exitWithError(
      `VVV not found at ${vvvPath}`,
      `Run 'vvvlocal install' to set up VVV, or use --path to specify the location.`
    );
  }
}

/**
 * Possible VM states from vagrant status.
 */
export type VmState = "running" | "poweroff" | "not_created" | "unknown";

/**
 * Get the current VM state.
 */
export function getVmState(vvvPath: string): VmState {
  const result = spawnSync("vagrant", ["status", "--machine-readable"], {
    cwd: vvvPath,
    encoding: "utf-8",
  });

  const match = result.stdout?.match(/,state,(\w+)/);
  return (match?.[1] as VmState) || "unknown";
}

/**
 * Check if VVV is currently running.
 */
export function isVvvRunning(vvvPath: string): boolean {
  return getVmState(vvvPath) === "running";
}

/**
 * Ensure VVV is running, exit with error if not.
 */
export function ensureVvvRunning(vvvPath: string): void {
  if (!isVvvRunning(vvvPath)) {
    exitWithError("VVV is not running. Start it with 'vvvlocal up' first.");
  }
}

/**
 * Check if a site exists in the VVV config.
 */
export function siteExists(vvvPath: string, siteName: string): boolean {
  try {
    const config = loadConfig(vvvPath);
    return config.sites ? siteName in config.sites : false;
  } catch {
    return false;
  }
}

/**
 * Ensure a site exists, exit with error if not.
 */
export function ensureSiteExists(vvvPath: string, siteName: string): void {
  if (!siteExists(vvvPath, siteName)) {
    exitWithError(
      `Site '${siteName}' does not exist.`,
      `Run 'vvvlocal site list' to see available sites.`
    );
  }
}

/**
 * Ensure a site does NOT exist (for add commands), exit with error if it does.
 */
export function ensureSiteNotExists(vvvPath: string, siteName: string): void {
  if (siteExists(vvvPath, siteName)) {
    exitWithError(
      `Site '${siteName}' already exists.`,
      `Use 'vvvlocal site update ${siteName}' to modify it, or choose a different name.`
    );
  }
}

/**
 * Format elapsed time in a human-readable format.
 */
export function formatElapsedTime(startTime: number): string {
  const elapsed = Date.now() - startTime;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Spinner component for displaying loading state.
 */
interface SpinnerProps {
  message: string;
}

function SpinnerComponent({ message }: SpinnerProps): React.ReactElement {
  return React.createElement(Box, null,
    React.createElement(Text, { color: "cyan" },
      React.createElement(Spinner, { type: "dots" })
    ),
    React.createElement(Text, null, ` ${message}`)
  );
}

/**
 * Success component for displaying completion state.
 */
interface SuccessProps {
  message: string;
  elapsed: string;
}

function SuccessComponent({ message, elapsed }: SuccessProps): React.ReactElement {
  return React.createElement(Box, null,
    React.createElement(Text, { color: "green" }, "✓"),
    React.createElement(Text, null, ` ${message} `),
    React.createElement(Text, { color: "dim" }, `(${elapsed})`)
  );
}

/**
 * Error component for displaying failure state.
 */
interface ErrorProps {
  message: string;
  elapsed: string;
}

function ErrorComponent({ message, elapsed }: ErrorProps): React.ReactElement {
  return React.createElement(Box, null,
    React.createElement(Text, { color: "red" }, "✗"),
    React.createElement(Text, null, ` ${message} `),
    React.createElement(Text, { color: "dim" }, `(${elapsed})`)
  );
}

/**
 * Run an async task with a spinner indicator.
 * Shows a spinner while the task runs, then shows success/error with elapsed time.
 * Best for tasks that don't produce their own output.
 *
 * @param message - The message to display while the task is running
 * @param task - The async task to run
 * @returns The result of the task
 */
export async function withSpinner<T>(
  message: string,
  task: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  // Render the spinner
  const { rerender, unmount } = render(
    React.createElement(SpinnerComponent, { message })
  );

  try {
    const result = await task();
    const elapsed = formatElapsedTime(startTime);

    // Show success
    rerender(React.createElement(SuccessComponent, { message, elapsed }));
    unmount();

    return result;
  } catch (error) {
    const elapsed = formatElapsedTime(startTime);

    // Show error
    rerender(React.createElement(ErrorComponent, { message: `${message} - failed`, elapsed }));
    unmount();

    throw error;
  }
}

/**
 * Simple elapsed time tracker for manual timing.
 * Returns a function that, when called, returns the formatted elapsed time.
 */
export function startTimer(): () => string {
  const startTime = Date.now();
  return () => formatElapsedTime(startTime);
}

/**
 * Run a command with timing, showing elapsed time on completion.
 * Best for commands that produce their own output (like vagrant).
 *
 * @param startMessage - Message to show before command runs
 * @param task - The async task to run (should return exit code)
 * @param successMessage - Message to show on success (optional)
 */
export async function withTiming(
  startMessage: string,
  task: () => Promise<number>,
  successMessage?: string
): Promise<number> {
  cli.info(startMessage);
  console.log("");

  const getElapsed = startTimer();
  const code = await task();
  const elapsed = getElapsed();

  console.log("");
  if (code === 0) {
    cli.success(`${successMessage || "Done"} (${elapsed})`);
  } else {
    cli.error(`Failed (${elapsed})`);
  }

  return code;
}
