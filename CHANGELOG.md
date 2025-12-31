# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `sites` command alias for `site` command for convenience
- `box` command (alias: `vm`) for Vagrant box management
  - `box info` subcommand to display box version, guest OS info, and EOL warnings
  - `box upgrade` subcommand for automated box migration with snapshot backup
- Box information checks in `doctor` command showing box version and Ubuntu EOL status
- `--folder` flag to `open` command to open sites in file manager (Finder/Explorer)
- `--vscode` and `--code` flags to `open` command to open sites in VS Code
- One-line installer scripts for easy installation
  - `install.sh` for macOS and Linux
  - `install.ps1` for Windows PowerShell
- Quick Install section in README with one-line installation commands
- Collapsible table of contents in README
- Launcher utility for cross-platform browser, file manager, and editor support

### Fixed
- Unknown command error now shows "Unknown command" instead of confusing "too many arguments" message
- macOS version detection now uses `sw_vers` for accurate version information
  - Dynamically extracts marketing name from license file
  - Properly displays version for all macOS releases including beta versions
- Box upgrade command no longer destroys VM unnecessarily
  - Now checks if box upgrade is available before proceeding
  - Exits early with success message if box is already up-to-date
  - Only asks for confirmation when upgrade is actually needed

### Improved
- Error handling for mistyped commands with helpful suggestions
- macOS version detection removed hardcoded version mappings
- Box upgrade workflow provides clear feedback about update status
- Open command eliminates code duplication with unified launcher utility

## [1.0.0] - 2025-12-30

### Initial Release

First public release of vvvlocal - a CLI tool for managing VVV (Varying Vagrant Vagrants) installations.

#### Features

**VM Management**
- Start, stop, restart, and check status of VVV
- SSH access and command execution in VM
- Provisioning and reprovisioning
- VM snapshot management (save, restore, list, delete)
- VM destruction with safety confirmations

**Site Management**
- List, add, remove, enable, and disable sites
- Clone existing sites
- Update site configuration (hosts, PHP version, description)
- Open sites in browser
- Run WP-CLI commands for specific sites
- Detailed site information display

**Database Management**
- List, backup, and restore databases
- Drop databases with confirmation
- Open databases in Sequel Ace or TablePlus
- MySQL shell access and query execution
- Database information display

**PHP & Debugging**
- List installed PHP versions
- Manage debug extensions (Xdebug, pcov, tideways)
- Quick Xdebug toggle commands
- Switch between debug extensions

**System & Utilities**
- System diagnostics with `doctor` command
- View VVV and system information
- Manage hosts file entries (with passwordless sudo option)
- SSL certificate management and trust
- Service management (nginx, PHP, MySQL, etc.)
- View VVV logs
- Check available virtualization providers
- Configuration viewing, editing, and validation
- Shell completion generation
- VVV installation and upgrade

#### User Experience
- Contextual tips and hints system (configurable)
- Friendly error messages with suggestions
- Progress indicators for long operations
- JSON output mode for automation
- Configurable splash screen
- Verbose mode for debugging
- Color output with TTY detection

#### Technical
- Zero dependencies (self-contained compiled binaries)
- Cross-platform: macOS (Intel/ARM), Linux (x64/ARM64), Windows (x64)
- Built with Bun for optimal performance
- TypeScript with strict type checking
- Comprehensive test suite (182 tests)
- CI/CD with GitHub Actions
- Version tracking with build metadata

[1.0.0]: https://github.com/Varying-Vagrant-Vagrants/cli/releases/tag/v1.0.0
