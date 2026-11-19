param(
  [Parameter(Mandatory = $true)]
  [string]$HostExePath
)

$ErrorActionPreference = "Stop"
$resolvedHost = (Resolve-Path -LiteralPath $HostExePath).Path
$sourceDir = Split-Path -Parent $resolvedHost
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("sephia-host-smoke-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

function Read-ExactBytes([System.IO.Stream]$Stream, [int]$Count) {
  $buffer = New-Object byte[] $Count
  $offset = 0
  while ($offset -lt $Count) {
    $read = $Stream.Read($buffer, $offset, $Count - $offset)
    if ($read -le 0) { throw "Native host closed the smoke-test stream unexpectedly." }
    $offset += $read
  }
  return ,$buffer
}

function Read-NativeFrame([System.IO.Stream]$Stream) {
  $header = Read-ExactBytes $Stream 4
  $length = [System.BitConverter]::ToUInt32($header, 0)
  if ($length -lt 1 -or $length -gt 1048576) { throw "Native host response length is invalid." }
  $payload = Read-ExactBytes $Stream ([int]$length)
  return [System.Text.Encoding]::UTF8.GetString($payload) | ConvertFrom-Json
}

function Start-NativeHost([string]$Origin) {
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = (Join-Path $tempDir "sephia-native-host.exe")
  $startInfo.WorkingDirectory = $tempDir
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardInput = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.CreateNoWindow = $true
  $startInfo.ArgumentList.Add($Origin)
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $startInfo
  if (-not $process.Start()) { throw "Native host process failed to start." }
  return $process
}

try {
  Copy-Item -LiteralPath $resolvedHost -Destination (Join-Path $tempDir "sephia-native-host.exe") -Force
  Get-ChildItem -LiteralPath $sourceDir -Filter "*.dll" -File | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $tempDir -Force
  }

  $allowedOrigin = "chrome-extension://abcdefghijklmnopabcdefghijklmnop/"
  $config = @{ extension_origin = $allowedOrigin }
  $config | ConvertTo-Json -Compress | Set-Content -LiteralPath (Join-Path $tempDir "sephia-host-config.json") -Encoding UTF8

  $process = Start-NativeHost $allowedOrigin
  try {
    $response = Read-NativeFrame $process.StandardOutput.BaseStream
    if ($response.version -ne 1 -or $response.ok -ne $false -or $response.code -ne "ENGINE_UNAVAILABLE") {
      throw "Native host did not fail closed when model/voice provisioning is absent."
    }
    if (-not $process.WaitForExit(5000)) { throw "Native host did not exit after unavailable readiness handshake." }
    if ($process.ExitCode -ne 0) { throw "Native host returned a non-zero exit code for the expected unavailable state." }
  } finally {
    if (-not $process.HasExited) { $process.Kill() }
    $process.Dispose()
  }

  $invalidOrigin = "chrome-extension://ponmlkjihgfedcbaponmlkjihgfedcba/"
  $process = Start-NativeHost $invalidOrigin
  try {
    if (-not $process.WaitForExit(5000)) { throw "Native host did not reject a mismatched extension origin." }
    if ($process.ExitCode -eq 0) { throw "Native host accepted a mismatched extension origin." }
  } finally {
    if (-not $process.HasExited) { $process.Kill() }
    $process.Dispose()
  }

  Write-Host "SEPHIA Native Messaging host smoke test passed: strict origin rejection and fail-closed readiness handshake."
}
finally {
  if (Test-Path -LiteralPath $tempDir) {
    Remove-Item -LiteralPath $tempDir -Recurse -Force
  }
}
