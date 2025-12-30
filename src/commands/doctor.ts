import { Command } from "commander";
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve, join } from "path";
import { DEFAULT_VVV_PATH, loadConfig, getConfigPath, vvvExists } from "../utils/config.js";
import { cli, isVerbose, verbose } from "../utils/cli.js";
import { isVagrantInstalled, vagrantSshSync, vagrantRunSync } from "../utils/vagrant.js";
import { detectAvailableProvidersAsync, getCurrentProvider } from "../utils/providers.js";
import { checkPortConflicts, VVV_PORTS } from "../utils/ports.js";

// VVV version helpers
function getVVVVersion(vvvPath: string): string {
  const versionFile = join(vvvPath, "version");
  if (existsSync(versionFile)) {
    return readFileSync(versionFile, "utf-8").trim();
  }
  return "unknown";
}

function isGitInstall(vvvPath: string): boolean {
  return existsSync(join(vvvPath, ".git"));
}

function getGitBranch(vvvPath: string): string | null {
  if (!isGitInstall(vvvPath)) {
    return null;
  }
  const result = spawnSync("git", ["branch", "--show-current"], {
    cwd: vvvPath,
    encoding: "utf-8",
    timeout: 5000,
  });
  if (result.status === 0) {
    return result.stdout.trim();
  }
  return null;
}

async function getLatestVVVVersion(): Promise<string | null> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/Varying-Vagrant-Vagrants/VVV/releases/latest",
      { signal: AbortSignal.timeout(5000) }
    );
    if (response.ok) {
      const data = await response.json() as { tag_name?: string };
      return data.tag_name?.replace(/^v/, "") || null;
    }
  } catch {
    // Network error, ignore
  }
  return null;
}

function compareVersions(current: string, latest: string): number {
  const currentParts = current.split(".").map(Number);
  const latestParts = latest.split(".").map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const c = currentParts[i] || 0;
    const l = latestParts[i] || 0;
    if (c < l) return -1;
    if (c > l) return 1;
  }
  return 0;
}

// Check result types
interface CheckResult {
  name: string;
  category: string;
  status: "pass" | "fail" | "warn" | "skip";
  message: string;
  suggestion?: string;
  details?: string;
}

interface CheckContext {
  vvvPath: string;
  vmRunning: boolean;
  provider: string | null;
  availableProviders: string[];
}

// Helper to create check results
function pass(name: string, category: string, message: string, details?: string): CheckResult {
  return { name, category, status: "pass", message, details };
}

function fail(name: string, category: string, message: string, suggestion?: string, details?: string): CheckResult {
  return { name, category, status: "fail", message, suggestion, details };
}

function warn(name: string, category: string, message: string, suggestion?: string, details?: string): CheckResult {
  return { name, category, status: "warn", message, suggestion, details };
}

function skip(name: string, category: string, message: string): CheckResult {
  return { name, category, status: "skip", message };
}

// =============================================================================
// PREREQUISITE CHECKS
// =============================================================================

async function checkPrerequisites(ctx: CheckContext): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const category = "Prerequisites";

  // Check Vagrant installed
  if (isVagrantInstalled()) {
    const versionResult = spawnSync("vagrant", ["--version"], { encoding: "utf-8" });
    const version = versionResult.stdout?.match(/Vagrant (\d+\.\d+\.\d+)/)?.[1] || "unknown";
    results.push(pass("Vagrant installed", category, `Vagrant ${version}`));

    // Check version >= 2.2.0
    const versionParts = version.split(".").map(Number);
    const major = versionParts[0] ?? 0;
    const minor = versionParts[1] ?? 0;
    if (major < 2 || (major === 2 && minor < 2)) {
      results.push(warn("Vagrant version", category, `Vagrant ${version} is old`, "Upgrade to Vagrant 2.2.0 or later"));
    }
  } else {
    results.push(fail("Vagrant installed", category, "Vagrant is not installed", "Install Vagrant from https://www.vagrantup.com/"));
  }

  // Check providers
  const providers = await detectAvailableProvidersAsync();
  ctx.availableProviders = providers.map(p => p.name);

  if (ctx.availableProviders.length > 0) {
    results.push(pass("Provider available", category, ctx.availableProviders.join(", ")));
  } else {
    results.push(fail("Provider available", category, "No virtualization provider found", "Install Docker, VirtualBox, Parallels, or VMware"));
  }

  // Provider-specific checks - only check configured provider, not all available
  // We'll get the configured provider later, but for now check what's likely to be used
  // based on what's available. Docker takes precedence if available.
  const likelyProvider = ctx.availableProviders.includes("docker") ? "docker" :
                         ctx.availableProviders.includes("parallels") ? "parallels" :
                         ctx.availableProviders.includes("vmware_desktop") ? "vmware_desktop" :
                         ctx.availableProviders[0] || null;

  if (likelyProvider === "docker") {
    const dockerInfo = spawnSync("docker", ["info"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    if (dockerInfo.status === 0) {
      results.push(pass("Docker running", category, "Docker daemon is running"));
      // Port conflict checks are done later after we know VM state
      // (we skip them if VVV is running since it legitimately uses those ports)
    } else {
      results.push(fail("Docker running", category, "Docker is installed but not running", "Start Docker Desktop or the Docker daemon"));
    }
  }

  if (likelyProvider === "parallels") {
    const prlResult = spawnSync("prlctl", ["--version"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    const prlOutput = prlResult.stdout || "";
    // Parallels Pro/Business is required for Vagrant
    if (prlOutput.includes("Pro") || prlOutput.includes("Business")) {
      results.push(pass("Parallels edition", category, "Parallels Pro/Business detected"));
    } else {
      results.push(fail("Parallels edition", category, "Parallels Standard does not support Vagrant", "Upgrade to Parallels Pro or Business edition"));
    }

    // Check vagrant-parallels plugin
    const pluginResult = spawnSync("vagrant", ["plugin", "list"], { encoding: "utf-8" });
    if (pluginResult.stdout?.includes("vagrant-parallels")) {
      results.push(pass("Parallels plugin", category, "vagrant-parallels plugin installed"));
    } else {
      results.push(fail("Parallels plugin", category, "vagrant-parallels plugin not installed", "Run: vagrant plugin install vagrant-parallels"));
    }
  }

  if (likelyProvider === "vmware_desktop" || likelyProvider === "vmware_workstation") {
    const pluginResult = spawnSync("vagrant", ["plugin", "list"], { encoding: "utf-8" });
    if (pluginResult.stdout?.includes("vagrant-vmware")) {
      results.push(pass("VMware plugin", category, "vagrant-vmware plugin installed"));
    } else {
      results.push(fail("VMware plugin", category, "vagrant-vmware plugin not installed", "Run: vagrant plugin install vagrant-vmware-desktop"));
    }
  }

  // Check Git installed
  const gitResult = spawnSync("git", ["--version"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
  if (gitResult.status === 0) {
    const gitVersion = gitResult.stdout?.match(/git version (\d+\.\d+\.\d+)/)?.[1] || "installed";
    results.push(pass("Git installed", category, `Git ${gitVersion}`));
  } else {
    results.push(warn("Git installed", category, "Git is not installed", "Install Git for VVV updates"));
  }

  // Check disk space
  const dfResult = spawnSync("df", ["-k", ctx.vvvPath], { encoding: "utf-8" });
  if (dfResult.status === 0 && dfResult.stdout) {
    const lines = dfResult.stdout.trim().split("\n");
    const dataLine = lines[1];
    if (dataLine) {
      const parts = dataLine.split(/\s+/);
      const availableStr = parts[3] ?? "0";
      const availableKB = parseInt(availableStr, 10);
      const availableGB = (availableKB / 1024 / 1024).toFixed(1);
      if (availableKB > 5 * 1024 * 1024) {
        results.push(pass("Disk space", category, `${availableGB}GB free`));
      } else {
        results.push(warn("Disk space", category, `Only ${availableGB}GB free`, "Free up disk space (recommend > 5GB)"));
      }
    }
  }

  return results;
}

// =============================================================================
// VVV INSTALLATION CHECKS
// =============================================================================

async function checkVvvInstallation(ctx: CheckContext): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const category = "VVV Installation";

  // Check VVV directory exists
  if (vvvExists(ctx.vvvPath)) {
    results.push(pass("VVV directory", category, ctx.vvvPath));
  } else {
    results.push(fail("VVV directory", category, `VVV not found at ${ctx.vvvPath}`, "Run: vvvlocal install"));
    return results; // Can't check anything else
  }

  // Check VVV version
  const currentVersion = getVVVVersion(ctx.vvvPath);
  const isGit = isGitInstall(ctx.vvvPath);
  const gitBranch = isGit ? getGitBranch(ctx.vvvPath) : null;

  if (currentVersion !== "unknown") {
    // Fetch latest version in background
    const latestVersion = await getLatestVVVVersion();

    if (latestVersion) {
      const comparison = compareVersions(currentVersion, latestVersion);
      if (comparison < 0) {
        const versionInfo = gitBranch ? `${currentVersion} (${gitBranch})` : currentVersion;
        results.push(warn("VVV version", category,
          `VVV ${versionInfo} - update available: ${latestVersion}`,
          isGit ? "Run: vvvlocal upgrade" : "Download latest from https://varyingvagrantvagrants.org/"));
      } else {
        const versionInfo = gitBranch ? `${currentVersion} (${gitBranch})` : currentVersion;
        results.push(pass("VVV version", category, `VVV ${versionInfo} (latest)`));
      }
    } else {
      // Couldn't fetch latest, just show current
      const versionInfo = gitBranch ? `${currentVersion} (${gitBranch})` : currentVersion;
      results.push(pass("VVV version", category, `VVV ${versionInfo}`));
    }
  } else {
    results.push(warn("VVV version", category, "Could not determine VVV version"));
  }

  // Check Vagrantfile
  const vagrantfilePath = resolve(ctx.vvvPath, "Vagrantfile");
  if (existsSync(vagrantfilePath)) {
    results.push(pass("Vagrantfile", category, "Vagrantfile present"));
  } else {
    results.push(fail("Vagrantfile", category, "Vagrantfile not found", "VVV installation may be corrupted. Try reinstalling."));
  }

  // Check config file
  const configPath = getConfigPath(ctx.vvvPath);
  if (existsSync(configPath)) {
    results.push(pass("Config file", category, "config.yml present"));

    // Try to parse config
    try {
      loadConfig(ctx.vvvPath);
      results.push(pass("Config valid", category, "YAML parses correctly"));

      // Check provider match
      const configuredProvider = getCurrentProvider(ctx.vvvPath);
      ctx.provider = configuredProvider;
      if (configuredProvider) {
        if (ctx.availableProviders.includes(configuredProvider)) {
          results.push(pass("Provider match", category, `Provider "${configuredProvider}" is available`));
        } else {
          results.push(fail("Provider match", category,
            `Config uses "${configuredProvider}" but it's not installed`,
            `Install ${configuredProvider} or change provider in config.yml`));
        }
      }
    } catch (e) {
      const error = e as Error;
      results.push(fail("Config valid", category, "Config file has errors", error.message));
    }
  } else {
    results.push(fail("Config file", category, "config.yml not found", "Copy config/default-config.yml to config/config.yml"));
  }

  return results;
}

// =============================================================================
// VM STATE CHECKS
// =============================================================================

function checkVmState(ctx: CheckContext): CheckResult[] {
  const results: CheckResult[] = [];
  const category = "VM State";

  // Check VM status
  const statusResult = vagrantRunSync(["status", "--machine-readable"], ctx.vvvPath);
  const statusOutput = statusResult.stdout || "";

  if (statusOutput.includes(",state,running")) {
    results.push(pass("VM running", category, "VM is running"));
    ctx.vmRunning = true;
  } else if (statusOutput.includes(",state,")) {
    const stateMatch = statusOutput.match(/,state,(\w+)/);
    const state = stateMatch?.[1] || "unknown";
    results.push(fail("VM running", category, `VM is ${state}`, "Run: vvvlocal up"));
    ctx.vmRunning = false;
    return results; // Can't check SSH if not running
  } else {
    results.push(fail("VM running", category, "Could not determine VM state", "Run: vagrant status"));
    ctx.vmRunning = false;
    return results;
  }

  // Check SSH accessible
  const sshResult = vagrantSshSync("echo vvv-doctor-ok", ctx.vvvPath);
  if (sshResult.stdout?.includes("vvv-doctor-ok")) {
    results.push(pass("SSH accessible", category, "Can SSH into VM"));
  } else {
    results.push(fail("SSH accessible", category, "Cannot SSH into VM", "Try: vagrant ssh"));
    return results;
  }

  // Check time sync (warn if off by more than 5 minutes)
  const timeResult = vagrantSshSync("date +%s", ctx.vvvPath);
  const vmTime = parseInt(timeResult.stdout?.trim() || "0", 10);
  const hostTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(vmTime - hostTime);

  if (timeDiff < 300) {
    results.push(pass("Time sync", category, "VM time is synchronized"));
  } else {
    const diffMinutes = Math.round(timeDiff / 60);
    results.push(warn("Time sync", category, `VM time differs by ${diffMinutes} minutes`, "This may cause SSL and caching issues"));
  }

  return results;
}

// =============================================================================
// SERVICES CHECKS
// =============================================================================

function checkServices(ctx: CheckContext): CheckResult[] {
  const results: CheckResult[] = [];
  const category = "Services";

  if (!ctx.vmRunning) {
    results.push(skip("Services", category, "Skipped (VM not running)"));
    return results;
  }

  // Check Nginx
  const nginxResult = vagrantSshSync("sudo service nginx status 2>&1", ctx.vvvPath);
  if (nginxResult.stdout?.includes("is running")) {
    results.push(pass("Nginx", category, "Nginx is running"));
  } else {
    results.push(fail("Nginx", category, "Nginx is not running", "Run: vvvlocal service start nginx"));
  }

  // Check MariaDB
  const mariaResult = vagrantSshSync("mysqladmin ping 2>&1", ctx.vvvPath);
  if (mariaResult.stdout?.includes("alive")) {
    results.push(pass("MariaDB", category, "MariaDB is running"));
  } else {
    results.push(fail("MariaDB", category, "MariaDB is not running", "Run: vvvlocal service start mariadb"));
  }

  // Check PHP-FPM (at least one version)
  const phpResult = vagrantSshSync("sudo service php8.2-fpm status 2>&1 || sudo service php8.1-fpm status 2>&1 || sudo service php8.0-fpm status 2>&1", ctx.vvvPath);
  if (phpResult.stdout?.includes("is running")) {
    results.push(pass("PHP-FPM", category, "PHP-FPM is running"));
  } else {
    results.push(fail("PHP-FPM", category, "No PHP-FPM service running", "Run: vvvlocal service start php"));
  }

  // Check Memcached (warn only)
  // Uses pgrep fallback since service script may not detect manually started processes
  const memcachedResult = vagrantSshSync("sudo service memcached status 2>&1", ctx.vvvPath);
  if (memcachedResult.stdout?.includes("is running")) {
    results.push(pass("Memcached", category, "Memcached is running"));
  } else if (memcachedResult.stdout?.includes("unrecognized service")) {
    results.push(skip("Memcached", category, "Memcached not installed"));
  } else {
    // Fallback: check if process is actually running
    const pgrepResult = vagrantSshSync("pgrep -x memcached >/dev/null && echo running || echo stopped", ctx.vvvPath);
    if (pgrepResult.stdout?.includes("running")) {
      results.push(pass("Memcached", category, "Memcached is running"));
    } else {
      results.push(warn("Memcached", category, "Memcached is not running (optional)", "Run: vvvlocal service start memcached"));
    }
  }

  return results;
}

// =============================================================================
// NETWORK & SITES CHECKS
// =============================================================================

async function checkNetwork(ctx: CheckContext): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const category = "Network";

  if (!ctx.vmRunning) {
    results.push(skip("Network", category, "Skipped (VM not running)"));
    return results;
  }

  // Check dashboard accessible
  try {
    const response = await fetch("http://vvv.test/", {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      results.push(pass("Dashboard", category, "vvv.test is accessible"));
    } else {
      results.push(fail("Dashboard", category, `vvv.test returned ${response.status}`, "Check nginx configuration"));
    }
  } catch {
    results.push(fail("Dashboard", category, "Cannot reach vvv.test", "Check hosts file and run: vvvlocal up --provision"));
  }

  // Check hosts file for configured sites
  try {
    const config = loadConfig(ctx.vvvPath);
    const hostsResult = spawnSync("cat", ["/etc/hosts"], { encoding: "utf-8" });
    const hostsContent = hostsResult.stdout || "";

    const missingHosts: string[] = [];
    if (config.sites) {
      for (const [siteName, siteConfig] of Object.entries(config.sites)) {
        if (siteConfig.skip_provisioning) continue;
        const hosts = siteConfig.hosts || [`${siteName}.test`];
        for (const host of hosts) {
          if (!hostsContent.includes(host)) {
            missingHosts.push(host);
          }
        }
      }
    }

    if (missingHosts.length === 0) {
      results.push(pass("Hosts file", category, "All sites in hosts file"));
    } else if (missingHosts.length <= 3) {
      results.push(fail("Hosts file", category, `Missing: ${missingHosts.join(", ")}`, "Run: vvvlocal up --provision"));
    } else {
      results.push(fail("Hosts file", category, `${missingHosts.length} hosts missing from /etc/hosts`, "Run: vvvlocal up --provision"));
    }
  } catch {
    results.push(warn("Hosts file", category, "Could not check hosts file"));
  }

  // Check SSL certificates
  const sslResult = vagrantSshSync("openssl x509 -in /etc/nginx/server-2.1.0.crt -noout -enddate 2>/dev/null || echo 'no-cert'", ctx.vvvPath);
  if (sslResult.stdout?.includes("no-cert")) {
    results.push(warn("SSL certificate", category, "No SSL certificate found"));
  } else {
    const dateMatch = sslResult.stdout?.match(/notAfter=(.+)/);
    if (dateMatch && dateMatch[1]) {
      const expiry = new Date(dateMatch[1]);
      const daysRemaining = Math.floor((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) {
        results.push(fail("SSL certificate", category, "SSL certificate has expired", "Reprovision to regenerate certificates"));
      } else if (daysRemaining < 7) {
        results.push(warn("SSL certificate", category, `SSL certificate expires in ${daysRemaining} days`));
      } else {
        results.push(pass("SSL certificate", category, `Valid for ${daysRemaining} days`));
      }
    }
  }

  return results;
}

// =============================================================================
// DATABASE CHECKS
// =============================================================================

function checkDatabase(ctx: CheckContext): CheckResult[] {
  const results: CheckResult[] = [];
  const category = "Database";

  if (!ctx.vmRunning) {
    results.push(skip("Database", category, "Skipped (VM not running)"));
    return results;
  }

  // Check MySQL connection
  const connResult = vagrantSshSync("mysql -e 'SELECT 1' 2>&1", ctx.vvvPath);
  if (connResult.status === 0) {
    results.push(pass("MySQL connection", category, "Can connect to MySQL"));
  } else {
    results.push(fail("MySQL connection", category, "Cannot connect to MySQL", "Check MariaDB service"));
    return results;
  }

  // Check system databases exist
  const dbResult = vagrantSshSync("mysql -e 'SHOW DATABASES' 2>&1", ctx.vvvPath);
  const dbs = dbResult.stdout || "";
  if (dbs.includes("mysql") && dbs.includes("information_schema")) {
    results.push(pass("System databases", category, "System databases present"));
  } else {
    results.push(fail("System databases", category, "System databases missing", "MySQL installation may be corrupted"));
  }

  return results;
}

// =============================================================================
// CONFIGURATION CHECKS
// =============================================================================

function checkConfiguration(ctx: CheckContext): CheckResult[] {
  const results: CheckResult[] = [];
  const category = "Configuration";

  try {
    const config = loadConfig(ctx.vvvPath);

    if (!config.sites || Object.keys(config.sites).length === 0) {
      results.push(warn("Sites configured", category, "No sites configured"));
      return results;
    }

    const allHosts: string[] = [];
    const duplicateHosts: string[] = [];
    let sitesWithoutHosts = 0;

    for (const [_siteName, siteConfig] of Object.entries(config.sites)) {
      if (siteConfig.skip_provisioning) continue;

      // Check hosts defined
      const hosts = siteConfig.hosts || [];
      if (hosts.length === 0) {
        sitesWithoutHosts++;
      }

      // Check for duplicate hosts
      for (const host of hosts) {
        if (allHosts.includes(host)) {
          duplicateHosts.push(host);
        }
        allHosts.push(host);
      }
    }

    if (sitesWithoutHosts > 0) {
      results.push(warn("Sites have hosts", category, `${sitesWithoutHosts} site(s) have no hosts defined`));
    } else {
      results.push(pass("Sites have hosts", category, "All sites have hosts defined"));
    }

    if (duplicateHosts.length > 0) {
      results.push(fail("Duplicate hosts", category, `Duplicate hosts: ${duplicateHosts.join(", ")}`, "Each host should only be used by one site"));
    } else {
      results.push(pass("Duplicate hosts", category, "No duplicate hosts"));
    }

  } catch {
    results.push(skip("Configuration", category, "Could not load config"));
  }

  return results;
}

// =============================================================================
// LOG FILES CHECKS
// =============================================================================

function checkLogFiles(ctx: CheckContext): CheckResult[] {
  const results: CheckResult[] = [];
  const category = "Log Files";

  if (!ctx.vmRunning) {
    results.push(skip("Log Files", category, "Skipped (VM not running)"));
    return results;
  }

  // Check log sizes
  const checkLog = (name: string, path: string, maxMB: number) => {
    const result = vagrantSshSync(`du -k ${path} 2>/dev/null | cut -f1`, ctx.vvvPath);
    const sizeKB = parseInt(result.stdout?.trim() || "0", 10);
    const sizeMB = sizeKB / 1024;

    if (sizeKB === 0) {
      // File doesn't exist or is empty - that's fine
      return;
    }

    if (sizeMB > maxMB) {
      results.push(warn(`${name} log`, category, `${name} log is ${sizeMB.toFixed(0)}MB`, `Consider rotating logs in ${path}`));
    } else {
      verbose(`${name} log: ${sizeMB.toFixed(1)}MB`);
    }
  };

  checkLog("Nginx error", "/var/log/nginx/error.log", 100);
  checkLog("MySQL error", "/var/log/mysql/error.log", 100);

  // Check VM disk usage
  const dfResult = vagrantSshSync("df -h / | tail -1 | awk '{print $5}'", ctx.vvvPath);
  const usageStr = dfResult.stdout?.trim().replace("%", "") || "0";
  const usage = parseInt(usageStr, 10);

  if (usage >= 90) {
    results.push(warn("VM disk usage", category, `VM disk is ${usage}% full`, "Free up space in the VM"));
  } else if (usage >= 80) {
    results.push(warn("VM disk usage", category, `VM disk is ${usage}% full`));
  } else {
    results.push(pass("VM disk usage", category, `VM disk is ${usage}% used`));
  }

  return results;
}

// =============================================================================
// MAIN DOCTOR COMMAND
// =============================================================================

async function runAllChecks(vvvPath: string): Promise<CheckResult[]> {
  const ctx: CheckContext = {
    vvvPath,
    vmRunning: false,
    provider: null,
    availableProviders: [],
  };

  const results: CheckResult[] = [];

  // Phase 1: Prerequisites (can run without VM)
  verbose("Checking prerequisites...");
  results.push(...await checkPrerequisites(ctx));

  // Phase 2: VVV Installation (can run without VM)
  verbose("Checking VVV installation...");
  results.push(...await checkVvvInstallation(ctx));

  // Phase 3: VM State (determines if we can continue)
  verbose("Checking VM state...");
  results.push(...checkVmState(ctx));

  // Check for port conflicts when using Docker and VM is NOT running
  // (if VM is running, it's using those ports legitimately)
  if (!ctx.vmRunning && ctx.provider === "docker") {
    const category = "Prerequisites";
    const portConflicts = checkPortConflicts(VVV_PORTS);

    for (const conflict of portConflicts) {
      results.push(fail(
        `Port ${conflict.port} available`,
        category,
        `Port ${conflict.port} (${conflict.service}) is in use by ${conflict.process}`,
        conflict.suggestion
      ));
    }

    // Show pass for ports that are available
    for (const port of VVV_PORTS) {
      if (!portConflicts.find(c => c.port === port)) {
        const service = port === 80 ? "HTTP" : port === 443 ? "HTTPS" : port === 3306 ? "MySQL" : `Port ${port}`;
        results.push(pass(`Port ${port} available`, category, `Port ${port} (${service}) is available`));
      }
    }
  }

  // Fail fast if VM not running
  if (!ctx.vmRunning) {
    return results;
  }

  // Phase 4: Services (requires VM)
  verbose("Checking services...");
  results.push(...checkServices(ctx));

  // Phase 5: Network (requires VM)
  verbose("Checking network...");
  results.push(...await checkNetwork(ctx));

  // Phase 6: Database (requires VM)
  verbose("Checking database...");
  results.push(...checkDatabase(ctx));

  // Phase 7: Configuration (can run without VM but more useful with)
  verbose("Checking configuration...");
  results.push(...checkConfiguration(ctx));

  // Phase 8: Log files (requires VM)
  verbose("Checking log files...");
  results.push(...checkLogFiles(ctx));

  return results;
}

function displayResults(results: CheckResult[], asJson: boolean): void {
  if (asJson) {
    const summary = {
      passed: results.filter(r => r.status === "pass").length,
      failed: results.filter(r => r.status === "fail").length,
      warnings: results.filter(r => r.status === "warn").length,
      skipped: results.filter(r => r.status === "skip").length,
    };
    console.log(JSON.stringify({ results, summary }, null, 2));
    return;
  }

  console.log("");
  cli.bold("VVV Doctor");
  console.log("");

  // Group by category
  const categories = new Map<string, CheckResult[]>();
  for (const result of results) {
    const existing = categories.get(result.category) || [];
    existing.push(result);
    categories.set(result.category, existing);
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "pass": return cli.format.success("\u2713");
      case "fail": return cli.format.error("\u2717");
      case "warn": return cli.format.warning("\u26A0");
      case "skip": return cli.format.dim("-");
      default: return "?";
    }
  };

  for (const [category, checks] of categories) {
    console.log(cli.format.bold(category));
    for (const check of checks) {
      console.log(`  ${statusIcon(check.status)} ${check.message}`);
      if (check.suggestion && (check.status === "fail" || check.status === "warn")) {
        console.log(cli.format.dim(`    \u2192 ${check.suggestion}`));
      }
      if (isVerbose() && check.details) {
        console.log(cli.format.dim(`    ${check.details}`));
      }
    }
    console.log("");
  }

  // Summary
  const passed = results.filter(r => r.status === "pass").length;
  const failed = results.filter(r => r.status === "fail").length;
  const warnings = results.filter(r => r.status === "warn").length;

  console.log("\u2500".repeat(40));
  const parts = [];
  if (passed > 0) parts.push(cli.format.success(`${passed} passed`));
  if (warnings > 0) parts.push(cli.format.warning(`${warnings} warning${warnings > 1 ? "s" : ""}`));
  if (failed > 0) parts.push(cli.format.error(`${failed} failed`));
  console.log(`Results: ${parts.join(", ")}`);

  if (failed > 0) {
    console.log("");
    process.exit(1);
  }
}

export const doctorCommand = new Command("doctor")
  .alias("diagnose")
  .description("Run diagnostic checks on VVV installation")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const results = await runAllChecks(options.path);
    displayResults(results, options.json);
  });
