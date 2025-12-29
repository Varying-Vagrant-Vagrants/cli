import { describe, test, expect } from "bun:test";
import {
  formatElapsedTime,
  startTimer,
  setVerboseMode,
  isVerbose,
} from "../../src/utils/cli.js";

describe("formatElapsedTime", () => {
  test("formats seconds correctly", () => {
    const start = Date.now() - 5000; // 5 seconds ago
    const result = formatElapsedTime(start);
    expect(result).toBe("5s");
  });

  test("formats zero seconds", () => {
    const start = Date.now();
    const result = formatElapsedTime(start);
    expect(result).toBe("0s");
  });

  test("formats minutes and seconds", () => {
    const start = Date.now() - 125000; // 2 minutes 5 seconds ago
    const result = formatElapsedTime(start);
    expect(result).toBe("2m 5s");
  });

  test("formats exact minutes", () => {
    const start = Date.now() - 120000; // 2 minutes ago
    const result = formatElapsedTime(start);
    expect(result).toBe("2m 0s");
  });
});

describe("startTimer", () => {
  test("returns a function", () => {
    const getElapsed = startTimer();
    expect(typeof getElapsed).toBe("function");
  });

  test("returned function returns formatted time", () => {
    const getElapsed = startTimer();
    // Wait briefly
    const elapsed = getElapsed();
    expect(elapsed).toMatch(/^\d+s$/);
  });
});

describe("verbose mode", () => {
  test("isVerbose returns false by default", () => {
    setVerboseMode(false); // Reset to default
    expect(isVerbose()).toBe(false);
  });

  test("setVerboseMode enables verbose mode", () => {
    setVerboseMode(true);
    expect(isVerbose()).toBe(true);
    setVerboseMode(false); // Reset
  });

  test("setVerboseMode disables verbose mode", () => {
    setVerboseMode(true);
    setVerboseMode(false);
    expect(isVerbose()).toBe(false);
  });
});
