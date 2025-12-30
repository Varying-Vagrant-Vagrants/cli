#!/bin/bash
# vvvlocal installer script

set -e

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    case "$ARCH" in
      x86_64) BINARY="vvvlocal-darwin-x64" ;;
      arm64) BINARY="vvvlocal-darwin-arm64" ;;
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    ;;
  Linux)
    case "$ARCH" in
      x86_64) BINARY="vvvlocal-linux-x64" ;;
      aarch64|arm64) BINARY="vvvlocal-linux-arm64" ;;
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    ;;
  MINGW*|MSYS*|CYGWIN*)
    BINARY="vvvlocal-windows-x64.exe"
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

# Get latest release version
echo "Fetching latest release..."
LATEST_VERSION=$(curl -s https://api.github.com/repos/Varying-Vagrant-Vagrants/cli/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_VERSION" ]; then
  echo "Failed to fetch latest version"
  exit 1
fi

echo "Latest version: $LATEST_VERSION"

# Download binary
DOWNLOAD_URL="https://github.com/Varying-Vagrant-Vagrants/cli/releases/download/${LATEST_VERSION}/${BINARY}"
echo "Downloading from: $DOWNLOAD_URL"

TEMP_FILE="/tmp/${BINARY}"
curl -L -o "$TEMP_FILE" "$DOWNLOAD_URL"

# Install to /usr/local/bin
INSTALL_DIR="/usr/local/bin"
INSTALL_PATH="${INSTALL_DIR}/vvvlocal"

if [ -w "$INSTALL_DIR" ]; then
  mv "$TEMP_FILE" "$INSTALL_PATH"
else
  echo "Installing to $INSTALL_DIR (requires sudo)..."
  sudo mv "$TEMP_FILE" "$INSTALL_PATH"
  sudo chmod +x "$INSTALL_PATH"
fi

chmod +x "$INSTALL_PATH" 2>/dev/null || true

# Verify installation
if command -v vvvlocal >/dev/null 2>&1; then
  echo "✓ vvvlocal installed successfully!"
  vvvlocal --version
else
  echo "Installation complete, but vvvlocal is not in your PATH."
  echo "Add $INSTALL_DIR to your PATH or run: $INSTALL_PATH"
fi
