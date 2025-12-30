# vvvlocal CLI

A CLI tool for managing [VVV (Varying Vagrant Vagrants)](https://varyingvagrantvagrants.org/) installations.

## Installation

### From a Release Binary

Download the appropriate binary for your platform from the releases page and place it in your PATH:

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `vvvlocal-darwin-arm64` |
| macOS (Intel) | `vvvlocal-darwin-x64` |
| Linux (ARM64) | `vvvlocal-linux-arm64` |
| Linux (x64) | `vvvlocal-linux-x64` |
| Windows (x64) | `vvvlocal-windows-x64.exe` |

### From Source

```bash
bun install
bun run start
```

Or link it globally for development:

```bash
bun link
vvvlocal <command>
```

## Commands

### VM Management

| Command | Alias | Description |
|---------|-------|-------------|
| `up` | `start` | Start VVV |
| `stop` | `halt` | Stop VVV |
| `restart` | `reload` | Restart VVV (halt then up) |
| `status` | | Show VVV status |
| `ssh` | `shell` | SSH into the VVV virtual machine |
| `exec <command>` | | Execute a command inside the VVV VM |
| `reprovision` | `provision` | Reprovision VVV (starts if not running) |
| `destroy` | | Destroy the VVV virtual machine |
| `snapshot` | | Manage VM snapshots (list, save, restore, delete) |

### Site Management

| Command | Description |
|---------|-------------|
| `site list` | List all VVV sites |
| `site info <name>` | Show detailed site information |
| `site add <name>` | Add a new site |
| `site clone <source> <name>` | Clone an existing site |
| `site update <name>` | Update site configuration |
| `site remove <name>` | Remove a site |
| `site enable <name>` | Enable provisioning for a site |
| `site disable <name>` | Disable provisioning for a site |
| `site open [name]` | Open site in browser |
| `site wp <site> <args>` | Run WP-CLI commands for a site |

### Extension Management

| Command | Description |
|---------|-------------|
| `extension list` | List all extensions |
| `extension add <name>` | Add an extension |
| `extension remove <name>` | Remove an extension |
| `extension enable <ext/prov>` | Enable an extension provisioner |
| `extension disable <ext/prov>` | Disable an extension provisioner |

### Database Management

| Command | Alias | Description |
|---------|-------|-------------|
| `database list` | `db list` | List all databases |
| `database info <name>` | `db info` | Show database information |
| `database backup <db>` | `db backup` | Backup a database |
| `database restore <db> <file>` | `db restore` | Restore database from backup |
| `database drop <db>` | `db drop` | Drop a database |
| `database query [db]` | `db query`, `db mysql` | Open MySQL shell or run query |
| `database sequel <db>` | `db sequel` | Open database in Sequel Ace (macOS) |
| `database tableplus <db>` | `db tableplus` | Open database in TablePlus |

### PHP

| Command | Description |
|---------|-------------|
| `php list` | Show installed PHP versions |
| `php debug list` | Show available debug extensions |
| `php debug switch <ext>` | Switch debug extension (xdebug/pcov/tideways/off) |
| `xdebug <on\|off\|status>` | Quick Xdebug toggle |

### System

| Command | Description |
|---------|-------------|
| `completion` | Generate shell completion script |
| `config show` | Display VVV configuration |
| `config validate` | Validate config.yml syntax |
| `config edit` | Open config.yml in editor |
| `config path` | Print config file path |
| `doctor` | Run diagnostics and check for common issues |
| `hosts` | Manage system hosts file entries |
| `info` | Show VVV and system information |
| `install` | Download and install VVV and prerequisites |
| `logs` | View VVV logs |
| `open [target]` | Open site or service in browser |
| `providers` | Show available virtualization providers |
| `service` | Manage VVV services (nginx, php, mysql, etc.) |
| `ssl` | Manage SSL certificates |
| `upgrade` | Upgrade VVV to the latest version |
| `wp <site> <args>` | Run WP-CLI commands for a site |

## Global Options

- `--verbose` - Show detailed output including command execution details
- `--no-tips` - Disable contextual tips and hints
- `-V, --version` - Output CLI version number
- `-h, --help` - Display help for command

## Command Options

Most commands support:

- `--path <path>` - Custom path to VVV installation (default: `~/vvv-local`)
- `--json` - Output in JSON format (for list/info commands)
- `-y, --yes` - Skip confirmation prompts

## Configuration

You can configure vvvlocal behavior by adding a `cli` section to your VVV `config.yml`:

```yaml
cli:
  tips: false    # Disable helpful tips (default: true)
  splash: false  # Disable splash screen (default: true)
```

## Examples

### VM Management

```bash
# Show system and VVV information
vvvlocal info

# Start VVV with provisioning
vvvlocal up --provision

# Stop VVV
vvvlocal stop

# SSH into VVV
vvvlocal ssh

# Execute a command in VVV
vvvlocal exec "wp cli version"

# Create a snapshot before major changes
vvvlocal snapshot save before-upgrade

# Restore from snapshot
vvvlocal snapshot restore before-upgrade
```

### Site Management

```bash
# List active sites
vvvlocal site list

# List all sites including disabled
vvvlocal site list --all

# Show detailed site info
vvvlocal site info wordpress-one

# Add a new site
vvvlocal site add my-new-site

# Clone an existing site
vvvlocal site clone wordpress-default my-clone

# Update site configuration
vvvlocal site update my-site --host newdomain.test

# Enable a site
vvvlocal site enable wordpress-two

# Open site in browser
vvvlocal site open my-site

# Run WP-CLI command for a site
vvvlocal wp my-site plugin list
```

### Database Management

```bash
# List all databases
vvvlocal db list

# Backup a database
vvvlocal db backup wordpress_one

# Restore from backup
vvvlocal db restore wordpress_one backup.sql

# Open MySQL shell
vvvlocal db query

# Run a query
vvvlocal db query -e "SHOW DATABASES"

# Open in Sequel Ace (macOS)
vvvlocal db sequel wordpress_one
```

### PHP & Debugging

```bash
# Show installed PHP versions
vvvlocal php list

# Show debug extensions
vvvlocal php debug list

# Enable Xdebug
vvvlocal xdebug on

# Disable all debug extensions
vvvlocal xdebug off

# Switch to pcov
vvvlocal php debug switch pcov
```

### Extensions

```bash
# List extensions as JSON
vvvlocal extension list --json

# Enable a PHP version
vvvlocal extension enable core/php82
```

### System Commands

```bash
# Check for issues
vvvlocal doctor

# View available providers
vvvlocal providers

# Manage hosts file
vvvlocal hosts

# Refresh SSL certificates
vvvlocal ssl refresh

# Open dashboard
vvvlocal open dashboard

# View logs
vvvlocal logs
```

## Building

vvvlocal uses Bun to compile single-file executables for multiple platforms.

### Build All Platforms

```bash
bun run build
```

This creates executables in the `dist/` directory for all supported platforms.

### Build Individual Platforms

```bash
# macOS Apple Silicon (ARM64)
bun run build:darwin-arm64

# macOS Intel (x64)
bun run build:darwin-x64

# Linux ARM64
bun run build:linux-arm64

# Linux x64
bun run build:linux-x64

# Windows x64
bun run build:windows-x64
```

### Build Output

All binaries are output to the `dist/` directory:

```
dist/
├── vvvlocal-darwin-arm64      # macOS Apple Silicon
├── vvvlocal-darwin-x64        # macOS Intel
├── vvvlocal-linux-arm64       # Linux ARM64
├── vvvlocal-linux-x64         # Linux x64
└── vvvlocal-windows-x64.exe   # Windows x64
```

The build process automatically:
- Generates version metadata (version, build date, git commit)
- Compiles all dependencies into a single executable
- Creates platform-specific binaries

### Clean Build Artifacts

```bash
bun run clean
```

## Development

### Run Tests

```bash
# Run all tests
bun test

# Run unit tests only
bun run test:unit

# Run tests in watch mode
bun test --watch
```

### Code Quality

```bash
# Type check
bun run typecheck

# Lint
bun run lint

# Fix linting issues
bun run lint:fix

# Run all checks
bun run check
```

## Requirements

For running from source:
- [Bun](https://bun.sh) v1.0+

For the compiled binary:
- No runtime dependencies (self-contained executable)

For VVV itself:
- [Vagrant](https://www.vagrantup.com/)
- VirtualBox, Docker, or another Vagrant provider

## Features

- **Zero dependencies** - Compiled binaries are fully self-contained
- **Cross-platform** - Works on macOS, Linux, and Windows
- **Fast** - Built with Bun for optimal performance
- **User-friendly** - Contextual tips, helpful error messages, progress indicators
- **Automation-ready** - JSON output mode for scripting
- **Version tracking** - Build metadata for troubleshooting

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT
