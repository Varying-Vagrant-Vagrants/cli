import { describe, test, expect } from "bun:test";
import { join } from "path";
import {
  getSiteLocalPath,
  getSiteVmPath,
  getConfigPath,
  loadConfig,
  type SiteConfig,
} from "../../src/utils/config.js";

const FIXTURES_PATH = join(import.meta.dir, "..", "fixtures");

describe("getConfigPath", () => {
  test("returns correct config path", () => {
    const configPath = getConfigPath("/home/user/vvv");
    expect(configPath).toBe("/home/user/vvv/config/config.yml");
  });

  test("handles trailing slash", () => {
    const configPath = getConfigPath("/home/user/vvv/");
    expect(configPath).toContain("config.yml");
  });
});

describe("getSiteVmPath", () => {
  test("returns default VM path when vm_dir not specified", () => {
    const site: SiteConfig = {};
    const vmPath = getSiteVmPath("wordpress-one", site);
    expect(vmPath).toBe("/srv/www/wordpress-one");
  });

  test("returns custom vm_dir when specified", () => {
    const site: SiteConfig = { vm_dir: "/custom/path" };
    const vmPath = getSiteVmPath("wordpress-one", site);
    expect(vmPath).toBe("/custom/path");
  });

  test("handles site names with hyphens", () => {
    const site: SiteConfig = {};
    const vmPath = getSiteVmPath("my-wordpress-site", site);
    expect(vmPath).toBe("/srv/www/my-wordpress-site");
  });
});

describe("getSiteLocalPath", () => {
  test("returns default local path when local_dir not specified", () => {
    const site: SiteConfig = {};
    const localPath = getSiteLocalPath("/home/user/vvv", "wordpress-one", site);
    expect(localPath).toBe("/home/user/vvv/www/wordpress-one");
  });

  test("returns custom local_dir when specified", () => {
    const site: SiteConfig = { local_dir: "/custom/local/path" };
    const localPath = getSiteLocalPath("/home/user/vvv", "wordpress-one", site);
    expect(localPath).toBe("/custom/local/path");
  });
});

describe("loadConfig", () => {
  test("loads valid config file", () => {
    const config = loadConfig(FIXTURES_PATH);
    expect(config).toBeDefined();
    expect(config.sites).toBeDefined();
  });

  test("parses sites correctly", () => {
    const config = loadConfig(FIXTURES_PATH);
    expect(config.sites?.["wordpress-one"]).toBeDefined();
    expect(config.sites?.["wordpress-two"]).toBeDefined();
    expect(config.sites?.["wordpress-develop"]).toBeDefined();
  });

  test("parses site hosts correctly", () => {
    const config = loadConfig(FIXTURES_PATH);
    const site = config.sites?.["wordpress-one"];
    expect(site?.hosts).toContain("one.wordpress.test");
  });

  test("parses skip_provisioning flag", () => {
    const config = loadConfig(FIXTURES_PATH);
    expect(config.sites?.["wordpress-two"]?.skip_provisioning).toBe(true);
    expect(config.sites?.["wordpress-one"]?.skip_provisioning).toBeUndefined();
  });

  test("parses extensions correctly", () => {
    const config = loadConfig(FIXTURES_PATH);
    expect(config.extensions?.core).toContain("tls-ca");
    expect(config.extensions?.core).toContain("phpmyadmin");
  });

  test("parses vm_config correctly", () => {
    const config = loadConfig(FIXTURES_PATH);
    expect(config.vm_config?.provider).toBe("virtualbox");
    expect(config.vm_config?.memory).toBe(2048);
  });

  test("throws error for non-existent config", () => {
    expect(() => loadConfig("/non/existent/path")).toThrow();
  });
});
