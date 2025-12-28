import React from "react";
import { Text, Box } from "ink";
import { colors } from "../utils/theme.js";

interface SiteInfoProps {
  name: string;
  site: {
    description?: string;
    repo?: string;
    hosts?: string[];
    skip_provisioning?: boolean;
    php?: string | number;
    local_dir?: string;
    vm_dir?: string;
    custom?: Record<string, unknown>;
  };
  localPath: string;
  vmPath: string;
}

export function SiteInfo({ name, site, localPath, vmPath }: SiteInfoProps) {
  const labelWidth = 14;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={colors.ui.highlight}>{name}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>Status</Text>
        </Box>
        <Box>
          {site.skip_provisioning ? (
            <Text color={colors.status.disabled}>disabled</Text>
          ) : (
            <Text color={colors.status.enabled}>enabled</Text>
          )}
        </Box>
      </Box>

      {site.description && (
        <Box>
          <Box width={labelWidth}>
            <Text bold color={colors.ui.label}>Description</Text>
          </Box>
          <Box>
            <Text color={colors.text.primary}>{site.description}</Text>
          </Box>
        </Box>
      )}

      {site.repo && (
        <Box>
          <Box width={labelWidth}>
            <Text bold color={colors.ui.label}>Repository</Text>
          </Box>
          <Box>
            <Text color={colors.data.hostname}>{site.repo}</Text>
          </Box>
        </Box>
      )}

      {site.php && (
        <Box>
          <Box width={labelWidth}>
            <Text bold color={colors.ui.label}>PHP Version</Text>
          </Box>
          <Box>
            <Text color={colors.data.version}>{site.php}</Text>
          </Box>
        </Box>
      )}

      <Box>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>Local Path</Text>
        </Box>
        <Box>
          <Text color={colors.data.path}>{localPath}</Text>
        </Box>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>VM Path</Text>
        </Box>
        <Box>
          <Text color={colors.data.path}>{vmPath}</Text>
        </Box>
      </Box>

      {site.hosts && site.hosts.length > 0 && (
        <Box>
          <Box width={labelWidth}>
            <Text bold color={colors.ui.label}>Hosts</Text>
          </Box>
          <Box flexDirection="column">
            {site.hosts.map((host, i) => (
              <Text key={i} color={colors.data.hostname}>{host}</Text>
            ))}
          </Box>
        </Box>
      )}

      {site.custom && Object.keys(site.custom).length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color={colors.ui.label}>Custom Settings</Text>
          <Box marginLeft={2} flexDirection="column">
            {Object.entries(site.custom).map(([key, value]) => (
              <Box key={key}>
                <Box width={24}>
                  <Text color={colors.text.secondary}>{key}</Text>
                </Box>
                <Box>
                  <Text color={colors.text.primary}>{formatValue(value)}</Text>
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
