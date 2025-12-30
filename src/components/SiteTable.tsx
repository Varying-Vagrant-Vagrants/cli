import React from "react";
import { Text, Box } from "ink";
import { colors } from "../utils/theme.js";

interface Site {
  name: string;
  hosts: string[];
  description?: string;
  php?: string | number;
  skipped: boolean;
  path: string;
}

interface SiteTableProps {
  sites: Site[];
}

export function SiteTable({ sites }: SiteTableProps) {
  if (sites.length === 0) {
    return <Text color={colors.status.warning}>No sites configured.</Text>;
  }

  // Calculate column widths
  const nameWidth = Math.max(
    "Site".length,
    ...sites.map((s) => s.name.length)
  ) + 3;
  const statusWidth = 12;
  const phpWidth = 8;
  const pathWidth = Math.max(
    "Path".length,
    ...sites.map((s) => s.path.length)
  ) + 3;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Box minWidth={nameWidth}>
          <Text bold color={colors.table.header}>Site</Text>
        </Box>
        <Box minWidth={statusWidth}>
          <Text bold color={colors.table.header}>Status</Text>
        </Box>
        <Box minWidth={phpWidth}>
          <Text bold color={colors.table.header}>PHP</Text>
        </Box>
        <Box minWidth={pathWidth}>
          <Text bold color={colors.table.header}>Path</Text>
        </Box>
        <Box>
          <Text bold color={colors.table.header}>Hosts</Text>
        </Box>
      </Box>

      {/* Divider */}
      <Box>
        <Text color={colors.table.divider}>{"─".repeat(nameWidth + statusWidth + phpWidth + pathWidth + 30)}</Text>
      </Box>

      {/* Rows */}
      {sites.map((site) => (
        <Box key={site.name}>
          <Box minWidth={nameWidth}>
            <Text color={colors.table.rowPrimary}>{site.name}</Text>
          </Box>
          <Box minWidth={statusWidth}>
            {site.skipped ? (
              <Text color={colors.status.disabled}>disabled</Text>
            ) : (
              <Text color={colors.status.enabled}>enabled</Text>
            )}
          </Box>
          <Box minWidth={phpWidth}>
            <Text color={colors.data.version}>{site.php || "-"}</Text>
          </Box>
          <Box minWidth={pathWidth}>
            <Text color={colors.data.path}>{site.path}</Text>
          </Box>
          <Box>
            <Text color={colors.data.hostname}>{site.hosts.join(", ") || "-"}</Text>
          </Box>
        </Box>
      ))}

      {/* Summary */}
      <Box marginTop={1}>
        <Text color={colors.text.muted}>
          {sites.filter((s) => !s.skipped).length} enabled, {sites.filter((s) => s.skipped).length} disabled
        </Text>
      </Box>
    </Box>
  );
}
