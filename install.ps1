# vvvlocal installer script for Windows

$ErrorActionPreference = "Stop"

# Detect architecture
$arch = if ([System.Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
$binary = "vvvlocal-windows-$arch.exe"

# Get latest release
Write-Host "Fetching latest release..."
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/Varying-Vagrant-Vagrants/cli/releases/latest"
$version = $release.tag_name
Write-Host "Latest version: $version"

# Download binary
$downloadUrl = "https://github.com/Varying-Vagrant-Vagrants/cli/releases/download/$version/$binary"
$tempPath = "$env:TEMP\vvvlocal.exe"
Write-Host "Downloading from: $downloadUrl"
Invoke-WebRequest -Uri $downloadUrl -OutFile $tempPath

# Install to user directory
$installDir = "$env:LOCALAPPDATA\vvvlocal"
$installPath = "$installDir\vvvlocal.exe"

if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir | Out-Null
}

Move-Item -Path $tempPath -Destination $installPath -Force

# Add to PATH if not already there
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$installDir", "User")
    $env:Path = "$env:Path;$installDir"
}

Write-Host "✓ vvvlocal installed successfully!"
& $installPath --version
