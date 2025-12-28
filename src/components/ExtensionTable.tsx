import React from "react";
import { Text, Box } from "ink";
import { colors } from "../utils/theme.js";

interface Extension {
  extension: string;
  provisioner: string;
  enabled: boolean;
}

interface ExtensionTableProps {
  extensions: Extension[];
}

export function ExtensionTable({ extensions }: ExtensionTableProps) {
  if (extensions.length === 0) {
    return <Text color={colors.status.warning}>No extensions installed.</Text>;
  }

  // Group by extension
  const grouped = new Map<string, Extension[]>();
  for (const ext of extensions) {
    const list = grouped.get(ext.extension) || [];
    list.push(ext);
    grouped.set(ext.extension, list);
  }

  // Calculate column widths
  const provWidth = Math.max(
    "Provisioner".length,
    ...extensions.map((e) => e.provisioner.length)
  );
  const statusWidth = 10;

  return (
    <Box flexDirection="column">
      {Array.from(grouped.entries()).map(([extName, provs], idx) => (
        <Box key={extName} flexDirection="column" marginTop={idx > 0 ? 1 : 0}>
          {/* Extension header */}
          <Box>
            <Text bold color={colors.ui.highlight}>{extName}/</Text>
          </Box>

          {/* Header row */}
          <Box marginLeft={2}>
            <Box width={provWidth + 2}>
              <Text bold color={colors.table.header}>Provisioner</Text>
            </Box>
            <Box width={statusWidth + 2}>
              <Text bold color={colors.table.header}>Status</Text>
            </Box>
          </Box>

          {/* Provisioners */}
          {provs.map((prov) => (
            <Box key={prov.provisioner} marginLeft={2}>
              <Box width={provWidth + 2}>
                <Text color={colors.table.rowPrimary}>{prov.provisioner}</Text>
              </Box>
              <Box width={statusWidth + 2}>
                {prov.enabled ? (
                  <Text color={colors.status.enabled}>enabled</Text>
                ) : (
                  <Text color={colors.status.disabled}>disabled</Text>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      ))}

      {/* Summary */}
      <Box marginTop={1}>
        <Text color={colors.text.muted}>
          {extensions.filter((e) => e.enabled).length} enabled, {extensions.filter((e) => !e.enabled).length} disabled
        </Text>
      </Box>
    </Box>
  );
}
