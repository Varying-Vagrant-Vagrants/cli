# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
