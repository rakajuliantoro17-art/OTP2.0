$ErrorActionPreference = "Stop"
$hostName = "com.smansasoo.sephia"
$registryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"
if (Test-Path -LiteralPath $registryPath) {
  Remove-Item -LiteralPath $registryPath -Recurse -Force
}
$installDir = Join-Path $env:LOCALAPPDATA "SMANSASOO\SEPHIA"
if (Test-Path -LiteralPath $installDir) {
  Remove-Item -LiteralPath $installDir -Recurse -Force
}
Write-Host "SEPHIA Native Messaging registration and local model/voice files removed. Restart Chrome."
