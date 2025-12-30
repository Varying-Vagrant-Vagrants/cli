import { describe, test, expect } from "bun:test";
import { shortenPath, replaceHomeWithTilde } from "../../src/utils/paths.js";
import { homedir, platform } from "os";

describe("shortenPath", () => {
  test("returns relative path when inside base path", () => {
    const basePath = "/Users/tom/vvv-local";
    const fullPath = "/Users/tom/vvv-local/www/wordpress-one";
    expect(shortenPath(fullPath, basePath)).toBe("www/wordpress-one");
  });

  test("returns relative path for nested directories", () => {
    const basePath = "/home/user/vvv";
    const fullPath = "/home/user/vvv/www/mysite/public_html";
    expect(shortenPath(fullPath, basePath)).toBe("www/mysite/public_html");
  });

  test("handles paths outside base path", () => {
    const basePath = "/Users/tom/vvv-local";
    const fullPath = "/var/www/custom-site";
    const result = shortenPath(fullPath, basePath);
    // Should not be relative, stays as full path
    expect(result).toBe("/var/www/custom-site");
  });

  test("handles trailing slashes", () => {
    const basePath = "/Users/tom/vvv-local/";
    const fullPath = "/Users/tom/vvv-local/www/site";
    expect(shortenPath(fullPath, basePath)).toBe("www/site");
  });
});

describe("replaceHomeWithTilde", () => {
  const home = homedir();

  test("replaces home directory with ~", () => {
    if (platform() === "win32") {
      // Skip on Windows
      return;
    }
    const path = `${home}/vvv-local/www/site`;
    expect(replaceHomeWithTilde(path)).toBe("~/vvv-local/www/site");
  });

  test("leaves paths outside home unchanged", () => {
    const path = "/var/www/site";
    expect(replaceHomeWithTilde(path)).toBe("/var/www/site");
  });

  test("handles exact home directory", () => {
    if (platform() === "win32") {
      return;
    }
    expect(replaceHomeWithTilde(home)).toBe("~");
  });
});
