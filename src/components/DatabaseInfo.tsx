import React from "react";
import { Text, Box } from "ink";
import { colors } from "../utils/theme.js";

interface DatabaseInfoProps {
  host: string;
  port: number;
  user: string;
  password: string;
  version?: string;
}

export function DatabaseInfo({
  host,
  port,
  user,
  password,
  version,
}: DatabaseInfoProps) {
  const labelWidth = 12;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={colors.ui.highlight}>Database Connection</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>Host</Text>
        </Box>
        <Text color={colors.data.hostname}>{host}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>Port</Text>
        </Box>
        <Text color={colors.data.value}>{port}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>User</Text>
        </Box>
        <Text color={colors.data.name}>{user}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>Password</Text>
        </Box>
        <Text color={colors.status.warning}>{password}</Text>
      </Box>

      {version && (
        <Box>
          <Box width={labelWidth}>
            <Text bold color={colors.ui.label}>Version</Text>
          </Box>
          <Text color={colors.data.version}>{version}</Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text bold color={colors.ui.label}>Connection String</Text>
        <Text color={colors.text.secondary}>mysql://{user}:{password}@{host}:{port}</Text>
      </Box>
    </Box>
  );
}
