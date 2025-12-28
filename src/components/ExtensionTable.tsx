import React from "react";
import { Text, Box } from "ink";

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
    return <Text color="yellow">No extensions installed.</Text>;
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
    "PROVISIONER".length,
    ...extensions.map((e) => e.provisioner.length)
  );
  const statusWidth = 10;

  return (
    <Box flexDirection="column">
      {Array.from(grouped.entries()).map(([extName, provs], idx) => (
        <Box key={extName} flexDirection="column" marginTop={idx > 0 ? 1 : 0}>
          {/* Extension header */}
          <Box>
            <Text bold color="cyan">{extName}/</Text>
          </Box>

          {/* Header row */}
          <Box marginLeft={2}>
            <Box width={provWidth + 2}>
              <Text bold color="whiteBright">Provisioner</Text>
            </Box>
            <Box width={statusWidth + 2}>
              <Text bold color="whiteBright">Status</Text>
            </Box>
          </Box>

          {/* Provisioners */}
          {provs.map((prov) => (
            <Box key={prov.provisioner} marginLeft={2}>
              <Box width={provWidth + 2}>
                <Text color="white">{prov.provisioner}</Text>
              </Box>
              <Box width={statusWidth + 2}>
                {prov.enabled ? (
                  <Text color="green">enabled</Text>
                ) : (
                  <Text color="gray">disabled</Text>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      ))}

      {/* Summary */}
      <Box marginTop={1}>
        <Text dimColor>
          {extensions.filter((e) => e.enabled).length} enabled, {extensions.filter((e) => !e.enabled).length} disabled
        </Text>
      </Box>
    </Box>
  );
}
