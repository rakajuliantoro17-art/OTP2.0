$ErrorActionPreference = "Stop"
$hostName = "com.smansasoo.sephia"
$registryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"
if (Test-Path -LiteralPath $registryPath) {
  Remove-Item -LiteralPath $registryPath -Recurse -Force
}
[Environment]::SetEnvironmentVariable("SEPHIA_EXTENSION_ORIGIN", $null, "User")
Write-Host "SEPHIA Native Messaging registration removed. Restart Chrome."
