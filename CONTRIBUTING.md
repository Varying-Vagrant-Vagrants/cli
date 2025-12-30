# Contributing to vvvlocal

Thank you for your interest in contributing to vvvlocal! This guide will help you get started.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- [VVV](https://varyingvagrantvagrants.org/) installation (for testing)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/vvv-cli.git
cd vvv-cli

# Install dependencies
bun install

# Run the CLI in development mode
bun run start

# Run tests
bun test

# Type check
bun run typecheck

# Lint
bun run lint
```

## Project Structure

```
src/
├── index.ts              # CLI entry point
├── commands/             # Command implementations
│   ├── index.ts          # Command exports
│   ├── site/             # Site subcommands
│   ├── database/         # Database subcommands
│   ├── extension/        # Extension subcommands
│   └── ...
├── components/           # Ink React components for output
├── utils/                # Shared utilities
│   ├── cli.ts            # Console output, prompts, timing
│   ├── config.ts         # VVV config.yml parsing
│   ├── vagrant.ts        # Vagrant command execution
│   ├── theme.ts          # Color constants
│   └── ...
tests/
├── utils/                # Unit tests for utilities
├── commands/             # Command structure tests
└── integration/          # Integration tests
```

## Code Standards

### Command Options

All commands should follow these conventions:

| Option | Usage |
|--------|-------|
| `-p, --path <path>` | Path to VVV installation (use `DEFAULT_VVV_PATH`) |
| `-y, --yes` | Skip confirmation prompts |
| `--dry-run` | Show what would happen without making changes |
| `--json` | Output in JSON format |
| `--verbose` | Show detailed output |

### Error Handling

Use `exitWithError()` for fatal errors:

```typescript
import { exitWithError, cli } from "../utils/cli.js";

// Fatal error - exits the process
exitWithError("Something went wrong");

// With suggestion
exitWithError(
  "VVV not found at /path",
  "Run 'vvvlocal install' to set up VVV"
);

// Non-fatal warning
cli.warning("This might cause issues");
```

### Console Output

Use the `cli` helper for consistent output:

```typescript
import { cli } from "../utils/cli.js";

cli.success("Operation completed");  // Green
cli.error("Something failed");       // Red
cli.warning("Caution advised");      // Yellow
cli.info("FYI message");             // Cyan
```

### JSON Output Format

All `--json` output should use this structure:

```typescript
// Success with data
console.log(JSON.stringify({ success: true, data: [...] }, null, 2));

// Success with message
console.log(JSON.stringify({ success: true, message: "Done" }, null, 2));

// Error
console.log(JSON.stringify({ success: false, error: "Failed" }, null, 2));
```

### Destructive Commands

Commands that delete or modify data should:

1. Require confirmation unless `-y/--yes` is passed
2. Support `--dry-run` to preview changes
3. Show clear warnings about what will happen

```typescript
if (options.dryRun) {
  cli.info("Dry run - no changes will be made:");
  console.log(`  Would delete: ${name}`);
  return;
}

if (!options.yes) {
  const confirmed = await confirm(`Delete ${name}?`);
  if (!confirmed) {
    console.log("Cancelled.");
    return;
  }
}
```

## Adding a New Command

### Top-level Command

1. Create the command file:

```typescript
// src/commands/mycommand.ts
import { Command } from "commander";
import { DEFAULT_VVV_PATH } from "../utils/config.js";
import { ensureVvvExists, cli } from "../utils/cli.js";

export const myCommand = new Command("mycommand")
  .description("Do something useful")
  .option("-p, --path <path>", "Path to VVV installation", DEFAULT_VVV_PATH)
  .option("--json", "Output as JSON")
  .action((options) => {
    const vvvPath = options.path;
    ensureVvvExists(vvvPath);

    // Implementation
    cli.success("Done!");
  });
```

2. Export from `src/commands/index.ts`:

```typescript
export { myCommand } from "./mycommand.js";
```

3. Register in `src/index.ts`:

```typescript
import { myCommand } from "./commands/index.js";
program.addCommand(myCommand);
```

4. Add to the command groups in `src/index.ts` for help display.

### Subcommand (e.g., `site myaction`)

1. Create in `src/commands/site/myaction.ts`
2. Export from `src/commands/site/index.ts`
3. Add to parent command in `src/commands/site/index.ts`

## Adding Tests

Tests use Bun's built-in test runner:

```typescript
// tests/utils/myutil.test.ts
import { describe, test, expect } from "bun:test";
import { myFunction } from "../../src/utils/myutil.js";

describe("myFunction", () => {
  test("does something", () => {
    expect(myFunction("input")).toBe("output");
  });
});
```

Run tests:

```bash
bun test                    # All tests
bun test tests/utils        # Just utility tests
bun test --watch            # Watch mode
```

## Before Submitting

1. **Type check**: `bun run typecheck`
2. **Lint**: `bun run lint`
3. **Test**: `bun test`
4. **Build**: `bun run build` (verify it compiles)

Or run all checks:

```bash
bun run typecheck && bun run lint && bun test
```

## Commit Messages

Use clear, descriptive commit messages:

```
Add site clone command

- Clone existing site configurations to new sites
- Auto-provision with targeted provisioners
- Support --no-provision to skip provisioning
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run all checks (typecheck, lint, test)
5. Commit with a clear message
6. Push and open a PR

## Questions?

Open an issue for questions or discussion before starting large changes.
