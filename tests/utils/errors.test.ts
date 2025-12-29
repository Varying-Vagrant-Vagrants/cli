import { describe, test, expect } from "bun:test";
import {
  VvvError,
  VvvNotFoundError,
  VvvNotRunningError,
  SiteNotFoundError,
  SiteExistsError,
  VagrantNotFoundError,
  InvalidDatabaseNameError,
  DatabaseNotFoundError,
  SystemDatabaseError,
  TimeoutError,
  ConfigError,
} from "../../src/utils/errors.js";

describe("VvvError", () => {
  test("creates error with message", () => {
    const error = new VvvError("Test error");
    expect(error.message).toBe("Test error");
    expect(error.name).toBe("VvvError");
  });

  test("creates error with suggestion", () => {
    const error = new VvvError("Test error", { suggestion: "Try this" });
    expect(error.suggestion).toBe("Try this");
  });

  test("creates error with custom exit code", () => {
    const error = new VvvError("Test error", { exitCode: 42 });
    expect(error.exitCode).toBe(42);
  });

  test("has default exit code of 1", () => {
    const error = new VvvError("Test error");
    expect(error.exitCode).toBe(1);
  });

  test("is instance of Error", () => {
    const error = new VvvError("Test error");
    expect(error instanceof Error).toBe(true);
  });
});

describe("VvvNotFoundError", () => {
  test("creates error with path", () => {
    const error = new VvvNotFoundError("/home/user/vvv");
    expect(error.message).toContain("/home/user/vvv");
    expect(error.name).toBe("VvvNotFoundError");
  });

  test("has helpful suggestion", () => {
    const error = new VvvNotFoundError("/path");
    expect(error.suggestion).toContain("vvvlocal install");
    expect(error.suggestion).toContain("--path");
  });
});

describe("VvvNotRunningError", () => {
  test("creates error with message", () => {
    const error = new VvvNotRunningError();
    expect(error.message).toContain("not running");
    expect(error.name).toBe("VvvNotRunningError");
  });

  test("has helpful suggestion", () => {
    const error = new VvvNotRunningError();
    expect(error.suggestion).toContain("vvvlocal up");
  });
});

describe("SiteNotFoundError", () => {
  test("creates error with site name", () => {
    const error = new SiteNotFoundError("my-site");
    expect(error.message).toContain("my-site");
    expect(error.name).toBe("SiteNotFoundError");
  });

  test("has helpful suggestion", () => {
    const error = new SiteNotFoundError("my-site");
    expect(error.suggestion).toContain("site list");
  });
});

describe("SiteExistsError", () => {
  test("creates error with site name", () => {
    const error = new SiteExistsError("my-site");
    expect(error.message).toContain("my-site");
    expect(error.message).toContain("already exists");
    expect(error.name).toBe("SiteExistsError");
  });

  test("has helpful suggestion", () => {
    const error = new SiteExistsError("my-site");
    expect(error.suggestion).toContain("site update");
    expect(error.suggestion).toContain("my-site");
  });
});

describe("VagrantNotFoundError", () => {
  test("creates error", () => {
    const error = new VagrantNotFoundError();
    expect(error.message).toContain("Vagrant");
    expect(error.message).toContain("not installed");
    expect(error.name).toBe("VagrantNotFoundError");
  });

  test("has helpful suggestion", () => {
    const error = new VagrantNotFoundError();
    expect(error.suggestion).toContain("vvvlocal install");
  });
});

describe("InvalidDatabaseNameError", () => {
  test("creates error with database name", () => {
    const error = new InvalidDatabaseNameError("bad;name");
    expect(error.message).toContain("bad;name");
    expect(error.name).toBe("InvalidDatabaseNameError");
  });

  test("has helpful suggestion", () => {
    const error = new InvalidDatabaseNameError("bad;name");
    expect(error.suggestion).toContain("letters");
    expect(error.suggestion).toContain("numbers");
  });
});

describe("DatabaseNotFoundError", () => {
  test("creates error with database name", () => {
    const error = new DatabaseNotFoundError("wordpress");
    expect(error.message).toContain("wordpress");
    expect(error.message).toContain("does not exist");
    expect(error.name).toBe("DatabaseNotFoundError");
  });

  test("has helpful suggestion", () => {
    const error = new DatabaseNotFoundError("wordpress");
    expect(error.suggestion).toContain("db list");
  });
});

describe("SystemDatabaseError", () => {
  test("creates error with database name", () => {
    const error = new SystemDatabaseError("mysql");
    expect(error.message).toContain("mysql");
    expect(error.message).toContain("system database");
    expect(error.name).toBe("SystemDatabaseError");
  });

  test("has helpful suggestion", () => {
    const error = new SystemDatabaseError("mysql");
    expect(error.suggestion).toContain("protected");
  });
});

describe("TimeoutError", () => {
  test("creates error with command and timeout", () => {
    const error = new TimeoutError("vagrant up", 30000);
    expect(error.message).toContain("vagrant up");
    expect(error.message).toContain("30s");
    expect(error.name).toBe("TimeoutError");
  });

  test("has helpful suggestion", () => {
    const error = new TimeoutError("cmd", 1000);
    expect(error.suggestion).toContain("vvvlocal status");
  });
});

describe("ConfigError", () => {
  test("creates error with message only", () => {
    const error = new ConfigError("Invalid YAML");
    expect(error.message).toContain("Invalid YAML");
    expect(error.name).toBe("ConfigError");
  });

  test("creates error with file path", () => {
    const error = new ConfigError("Invalid YAML", "/path/config.yml");
    expect(error.message).toContain("/path/config.yml");
    expect(error.message).toContain("Invalid YAML");
  });

  test("has helpful suggestion", () => {
    const error = new ConfigError("Invalid");
    expect(error.suggestion).toContain("config validate");
  });
});
