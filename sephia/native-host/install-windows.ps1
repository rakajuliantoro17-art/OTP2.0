param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-p]{32}$')]
  [string]$ExtensionId,
  [Parameter(Mandatory = $true)]
  [string]$HostExePath
)

$ErrorActionPreference = "Stop"
$resolvedHost = (Resolve-Path -LiteralPath $HostExePath).Path
if (-not (Test-Path -LiteralPath $resolvedHost -PathType Leaf)) {
  throw "Native host executable not found."
}

$hostName = "com.smansasoo.sephia"
$origin = "chrome-extension://$ExtensionId/"
$installDir = Join-Path $env:LOCALAPPDATA "SMANSASOO\SEPHIA"
New-Item -ItemType Directory -Path $installDir -Force | Out-Null

$installedHost = Join-Path $installDir "sephia-native-host.exe"
Copy-Item -LiteralPath $resolvedHost -Destination $installedHost -Force

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$configPath = Join-Path $installDir "sephia-host-config.json"
$configJson = @{ extension_origin = $origin } | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText($configPath, $configJson, $utf8NoBom)

$manifestPath = Join-Path $installDir "$hostName.json"
$manifest = @{
  name = $hostName
  description = "SEPHIA local-only neural speech host"
  path = $installedHost
  type = "stdio"
  allowed_origins = @($origin)
}
$manifestJson = $manifest | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($manifestPath, $manifestJson, $utf8NoBom)

$registryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"
New-Item -Path $registryPath -Force | Out-Null
Set-Item -Path $registryPath -Value $manifestPath
Write-Host "SEPHIA Native Messaging manifest registered."
Write-Host "Allowed extension: $origin"
Write-Host "Restart Chrome before testing."
Write-Host "NOTE: Current native host is a protocol stub and returns ENGINE_UNAVAILABLE until the local inference engine is integrated."
