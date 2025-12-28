# vvvlocal

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
| `info` | | Show VVV and system information |
| `install` | | Download and install VVV and prerequisites |
| `up` | `start` | Start VVV |
| `stop` | `halt` | Stop VVV |
| `restart` | `reload` | Restart VVV (halt then up) |
| `status` | | Show VVV status |
| `reprovision` | `provision` | Reprovision VVV (starts if not running) |
| `ssh` | `shell` | SSH into the VVV virtual machine |

### Site Management

| Command | Description |
|---------|-------------|
| `site list` | List all VVV sites |
| `site info <name>` | Show detailed site information |
| `site add <name>` | Add a new site |
| `site remove <name>` | Remove a site |
| `site enable <name>` | Enable provisioning for a site |
| `site disable <name>` | Disable provisioning for a site |

### Extension Management

| Command | Description |
|---------|-------------|
| `extension list` | List all extensions |
| `extension add <name>` | Add an extension |
| `extension remove <name>` | Remove an extension |
| `extension enable <ext/prov>` | Enable an extension provisioner |
| `extension disable <ext/prov>` | Disable an extension provisioner |

## Options

Most commands support:

- `--path <path>` - Custom path to VVV installation (default: `~/vvv-local`)
- `--json` - Output in JSON format (for list/info commands)

## Examples

```bash
# Show system and VVV information
vvvlocal info

# Start VVV with provisioning
vvvlocal up --provision

# List active sites
vvvlocal site list

# List all sites including disabled
vvvlocal site list --all

# Show detailed site info
vvvlocal site info wordpress-one

# Enable a site
vvvlocal site enable wordpress-two

# List extensions as JSON
vvvlocal extension list --json

# Enable a PHP version
vvvlocal extension enable core/php82
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

### Clean Build Artifacts

```bash
bun run clean
```

## Requirements

For running from source:
- [Bun](https://bun.sh) v1.0+

For the compiled binary:
- No runtime dependencies (self-contained executable)

For VVV itself:
- [Vagrant](https://www.vagrantup.com/)
- VirtualBox, Docker, or another Vagrant provider
