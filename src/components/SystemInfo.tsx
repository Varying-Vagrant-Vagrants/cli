import React from "react";
import { Text, Box } from "ink";
import { colors } from "../utils/theme.js";

interface SystemInfoProps {
  cliVersion: string;
  cliBuildDate: string | null;
  cliGitCommit: string | null;
  vvvVersion: string;
  latestVersion: string | null;
  vagrantVersion: string;
  provider: string;
  arch: string;
  os: string;
  vvvPath: string;
  gitInstall: boolean;
  gitBranch: string | null;
}

export function SystemInfo({
  cliVersion,
  cliBuildDate,
  cliGitCommit,
  vvvVersion,
  latestVersion,
  vagrantVersion,
  provider,
  arch,
  os,
  vvvPath,
  gitInstall,
  gitBranch,
}: SystemInfoProps) {
  const compareVersions = (a: string, b: string): number => {
    const partsA = a.split(".").map(Number);
    const partsB = b.split(".").map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA > numB) return 1;
      if (numA < numB) return -1;
    }
    return 0;
  };

  const formatBuildDate = (date: string | null): string => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().split("T")[0] || ""; // YYYY-MM-DD
  };

  const versionCompare = latestVersion ? compareVersions(vvvVersion, latestVersion) : 0;
  const isUpToDate = !latestVersion || versionCompare >= 0;
  const isNewer = latestVersion && versionCompare > 0;
  const labelWidth = 16;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={colors.ui.highlight}>System Information</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>CLI Version</Text>
        </Box>
        <Text color={colors.data.value}>{cliVersion}</Text>
      </Box>

      {cliBuildDate && (
        <Box>
          <Box width={labelWidth}>
            <Text bold color={colors.ui.label}>Build Date</Text>
          </Box>
          <Text color={colors.text.secondary}>{formatBuildDate(cliBuildDate)}</Text>
        </Box>
      )}

      {cliGitCommit && (
        <Box>
          <Box width={labelWidth}>
            <Text bold color={colors.ui.label}>Git Commit</Text>
          </Box>
          <Text color={colors.text.secondary}>{cliGitCommit}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>VVV Version</Text>
        </Box>
        <Text color={isUpToDate ? colors.status.success : colors.status.warning}>{vvvVersion}</Text>
        {latestVersion && !isUpToDate && (
          <Text color={colors.text.secondary}> (update available: {latestVersion})</Text>
        )}
        {isNewer && (
          <Text color={colors.text.secondary}> (ahead of release)</Text>
        )}
        {isUpToDate && latestVersion && !isNewer && (
          <Text color={colors.text.secondary}> (up to date)</Text>
        )}
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>VVV Path</Text>
        </Box>
        <Text color={colors.data.path}>{vvvPath}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>Install Type</Text>
        </Box>
        <Text>
          {gitInstall ? (
            <>
              <Text color={colors.status.success}>git clone</Text>
              {gitBranch && <Text color={colors.text.secondary}> ({gitBranch})</Text>}
            </>
          ) : (
            <Text color={colors.text.secondary}>release</Text>
          )}
        </Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>Vagrant</Text>
        </Box>
        <Text color={colors.data.value}>{vagrantVersion}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>Provider</Text>
        </Box>
        <Text color={colors.data.name}>{provider}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>Architecture</Text>
        </Box>
        <Text color={colors.data.value}>{arch}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color={colors.ui.label}>OS</Text>
        </Box>
        <Text color={colors.data.value}>{os}</Text>
      </Box>
    </Box>
  );
}
