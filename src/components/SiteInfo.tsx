import React from "react";
import { Text, Box } from "ink";

interface SiteInfoProps {
  name: string;
  site: {
    description?: string;
    repo?: string;
    hosts?: string[];
    skip_provisioning?: boolean;
    php?: string | number;
    custom?: Record<string, unknown>;
  };
}

export function SiteInfo({ name, site }: SiteInfoProps) {
  const labelWidth = 14;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">{name}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color="whiteBright">Status</Text>
        </Box>
        <Box>
          {site.skip_provisioning ? (
            <Text color="gray">disabled</Text>
          ) : (
            <Text color="green">enabled</Text>
          )}
        </Box>
      </Box>

      {site.description && (
        <Box>
          <Box width={labelWidth}>
            <Text bold color="whiteBright">Description</Text>
          </Box>
          <Box>
            <Text>{site.description}</Text>
          </Box>
        </Box>
      )}

      {site.repo && (
        <Box>
          <Box width={labelWidth}>
            <Text bold color="whiteBright">Repository</Text>
          </Box>
          <Box>
            <Text color="blue">{site.repo}</Text>
          </Box>
        </Box>
      )}

      {site.php && (
        <Box>
          <Box width={labelWidth}>
            <Text bold color="whiteBright">PHP Version</Text>
          </Box>
          <Box>
            <Text color="magenta">{site.php}</Text>
          </Box>
        </Box>
      )}

      {site.hosts && site.hosts.length > 0 && (
        <Box>
          <Box width={labelWidth}>
            <Text bold color="whiteBright">Hosts</Text>
          </Box>
          <Box flexDirection="column">
            {site.hosts.map((host, i) => (
              <Text key={i} color="blue">{host}</Text>
            ))}
          </Box>
        </Box>
      )}

      {site.custom && Object.keys(site.custom).length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="whiteBright">Custom Settings</Text>
          <Box marginLeft={2} flexDirection="column">
            {Object.entries(site.custom).map(([key, value]) => (
              <Box key={key}>
                <Box width={24}>
                  <Text color="gray">{key}</Text>
                </Box>
                <Box>
                  <Text>{formatValue(value)}</Text>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}
