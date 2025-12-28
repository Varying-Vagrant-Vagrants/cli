import React from "react";
import { Text, Box } from "ink";

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
        <Text bold color="cyan">Database Connection</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color="whiteBright">Host</Text>
        </Box>
        <Text color="blue">{host}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color="whiteBright">Port</Text>
        </Box>
        <Text>{port}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color="whiteBright">User</Text>
        </Box>
        <Text color="green">{user}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color="whiteBright">Password</Text>
        </Box>
        <Text color="yellow">{password}</Text>
      </Box>

      {version && (
        <Box>
          <Box width={labelWidth}>
            <Text bold color="whiteBright">Version</Text>
          </Box>
          <Text color="gray">{version}</Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text bold color="whiteBright">Connection String</Text>
        <Text color="gray">mysql://{user}:{password}@{host}:{port}</Text>
      </Box>
    </Box>
  );
}
