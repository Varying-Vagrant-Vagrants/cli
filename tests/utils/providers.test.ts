import { describe, test, expect } from "bun:test";
import {
  PROVIDERS,
  findProvider,
  getProvidersForPlatform,
} from "../../src/utils/providers.js";

describe("PROVIDERS", () => {
  test("contains virtualbox provider", () => {
    const vbox = PROVIDERS.find((p) => p.name === "virtualbox");
    expect(vbox).toBeDefined();
    expect(vbox?.displayName).toBe("VirtualBox");
    expect(vbox?.vagrantName).toBe("virtualbox");
  });

  test("contains docker provider", () => {
    const docker = PROVIDERS.find((p) => p.name === "docker");
    expect(docker).toBeDefined();
    expect(docker?.displayName).toBe("Docker");
  });

  test("contains parallels provider with darwin platform restriction", () => {
    const parallels = PROVIDERS.find((p) => p.name === "parallels");
    expect(parallels).toBeDefined();
    expect(parallels?.platformOnly).toBe("darwin");
  });

  test("contains hyperv provider with win32 platform restriction", () => {
    const hyperv = PROVIDERS.find((p) => p.name === "hyperv");
    expect(hyperv).toBeDefined();
    expect(hyperv?.platformOnly).toBe("win32");
  });

  test("contains vmware provider", () => {
    const vmware = PROVIDERS.find((p) => p.name === "vmware");
    expect(vmware).toBeDefined();
    expect(vmware?.vagrantName).toBe("vmware_desktop");
  });
});

describe("findProvider", () => {
  test("finds provider by name", () => {
    const provider = findProvider("virtualbox");
    expect(provider).toBeDefined();
    expect(provider?.name).toBe("virtualbox");
    expect(provider?.displayName).toBe("VirtualBox");
  });

  test("finds provider by vagrant name", () => {
    const provider = findProvider("vmware_desktop");
    expect(provider).toBeDefined();
    expect(provider?.name).toBe("vmware");
  });

  test("returns undefined for unknown provider", () => {
    const provider = findProvider("unknown-provider");
    expect(provider).toBeUndefined();
  });

  test("returns undefined for empty string", () => {
    const provider = findProvider("");
    expect(provider).toBeUndefined();
  });
});

describe("getProvidersForPlatform", () => {
  test("returns array of providers", () => {
    const providers = getProvidersForPlatform();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThan(0);
  });

  test("always includes cross-platform providers", () => {
    const providers = getProvidersForPlatform();
    const names = providers.map((p) => p.name);
    expect(names).toContain("virtualbox");
    expect(names).toContain("docker");
    expect(names).toContain("vmware");
  });

  test("filters out providers not for current platform", () => {
    const providers = getProvidersForPlatform();
    const currentPlatform = process.platform as "darwin" | "linux" | "win32";

    for (const provider of providers) {
      if (provider.platformOnly) {
        expect(provider.platformOnly).toBe(currentPlatform);
      }
    }
  });
});
