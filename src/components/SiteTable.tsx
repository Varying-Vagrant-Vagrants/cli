import React from "react";
import { Text, Box } from "ink";

interface Site {
  name: string;
  hosts: string[];
  description?: string;
  php?: string | number;
  skipped: boolean;
}

interface SiteTableProps {
  sites: Site[];
}

export function SiteTable({ sites }: SiteTableProps) {
  if (sites.length === 0) {
    return <Text color="yellow">No sites configured.</Text>;
  }

  // Calculate column widths
  const nameWidth = Math.max(
    "SITE".length,
    ...sites.map((s) => s.name.length)
  ) + 3;
  const statusWidth = 12;
  const phpWidth = 8;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Box minWidth={nameWidth}>
          <Text bold color="whiteBright">Site</Text>
        </Box>
        <Box minWidth={statusWidth}>
          <Text bold color="whiteBright">Status</Text>
        </Box>
        <Box minWidth={phpWidth}>
          <Text bold color="whiteBright">PHP</Text>
        </Box>
        <Box>
          <Text bold color="whiteBright">Hosts</Text>
        </Box>
      </Box>

      {/* Divider */}
      <Box>
        <Text dimColor>{"─".repeat(nameWidth + statusWidth + phpWidth + 30)}</Text>
      </Box>

      {/* Rows */}
      {sites.map((site) => (
        <Box key={site.name}>
          <Box minWidth={nameWidth}>
            <Text color="white">{site.name}</Text>
          </Box>
          <Box minWidth={statusWidth}>
            {site.skipped ? (
              <Text color="gray">disabled</Text>
            ) : (
              <Text color="green">enabled</Text>
            )}
          </Box>
          <Box minWidth={phpWidth}>
            <Text color="magenta">{site.php || "-"}</Text>
          </Box>
          <Box>
            <Text color="blue">{site.hosts.join(", ") || "-"}</Text>
          </Box>
        </Box>
      ))}

      {/* Summary */}
      <Box marginTop={1}>
        <Text dimColor>
          {sites.filter((s) => !s.skipped).length} enabled, {sites.filter((s) => s.skipped).length} disabled
        </Text>
      </Box>
    </Box>
  );
}
