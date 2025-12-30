/**
 * Tips & Hints system for providing helpful, contextual guidance to users.
 */

import { shouldUseColors } from "./cli.js";
import { getCliConfig, DEFAULT_VVV_PATH } from "./config.js";

interface Tip {
  id: string;
  text: string;
  contexts: string[];
  condition?: "success" | "any";
}

// Session state to avoid repetition
const shownTipsThisSession = new Set<string>();

// Global state for command-line flag
let cliTipsEnabled: boolean | undefined = undefined;

/**
 * Set whether tips are enabled from command-line flag.
 * This overrides config file settings.
 */
export function setTipsEnabledFromCli(enabled: boolean | undefined): void {
  cliTipsEnabled = enabled;
}

/**
 * Database of helpful tips organized by context.
 */
const TIPS: Tip[] = [
  // VM Management Tips
  {
    id: "ssh-quick-access",
    text: "You can SSH into VVV anytime with: vvvlocal ssh",
    contexts: ["up", "restart"],
    condition: "success",
  },
  {
    id: "site-list-after-up",
    text: "Check which sites are running with: vvvlocal site list",
    contexts: ["up", "restart"],
    condition: "success",
  },
  {
    id: "first-boot-slow",
    text: "First boot takes longer due to initial setup. Subsequent starts are faster.",
    contexts: ["up"],
  },
  {
    id: "vagrant-ssh-direct",
    text: "You can run commands directly: vvvlocal ssh -c 'command'",
    contexts: ["ssh"],
  },
  {
    id: "status-check",
    text: "Check VVV status anytime with: vvvlocal status",
    contexts: ["up", "stop"],
    condition: "success",
  },

  // Site Management Tips
  {
    id: "site-info-details",
    text: "View detailed site information with: vvvlocal site info <name>",
    contexts: ["site-list"],
  },
  {
    id: "site-provision-time",
    text: "New sites may take a few minutes to provision on first run.",
    contexts: ["site-add"],
  },
  {
    id: "dns-propagation",
    text: "It may take a moment for DNS changes to propagate.",
    contexts: ["site-add"],
    condition: "success",
  },
  {
    id: "site-clone-faster",
    text: "Cloning existing sites is faster than creating from scratch.",
    contexts: ["site-add"],
  },
  {
    id: "site-wp-cli",
    text: "Access WP-CLI for a site with: vvvlocal wp <site> <command>",
    contexts: ["site-add"],
    condition: "success",
  },
  {
    id: "site-hosts-custom",
    text: "You can add custom hostnames with: vvvlocal site update <name> --host newhost.test",
    contexts: ["site-list", "site-add"],
  },

  // Database Tips
  {
    id: "database-list",
    text: "List all databases with: vvvlocal database list",
    contexts: ["site-add"],
    condition: "success",
  },
  {
    id: "database-backup",
    text: "Back up databases before major changes with: vvvlocal database backup",
    contexts: ["reprovision", "upgrade"],
  },
  {
    id: "database-gui",
    text: "Open databases in Sequel Pro or TablePlus: vvvlocal database sequel|tableplus",
    contexts: ["database-list"],
  },

  // Provisioning Tips
  {
    id: "reprovision-updates",
    text: "Reprovisioning updates your VM configuration and runs site provisioners.",
    contexts: ["reprovision"],
  },
  {
    id: "provision-single-site",
    text: "Provision just one site with: vvvlocal site add <name> --provision",
    contexts: ["reprovision"],
  },
  {
    id: "skip-provisioning",
    text: "Speed up startup by disabling slow site provisioners with: vvvlocal site disable <name>",
    contexts: ["up"],
  },

  // PHP & Development Tips
  {
    id: "php-versions",
    text: "Check installed PHP versions with: vvvlocal php list",
    contexts: ["up", "restart"],
  },
  {
    id: "xdebug-toggle",
    text: "Toggle Xdebug on/off with: vvvlocal xdebug on|off",
    contexts: ["up", "php-list"],
  },
  {
    id: "logs-viewing",
    text: "View VVV logs with: vvvlocal logs",
    contexts: ["doctor"],
  },

  // Troubleshooting Tips
  {
    id: "doctor-health",
    text: "Run 'vvvlocal doctor' regularly to catch configuration issues early.",
    contexts: ["up"],
  },
  {
    id: "doctor-diagnostic",
    text: "If a site isn't working, try: vvvlocal doctor to diagnose issues.",
    contexts: ["site-add"],
  },
  {
    id: "reprovision-fix",
    text: "If sites aren't loading, try reprovisioning: vvvlocal reprovision",
    contexts: ["doctor"],
  },
  {
    id: "restart-fresh",
    text: "If VVV seems stuck, try: vvvlocal restart",
    contexts: ["doctor", "status"],
  },

  // Services Tips
  {
    id: "service-status",
    text: "Check service status with: vvvlocal service status",
    contexts: ["up", "restart"],
  },
  {
    id: "service-restart",
    text: "Restart individual services with: vvvlocal service restart <service>",
    contexts: ["service-status"],
  },

  // SSL/Hosts Tips
  {
    id: "ssl-trust",
    text: "Trust VVV's SSL certificate to avoid browser warnings: vvvlocal ssl trust",
    contexts: ["up", "site-add"],
  },
  {
    id: "hosts-passwordless",
    text: "Enable passwordless hosts file updates: vvvlocal hosts sudoers",
    contexts: ["up", "site-add"],
  },

  // Configuration Tips
  {
    id: "config-edit",
    text: "Edit VVV config directly with: vvvlocal config edit",
    contexts: ["site-list"],
  },
  {
    id: "config-validate",
    text: "Validate your config file with: vvvlocal config validate",
    contexts: ["config-edit"],
  },

  // Performance Tips
  {
    id: "snapshot-save",
    text: "Save VM snapshots for quick rollbacks: vvvlocal snapshot save <name>",
    contexts: ["up"],
  },
  {
    id: "providers-check",
    text: "Check available virtualization providers: vvvlocal providers",
    contexts: ["install"],
  },
];

/**
 * Check if tips are enabled based on priority:
 * 1. Command-line flag (--no-tips)
 * 2. Config file (cli.tips: false)
 * 3. Default (enabled)
 */
function areTipsEnabled(vvvPath: string): boolean {
  // 1. Command-line flag takes priority
  if (cliTipsEnabled === false) {
    return false;
  }

  // 2. Check config file
  const cliConfig = getCliConfig(vvvPath);
  if (cliConfig.tips === false) {
    return false;
  }

  // 3. Default: enabled
  return true;
}

/**
 * Determine if a tip should be shown based on current context.
 * Shows tips ~30% of the time to avoid clutter.
 */
function shouldShowTip(vvvPath: string): boolean {
  // Don't show in non-TTY (piped, redirected)
  if (!shouldUseColors()) {
    return false;
  }

  // Check if tips are enabled
  if (!areTipsEnabled(vvvPath)) {
    return false;
  }

  // Show tips 30% of the time
  return Math.random() < 0.3;
}

/**
 * Display a contextual tip to the user.
 *
 * @param context - The command context (e.g., 'up', 'site-add')
 * @param condition - Show only on success, or anytime
 * @param vvvPath - Path to VVV installation (for config reading)
 */
export function displayTip(
  context: string,
  condition: "success" | "any" = "success",
  vvvPath: string = DEFAULT_VVV_PATH
): void {
  if (!shouldShowTip(vvvPath)) {
    return;
  }

  // Filter applicable tips
  const applicable = TIPS.filter(
    (tip) =>
      tip.contexts.includes(context) &&
      (!tip.condition || tip.condition === condition || condition === "any") &&
      !shownTipsThisSession.has(tip.id)
  );

  if (applicable.length === 0) {
    return;
  }

  // Select random tip
  const tip = applicable[Math.floor(Math.random() * applicable.length)];
  if (!tip) {
    return;
  }

  shownTipsThisSession.add(tip.id);

  // Display with dimmed styling
  console.log("");
  console.log(`\x1b[2mTip: ${tip.text}\x1b[0m`);
}
