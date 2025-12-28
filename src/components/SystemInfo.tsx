import React from "react";
import { Text, Box } from "ink";

interface SystemInfoProps {
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

  const versionCompare = latestVersion ? compareVersions(vvvVersion, latestVersion) : 0;
  const isUpToDate = !latestVersion || versionCompare >= 0;
  const isNewer = latestVersion && versionCompare > 0;
  const labelWidth = 16;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">System Information</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color="whiteBright">VVV Version</Text>
        </Box>
        <Text color={isUpToDate ? "green" : "yellow"}>{vvvVersion}</Text>
        {latestVersion && !isUpToDate && (
          <Text color="gray"> (update available: {latestVersion})</Text>
        )}
        {isNewer && (
          <Text color="gray"> (ahead of release)</Text>
        )}
        {isUpToDate && latestVersion && !isNewer && (
          <Text color="gray"> (up to date)</Text>
        )}
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color="whiteBright">VVV Path</Text>
        </Box>
        <Text color="blue">{vvvPath}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color="whiteBright">Install Type</Text>
        </Box>
        <Text>
          {gitInstall ? (
            <>
              <Text color="green">git clone</Text>
              {gitBranch && <Text color="gray"> ({gitBranch})</Text>}
            </>
          ) : (
            <Text color="gray">release</Text>
          )}
        </Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color="whiteBright">Vagrant</Text>
        </Box>
        <Text>{vagrantVersion}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color="whiteBright">Provider</Text>
        </Box>
        <Text color="magenta">{provider}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color="whiteBright">Architecture</Text>
        </Box>
        <Text>{arch}</Text>
      </Box>

      <Box>
        <Box width={labelWidth}>
          <Text bold color="whiteBright">OS</Text>
        </Box>
        <Text>{os}</Text>
      </Box>
    </Box>
  );
}
