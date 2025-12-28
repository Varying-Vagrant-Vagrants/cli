import React from "react";
import { Text, Box } from "ink";

interface AppProps {
  name?: string;
}

export function App({ name = "VVV" }: AppProps) {
  return (
    <Box flexDirection="column">
      <Text color="green">Welcome to {name}!</Text>
    </Box>
  );
}
