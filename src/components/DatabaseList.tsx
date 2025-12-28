import React from "react";
import { Text, Box } from "ink";
import { colors } from "../utils/theme.js";

interface DatabaseListProps {
  databases: string[];
}

export function DatabaseList({ databases }: DatabaseListProps) {
  if (databases.length === 0) {
    return <Text color={colors.status.warning}>No databases found.</Text>;
  }

  const nameWidth = Math.max("Database".length, ...databases.map((db) => db.length)) + 3;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Box minWidth={nameWidth}>
          <Text bold color={colors.table.header}>Database</Text>
        </Box>
      </Box>

      {/* Divider */}
      <Box>
        <Text color={colors.table.divider}>{"─".repeat(nameWidth)}</Text>
      </Box>

      {/* Rows */}
      {databases.map((db) => (
        <Box key={db}>
          <Box minWidth={nameWidth}>
            <Text color={colors.table.rowPrimary}>{db}</Text>
          </Box>
        </Box>
      ))}

      {/* Summary */}
      <Box marginTop={1}>
        <Text color={colors.text.muted}>
          {databases.length} database{databases.length !== 1 ? "s" : ""}
        </Text>
      </Box>
    </Box>
  );
}
