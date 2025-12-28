# vvvlocal CLI

A CLI tool for managing VVV (Varying Vagrant Vagrants) installations built with Bun, Commander, and Ink.

## Development

Use Bun for all commands:

- `bun run src/index.ts` - Run the CLI
- `bun install` - Install dependencies
- `bun test` - Run tests

## Project Structure

```
src/
├── index.ts              # CLI entry point (Commander setup)
├── cli.tsx               # Ink render wrapper
├── commands/             # Command implementations
│   ├── index.ts          # Command exports
│   ├── up.ts             # vagrant up wrapper
│   ├── stop.ts           # vagrant halt wrapper
│   ├── restart.ts        # halt + up
│   ├── status.ts         # vagrant status wrapper
│   ├── reprovision.ts    # provision with auto-start
│   ├── ssh.ts            # vagrant ssh wrapper
│   ├── install.ts        # VVV installation (placeholder)
│   ├── site/             # Site subcommands
│   │   ├── index.ts
│   │   ├── list.ts
│   │   ├── add.ts
│   │   ├── remove.ts
│   │   ├── enable.ts
│   │   └── disable.ts
│   └── extension/        # Extension subcommands
│       ├── index.ts
│       ├── list.ts
│       ├── add.ts
│       ├── remove.ts
│       ├── enable.ts
│       └── disable.ts
├── components/           # Ink React components
│   └── App.tsx
└── utils/
    └── config.ts         # VVV config.yml parsing utilities
```

## VVV Configuration

VVV stores its configuration in `~/vvv-local/config/config.yml`. Key structures:

- `sites` - Map of site names to site configurations
- `extensions` - Map of extension names to arrays of provisioner names
- Sites have `skip_provisioning: true/false` to enable/disable
- Extensions are enabled by being present in the config array

## Adding New Commands

1. Create command file in `src/commands/`
2. Export from `src/commands/index.ts`
3. Add to `src/index.ts` with `program.addCommand()`

For subcommands (like `site list`):
1. Create in `src/commands/<parent>/`
2. Export from `src/commands/<parent>/index.ts`

## Dependencies

- `commander` - CLI argument parsing
- `ink` + `react` - Terminal UI components
- `yaml` - YAML parsing with comment preservation
