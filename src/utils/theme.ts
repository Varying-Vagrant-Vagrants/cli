/**
 * Centralized theme colors for consistent styling across the CLI.
 * Uses colors that work well on both light and dark terminal backgrounds.
 *
 * Note: Avoid pure "white" or "black" as they may be invisible on
 * light/dark terminals respectively. Use "default" or contrasting colors.
 */

export const colors = {
  // Text colors
  text: {
    primary: undefined,        // Use terminal default for maximum compatibility
    secondary: "gray",         // Muted text, secondary information
    muted: "gray",             // Same as secondary, for dimmed content
  },

  // Status colors
  status: {
    enabled: "green",
    disabled: "gray",
    warning: "yellow",
    error: "red",
    success: "green",
  },

  // Table colors
  table: {
    header: "cyan",            // Column headers
    divider: "gray",           // Table dividers/borders
    rowPrimary: undefined,     // Primary row text (terminal default)
  },

  // Data type colors
  data: {
    hostname: "blue",          // URLs, hostnames
    path: "gray",              // File paths
    version: "magenta",        // Version numbers, PHP versions
    name: "cyan",              // Names, identifiers
    value: undefined,          // Generic values (terminal default)
  },

  // UI element colors
  ui: {
    label: "cyan",             // Labels in info displays
    border: "gray",            // Borders and decorative elements
    highlight: "cyan",         // Highlighted/emphasized text
  },
} as const;

// Helper type for color values
export type ThemeColor = string | undefined;
