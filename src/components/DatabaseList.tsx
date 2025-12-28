import React from "react";
import { Text, Box } from "ink";

interface DatabaseListProps {
  databases: string[];
}

export function DatabaseList({ databases }: DatabaseListProps) {
  if (databases.length === 0) {
    return <Text color="yellow">No databases found.</Text>;
  }

  const nameWidth = Math.max("Database".length, ...databases.map((db) => db.length)) + 3;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Box minWidth={nameWidth}>
          <Text bold color="whiteBright">Database</Text>
        </Box>
      </Box>

      {/* Divider */}
      <Box>
        <Text dimColor>{"─".repeat(nameWidth)}</Text>
      </Box>

      {/* Rows */}
      {databases.map((db) => (
        <Box key={db}>
          <Box minWidth={nameWidth}>
            <Text color="white">{db}</Text>
          </Box>
        </Box>
      ))}

      {/* Summary */}
      <Box marginTop={1}>
        <Text dimColor>
          {databases.length} database{databases.length !== 1 ? "s" : ""}
        </Text>
      </Box>
    </Box>
  );
}
