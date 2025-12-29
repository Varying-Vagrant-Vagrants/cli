import { describe, test, expect } from "bun:test";
import {
  escapeShellArg,
  escapeMySqlString,
  escapeMySqlIdentifier,
  isValidDatabaseName,
  SYSTEM_DATABASES,
} from "../../src/utils/vagrant.js";

describe("escapeShellArg", () => {
  test("returns unchanged string without special characters", () => {
    expect(escapeShellArg("hello")).toBe("hello");
    expect(escapeShellArg("test123")).toBe("test123");
  });

  test("escapes single quotes", () => {
    expect(escapeShellArg("it's")).toBe("it'\\''s");
    expect(escapeShellArg("'test'")).toBe("'\\''test'\\''");
  });

  test("handles multiple single quotes", () => {
    expect(escapeShellArg("it's a 'test'")).toBe("it'\\''s a '\\''test'\\''");
  });

  test("handles empty string", () => {
    expect(escapeShellArg("")).toBe("");
  });

  test("does not escape double quotes (handled differently in shell)", () => {
    expect(escapeShellArg('say "hello"')).toBe('say "hello"');
  });
});

describe("escapeMySqlString", () => {
  test("returns unchanged string without special characters", () => {
    expect(escapeMySqlString("hello")).toBe("hello");
    expect(escapeMySqlString("test123")).toBe("test123");
  });

  test("escapes single quotes", () => {
    expect(escapeMySqlString("it's")).toBe("it\\'s");
    expect(escapeMySqlString("'test'")).toBe("\\'test\\'");
  });

  test("escapes backslashes", () => {
    expect(escapeMySqlString("path\\to\\file")).toBe("path\\\\to\\\\file");
  });

  test("escapes both quotes and backslashes", () => {
    expect(escapeMySqlString("it's a \\test")).toBe("it\\'s a \\\\test");
  });

  test("handles empty string", () => {
    expect(escapeMySqlString("")).toBe("");
  });
});

describe("escapeMySqlIdentifier", () => {
  test("returns unchanged string without backticks", () => {
    expect(escapeMySqlIdentifier("database_name")).toBe("database_name");
    expect(escapeMySqlIdentifier("my-database")).toBe("my-database");
  });

  test("doubles backticks", () => {
    expect(escapeMySqlIdentifier("test`db")).toBe("test``db");
    expect(escapeMySqlIdentifier("`test`")).toBe("``test``");
  });

  test("handles multiple backticks", () => {
    expect(escapeMySqlIdentifier("a`b`c")).toBe("a``b``c");
  });

  test("handles empty string", () => {
    expect(escapeMySqlIdentifier("")).toBe("");
  });
});

describe("isValidDatabaseName", () => {
  test("accepts valid database names", () => {
    expect(isValidDatabaseName("wordpress")).toBe(true);
    expect(isValidDatabaseName("wordpress_dev")).toBe(true);
    expect(isValidDatabaseName("wordpress-dev")).toBe(true);
    expect(isValidDatabaseName("wp123")).toBe(true);
    expect(isValidDatabaseName("my$database")).toBe(true);
  });

  test("rejects empty string", () => {
    expect(isValidDatabaseName("")).toBe(false);
  });

  test("rejects names with special characters", () => {
    expect(isValidDatabaseName("database;drop")).toBe(false);
    expect(isValidDatabaseName("db'test")).toBe(false);
    expect(isValidDatabaseName('db"test')).toBe(false);
    expect(isValidDatabaseName("db`test")).toBe(false);
    expect(isValidDatabaseName("db test")).toBe(false);
    expect(isValidDatabaseName("db/test")).toBe(false);
  });

  test("rejects names that are too long", () => {
    const longName = "a".repeat(65);
    expect(isValidDatabaseName(longName)).toBe(false);
  });

  test("accepts maximum length names", () => {
    const maxName = "a".repeat(64);
    expect(isValidDatabaseName(maxName)).toBe(true);
  });
});

describe("SYSTEM_DATABASES", () => {
  test("contains expected system databases", () => {
    expect(SYSTEM_DATABASES).toContain("mysql");
    expect(SYSTEM_DATABASES).toContain("information_schema");
    expect(SYSTEM_DATABASES).toContain("performance_schema");
    expect(SYSTEM_DATABASES).toContain("sys");
  });

  test("does not contain user databases", () => {
    expect(SYSTEM_DATABASES).not.toContain("wordpress");
    expect(SYSTEM_DATABASES).not.toContain("test");
  });
});
