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

$manifestPath = Join-Path $installDir "$hostName.json"
$manifest = @{
  name = $hostName
  description = "SEPHIA local-only neural speech host"
  path = $resolvedHost
  type = "stdio"
  allowed_origins = @($origin)
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

$registryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"
New-Item -Path $registryPath -Force | Out-Null
Set-Item -Path $registryPath -Value $manifestPath

[Environment]::SetEnvironmentVariable("SEPHIA_EXTENSION_ORIGIN", $origin, "User")
Write-Host "SEPHIA Native Messaging manifest registered."
Write-Host "Allowed extension: $origin"
Write-Host "Restart Chrome before testing."
Write-Host "NOTE: Current native host is a protocol stub and returns ENGINE_UNAVAILABLE until the local inference engine is integrated."
