$ErrorActionPreference = "Stop"
$hostName = "com.smansasoo.sephia"
$registryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"
if (Test-Path -LiteralPath $registryPath) {
  Remove-Item -LiteralPath $registryPath -Recurse -Force
}
$installDir = Join-Path $env:LOCALAPPDATA "SMANSASOO\SEPHIA"
foreach ($file in @("sephia-native-host.exe", "sephia-host-config.json", "$hostName.json")) {
  $path = Join-Path $installDir $file
  if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
}
Write-Host "SEPHIA Native Messaging registration removed. Restart Chrome."
