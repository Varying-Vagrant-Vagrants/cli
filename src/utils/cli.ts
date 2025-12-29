/**
 * Shared CLI utilities for consistent user interaction and error handling.
 */

import { createInterface } from "readline";
import { spawnSync } from "child_process";
import { vvvExists, loadConfig } from "./config.js";
import React from "react";
import { render, Text, Box } from "ink";
import Spinner from "ink-spinner";

// ANSI color codes
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
};

/**
 * Console output helpers with consistent colors.
 */
export const cli = {
  error: (msg: string) => console.error(`${colors.red}${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.cyan}${msg}${colors.reset}`),
  bold: (msg: string) => console.log(`${colors.bold}${msg}${colors.reset}`),
  dim: (msg: string) => console.log(`${colors.dim}${msg}${colors.reset}`),

  // Inline formatting helpers (return strings, don't print)
  format: {
    error: (msg: string) => `${colors.red}${msg}${colors.reset}`,
    warning: (msg: string) => `${colors.yellow}${msg}${colors.reset}`,
    success: (msg: string) => `${colors.green}${msg}${colors.reset}`,
    info: (msg: string) => `${colors.cyan}${msg}${colors.reset}`,
    bold: (msg: string) => `${colors.bold}${msg}${colors.reset}`,
    dim: (msg: string) => `${colors.dim}${msg}${colors.reset}`,
  },
};

/**
 * Exit with an error message.
 */
export function exitWithError(message: string, code: number = 1): never {
  cli.error(message);
  process.exit(code);
}

/**
 * Ask the user a question and return their response.
 * If a default value is provided, it will be shown and used if the user presses Enter.
 */
export function askQuestion(question: string, defaultValue?: string): Promise<string> {
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
 */
export async function confirm(question: string): Promise<boolean> {
  const answer = await askQuestion(`${question} (y/n)`);
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

/**
 * Ensure VVV exists at the given path, exit with error if not.
 */
export function ensureVvvExists(vvvPath: string): void {
  if (!vvvExists(vvvPath)) {
    exitWithError(`VVV not found at ${vvvPath}`);
  }
}

/**
 * Check if VVV is currently running.
 */
export function isVvvRunning(vvvPath: string): boolean {
  const result = spawnSync("vagrant", ["status", "--machine-readable"], {
    cwd: vvvPath,
    encoding: "utf-8",
  });

  return result.stdout?.includes(",state,running") ?? false;
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
    exitWithError(`Site '${siteName}' does not exist.`);
  }
}

/**
 * Ensure a site does NOT exist (for add commands), exit with error if it does.
 */
export function ensureSiteNotExists(vvvPath: string, siteName: string): void {
  if (siteExists(vvvPath, siteName)) {
    exitWithError(`Site '${siteName}' already exists.`);
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
