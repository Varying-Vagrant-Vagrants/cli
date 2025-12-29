/**
 * Custom error classes for standardized error handling.
 */

/**
 * Base class for all VVV CLI errors.
 */
export class VvvError extends Error {
  public readonly suggestion?: string;
  public readonly exitCode: number;

  constructor(message: string, options?: { suggestion?: string; exitCode?: number }) {
    super(message);
    this.name = "VvvError";
    this.suggestion = options?.suggestion;
    this.exitCode = options?.exitCode ?? 1;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VvvError);
    }
  }
}

/**
 * Error thrown when VVV installation is not found.
 */
export class VvvNotFoundError extends VvvError {
  constructor(path: string) {
    super(`VVV not found at ${path}`, {
      suggestion: `Run 'vvvlocal install' to set up VVV, or use --path to specify the location.`,
    });
    this.name = "VvvNotFoundError";
  }
}

/**
 * Error thrown when VVV is not running but is required.
 */
export class VvvNotRunningError extends VvvError {
  constructor() {
    super("VVV is not running.", {
      suggestion: `Start VVV with 'vvvlocal up' first.`,
    });
    this.name = "VvvNotRunningError";
  }
}

/**
 * Error thrown when a site is not found.
 */
export class SiteNotFoundError extends VvvError {
  constructor(siteName: string) {
    super(`Site '${siteName}' does not exist.`, {
      suggestion: `Run 'vvvlocal site list' to see available sites.`,
    });
    this.name = "SiteNotFoundError";
  }
}

/**
 * Error thrown when a site already exists.
 */
export class SiteExistsError extends VvvError {
  constructor(siteName: string) {
    super(`Site '${siteName}' already exists.`, {
      suggestion: `Use 'vvvlocal site update ${siteName}' to modify it, or choose a different name.`,
    });
    this.name = "SiteExistsError";
  }
}

/**
 * Error thrown when Vagrant is not installed.
 */
export class VagrantNotFoundError extends VvvError {
  constructor() {
    super("Vagrant is not installed or not in PATH.", {
      suggestion: `Run 'vvvlocal install' to install prerequisites.`,
    });
    this.name = "VagrantNotFoundError";
  }
}

/**
 * Error thrown when an invalid database name is provided.
 */
export class InvalidDatabaseNameError extends VvvError {
  constructor(name: string) {
    super(`Invalid database name '${name}'.`, {
      suggestion: "Database names can only contain letters, numbers, underscores, hyphens, and dollar signs.",
    });
    this.name = "InvalidDatabaseNameError";
  }
}

/**
 * Error thrown when a database is not found.
 */
export class DatabaseNotFoundError extends VvvError {
  constructor(name: string) {
    super(`Database '${name}' does not exist.`, {
      suggestion: `Run 'vvvlocal db list' to see available databases.`,
    });
    this.name = "DatabaseNotFoundError";
  }
}

/**
 * Error thrown when attempting to modify a system database.
 */
export class SystemDatabaseError extends VvvError {
  constructor(name: string) {
    super(`Cannot modify system database '${name}'.`, {
      suggestion: "System databases (mysql, information_schema, etc.) are protected.",
    });
    this.name = "SystemDatabaseError";
  }
}

/**
 * Error thrown when a command times out.
 */
export class TimeoutError extends VvvError {
  constructor(command: string, timeoutMs: number) {
    super(`Command timed out after ${timeoutMs / 1000}s: ${command}`, {
      suggestion: "The operation took too long. Check if the VM is responsive with 'vvvlocal status'.",
    });
    this.name = "TimeoutError";
  }
}

/**
 * Error thrown when a configuration file is invalid.
 */
export class ConfigError extends VvvError {
  constructor(message: string, filePath?: string) {
    super(filePath ? `Configuration error in ${filePath}: ${message}` : `Configuration error: ${message}`, {
      suggestion: `Run 'vvvlocal config validate' to check your configuration.`,
    });
    this.name = "ConfigError";
  }
}
