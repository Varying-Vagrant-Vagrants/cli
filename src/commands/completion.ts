import { Command } from "commander";
import { DEFAULT_VVV_PATH, loadConfig } from "../utils/config.js";
import { existsSync } from "fs";
import { join } from "path";

// All top-level commands
const COMMANDS = [
  "up", "stop", "restart", "status", "ssh", "exec", "reprovision", "destroy",
  "site", "extension", "database", "db", "php", "xdebug",
  "config", "info", "install", "logs", "open", "providers", "service",
  "snapshot", "ssl", "upgrade", "wp", "completion"
];

// Subcommands by parent
const SUBCOMMANDS: Record<string, string[]> = {
  site: ["list", "info", "add", "remove", "enable", "disable", "open", "update", "wp"],
  extension: ["list", "add", "remove", "enable", "disable"],
  database: ["list", "info", "backup", "restore", "import", "drop", "query", "sequel", "tableplus"],
  db: ["list", "info", "backup", "restore", "import", "drop", "query", "sequel", "tableplus"],
  php: ["list"],
  config: ["show", "validate", "edit", "path"],
  service: ["status", "start", "stop", "restart"],
  snapshot: ["list", "save", "restore", "delete"],
  ssl: ["list", "status", "trust"],
  xdebug: ["on", "off", "status"],
  logs: ["nginx-error", "nginx-access", "php", "php-errors", "xdebug", "mysql", "memcached"],
};

// Services for service command
const SERVICES = ["nginx", "php", "mysql", "mariadb", "memcached"];

/**
 * Get site names from VVV config for completion.
 */
function getSiteNames(vvvPath: string): string[] {
  try {
    const configPath = join(vvvPath, "config", "config.yml");
    if (!existsSync(configPath)) {
      return [];
    }
    const config = loadConfig(vvvPath);
    return Object.keys(config.sites || {});
  } catch {
    return [];
  }
}

/**
 * Generate Bash completion script.
 */
function generateBashCompletion(): string {
  return `# vvvlocal bash completion
# Add to ~/.bashrc or ~/.bash_profile:
#   source <(vvvlocal completion bash)
# Or:
#   vvvlocal completion bash >> ~/.bashrc

_vvvlocal_completions() {
  local cur prev words cword
  _init_completion || return

  local commands="${COMMANDS.join(" ")}"
  local site_subcmds="${SUBCOMMANDS.site?.join(" ") || ""}"
  local ext_subcmds="${SUBCOMMANDS.extension?.join(" ") || ""}"
  local db_subcmds="${SUBCOMMANDS.database?.join(" ") || ""}"
  local config_subcmds="${SUBCOMMANDS.config?.join(" ") || ""}"
  local service_subcmds="${SUBCOMMANDS.service?.join(" ") || ""}"
  local snapshot_subcmds="${SUBCOMMANDS.snapshot?.join(" ") || ""}"
  local ssl_subcmds="${SUBCOMMANDS.ssl?.join(" ") || ""}"
  local xdebug_subcmds="${SUBCOMMANDS.xdebug?.join(" ") || ""}"
  local log_types="${SUBCOMMANDS.logs?.join(" ") || ""}"
  local services="${SERVICES.join(" ")}"

  # Get site names dynamically
  local sites=""
  if [[ -f "$HOME/vvv-local/config/config.yml" ]]; then
    sites=$(grep -E "^  [a-zA-Z0-9_-]+:" "$HOME/vvv-local/config/config.yml" 2>/dev/null | sed 's/://g' | awk '{print $1}')
  fi

  case "\${cword}" in
    1)
      COMPREPLY=($(compgen -W "$commands" -- "$cur"))
      ;;
    2)
      case "$prev" in
        site)
          COMPREPLY=($(compgen -W "$site_subcmds" -- "$cur"))
          ;;
        extension|ext)
          COMPREPLY=($(compgen -W "$ext_subcmds" -- "$cur"))
          ;;
        database|db)
          COMPREPLY=($(compgen -W "$db_subcmds" -- "$cur"))
          ;;
        config)
          COMPREPLY=($(compgen -W "$config_subcmds" -- "$cur"))
          ;;
        service)
          COMPREPLY=($(compgen -W "$service_subcmds" -- "$cur"))
          ;;
        snapshot)
          COMPREPLY=($(compgen -W "$snapshot_subcmds" -- "$cur"))
          ;;
        ssl)
          COMPREPLY=($(compgen -W "$ssl_subcmds" -- "$cur"))
          ;;
        xdebug)
          COMPREPLY=($(compgen -W "$xdebug_subcmds" -- "$cur"))
          ;;
        logs)
          COMPREPLY=($(compgen -W "$log_types" -- "$cur"))
          ;;
        wp|open)
          COMPREPLY=($(compgen -W "$sites" -- "$cur"))
          ;;
        *)
          ;;
      esac
      ;;
    3)
      # Third argument - often a site name or service
      case "\${words[1]}" in
        site)
          case "\${words[2]}" in
            info|remove|enable|disable|open|update|wp)
              COMPREPLY=($(compgen -W "$sites" -- "$cur"))
              ;;
          esac
          ;;
        service)
          case "\${words[2]}" in
            start|stop|restart)
              COMPREPLY=($(compgen -W "$services" -- "$cur"))
              ;;
          esac
          ;;
      esac
      ;;
  esac
}

complete -F _vvvlocal_completions vvvlocal
`;
}

/**
 * Generate Zsh completion script.
 */
function generateZshCompletion(): string {
  return `#compdef vvvlocal
# vvvlocal zsh completion
# Add to ~/.zshrc:
#   source <(vvvlocal completion zsh)
# Or place in a file in your $fpath

_vvvlocal() {
  local -a commands subcmds sites services log_types

  commands=(
    'up:Start VVV'
    'stop:Stop VVV'
    'restart:Restart VVV'
    'status:Show VM status'
    'ssh:SSH into VVV'
    'exec:Execute command in VM'
    'reprovision:Reprovision VVV'
    'destroy:Destroy VVV'
    'site:Manage sites'
    'extension:Manage extensions'
    'database:Database operations'
    'db:Database operations (alias)'
    'php:PHP version management'
    'xdebug:Toggle xdebug'
    'config:Configuration management'
    'info:Show VVV info'
    'install:Install VVV'
    'logs:View service logs'
    'open:Open in browser'
    'providers:Show providers'
    'service:Manage services'
    'snapshot:VM snapshots'
    'ssl:SSL certificates'
    'upgrade:Upgrade VVV'
    'wp:Run WP-CLI'
    'completion:Generate shell completion'
  )

  services=(nginx php mysql mariadb memcached)
  log_types=(nginx-error nginx-access php php-errors xdebug mysql memcached)

  # Get sites from config
  if [[ -f "$HOME/vvv-local/config/config.yml" ]]; then
    sites=($(grep -E "^  [a-zA-Z0-9_-]+:" "$HOME/vvv-local/config/config.yml" 2>/dev/null | sed 's/://g' | awk '{print $1}'))
  fi

  _arguments -C \\
    '1: :->command' \\
    '2: :->subcommand' \\
    '3: :->argument' \\
    '*::arg:->args'

  case $state in
    command)
      _describe 'command' commands
      ;;
    subcommand)
      case $words[2] in
        site)
          subcmds=(list info add remove enable disable open update wp)
          _describe 'subcommand' subcmds
          ;;
        extension|ext)
          subcmds=(list add remove enable disable)
          _describe 'subcommand' subcmds
          ;;
        database|db)
          subcmds=(list info backup restore import drop query sequel tableplus)
          _describe 'subcommand' subcmds
          ;;
        config)
          subcmds=(show validate edit path)
          _describe 'subcommand' subcmds
          ;;
        service)
          subcmds=(status start stop restart)
          _describe 'subcommand' subcmds
          ;;
        snapshot)
          subcmds=(list save restore delete)
          _describe 'subcommand' subcmds
          ;;
        ssl)
          subcmds=(list status trust)
          _describe 'subcommand' subcmds
          ;;
        xdebug)
          subcmds=(on off status)
          _describe 'subcommand' subcmds
          ;;
        logs)
          _describe 'log type' log_types
          ;;
        wp|open)
          _describe 'site' sites
          ;;
      esac
      ;;
    argument)
      case $words[2] in
        site)
          case $words[3] in
            info|remove|enable|disable|open|update|wp)
              _describe 'site' sites
              ;;
          esac
          ;;
        service)
          case $words[3] in
            start|stop|restart)
              _describe 'service' services
              ;;
          esac
          ;;
      esac
      ;;
  esac
}

_vvvlocal "$@"
`;
}

/**
 * Generate Fish completion script.
 */
function generateFishCompletion(): string {
  const commandCompletions = COMMANDS.map(cmd =>
    `complete -c vvvlocal -n "__fish_use_subcommand" -a "${cmd}"`
  ).join("\n");

  return `# vvvlocal fish completion
# Add to ~/.config/fish/completions/vvvlocal.fish:
#   vvvlocal completion fish > ~/.config/fish/completions/vvvlocal.fish

# Disable file completion by default
complete -c vvvlocal -f

# Commands
${commandCompletions}

# Site subcommands
complete -c vvvlocal -n "__fish_seen_subcommand_from site" -a "list info add remove enable disable open update wp"

# Extension subcommands
complete -c vvvlocal -n "__fish_seen_subcommand_from extension ext" -a "list add remove enable disable"

# Database subcommands
complete -c vvvlocal -n "__fish_seen_subcommand_from database db" -a "list info backup restore import drop query sequel tableplus"

# Config subcommands
complete -c vvvlocal -n "__fish_seen_subcommand_from config" -a "show validate edit path"

# Service subcommands
complete -c vvvlocal -n "__fish_seen_subcommand_from service" -a "status start stop restart"

# Snapshot subcommands
complete -c vvvlocal -n "__fish_seen_subcommand_from snapshot" -a "list save restore delete"

# SSL subcommands
complete -c vvvlocal -n "__fish_seen_subcommand_from ssl" -a "list status trust"

# Xdebug subcommands
complete -c vvvlocal -n "__fish_seen_subcommand_from xdebug" -a "on off status"

# Log types
complete -c vvvlocal -n "__fish_seen_subcommand_from logs" -a "nginx-error nginx-access php php-errors xdebug mysql memcached"

# Services for service start/stop/restart
complete -c vvvlocal -n "__fish_seen_subcommand_from service; and __fish_seen_subcommand_from start stop restart" -a "nginx php mysql mariadb memcached"

# Dynamic site completion for wp and open commands
function __fish_vvvlocal_sites
  if test -f "$HOME/vvv-local/config/config.yml"
    grep -E "^  [a-zA-Z0-9_-]+:" "$HOME/vvv-local/config/config.yml" 2>/dev/null | sed 's/://g' | awk '{print $1}'
  end
end

complete -c vvvlocal -n "__fish_seen_subcommand_from wp open" -a "(__fish_vvvlocal_sites)"
complete -c vvvlocal -n "__fish_seen_subcommand_from site; and __fish_seen_subcommand_from info remove enable disable open update wp" -a "(__fish_vvvlocal_sites)"
`;
}

export const completionCommand = new Command("completion")
  .description("Generate shell completion scripts")
  .argument("<shell>", "Shell type: bash, zsh, or fish")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .action((shell, options) => {
    const shellLower = shell.toLowerCase();

    switch (shellLower) {
      case "bash":
        console.log(generateBashCompletion());
        break;
      case "zsh":
        console.log(generateZshCompletion());
        break;
      case "fish":
        console.log(generateFishCompletion());
        break;
      default:
        console.error(`Unknown shell: ${shell}`);
        console.error("Supported shells: bash, zsh, fish");
        console.error("");
        console.error("Usage:");
        console.error("  vvvlocal completion bash >> ~/.bashrc");
        console.error("  vvvlocal completion zsh >> ~/.zshrc");
        console.error("  vvvlocal completion fish > ~/.config/fish/completions/vvvlocal.fish");
        process.exit(1);
    }
  });
