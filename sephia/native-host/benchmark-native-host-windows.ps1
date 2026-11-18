param(
  [Parameter(Mandatory = $true)]
  [string]$HostExePath,
  [ValidateRange(3, 10)]
  [int]$Iterations = 3,
  [ValidateRange(1000, 120000)]
  [int]$MaxStartupMs = 60000,
  [ValidateRange(1000, 30000)]
  [int]$MaxWarmSynthesisMs = 8000,
  [ValidateRange(1, 100)]
  [int]$MaxCpuPercent = 85,
  [ValidateRange(128, 8192)]
  [int]$MaxMemoryMb = 1024,
  [ValidateRange(1024, 716800)]
  [int]$MaxAudioBytes = 716800
)

$ErrorActionPreference = "Stop"
$resolvedHost = (Resolve-Path -LiteralPath $HostExePath).Path
$hostDir = Split-Path -Parent $resolvedHost
$configPath = Join-Path $hostDir "sephia-host-config.json"
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$origin = [string]$config.extension_origin
if ($origin -notmatch '^chrome-extension://[a-p]{32}/$') {
  throw "Native host config does not contain a valid exact Chrome extension origin."
}

function Read-ExactBytes([System.IO.Stream]$Stream, [int]$Count) {
  $buffer = New-Object byte[] $Count
  $offset = 0
  while ($offset -lt $Count) {
    $read = $Stream.Read($buffer, $offset, $Count - $offset)
    if ($read -le 0) { throw "Native host closed the output stream unexpectedly." }
    $offset += $read
  }
  return ,$buffer
}

function Read-NativeFrame([System.IO.Stream]$Stream) {
  $header = Read-ExactBytes $Stream 4
  $length = [System.BitConverter]::ToUInt32($header, 0)
  if ($length -lt 1 -or $length -gt 1048576) { throw "Native host response frame length is invalid." }
  $payload = Read-ExactBytes $Stream ([int]$length)
  return [System.Text.Encoding]::UTF8.GetString($payload) | ConvertFrom-Json
}

function Write-NativeFrame([System.IO.Stream]$Stream, [hashtable]$Message) {
  $json = $Message | ConvertTo-Json -Compress -Depth 5
  $payload = [System.Text.Encoding]::UTF8.GetBytes($json)
  if ($payload.Length -gt 4096) { throw "Native host request exceeds the protocol limit." }
  $header = [System.BitConverter]::GetBytes([uint32]$payload.Length)
  $Stream.Write($header, 0, 4)
  $Stream.Write($payload, 0, $payload.Length)
  $Stream.Flush()
}

$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $resolvedHost
$startInfo.WorkingDirectory = $hostDir
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardInput = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$startInfo.CreateNoWindow = $true
$startInfo.ArgumentList.Add($origin)

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $startInfo
$warmTimes = @()
$cpuSamples = @()
$peakMemoryMb = 0
$maxAudioBytesSeen = 0
$startupTimer = [System.Diagnostics.Stopwatch]::StartNew()

try {
  if (-not $process.Start()) { throw "Native host process did not start." }
  $inputStream = $process.StandardInput.BaseStream
  $outputStream = $process.StandardOutput.BaseStream
  $ready = Read-NativeFrame $outputStream
  $startupTimer.Stop()
  $startupMs = [int]$startupTimer.ElapsedMilliseconds
  if ($ready.version -ne 1 -or $ready.ok -ne $true -or $ready.status -ne "ready") {
    throw "Native host did not pass its local model/voice readiness handshake."
  }

  for ($index = 0; $index -lt $Iterations; $index++) {
    $process.Refresh()
    $cpuBefore = $process.TotalProcessorTime
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    Write-NativeFrame $inputStream @{
      version = 1
      action = "synthesize-approved-announcement"
    }
    $response = Read-NativeFrame $outputStream
    $timer.Stop()
    $process.Refresh()
    $cpuAfter = $process.TotalProcessorTime

    if ($response.version -ne 1 -or $response.ok -ne $true -or
        $response.format -ne "pcm_s16le" -or $response.sampleRate -ne 24000 -or
        $response.channels -ne 1) {
      throw "Native host returned an invalid or failed synthesis response."
    }

    $audioBytes = [Convert]::FromBase64String([string]$response.audioBase64)
    if ($audioBytes.Length -lt 1 -or $audioBytes.Length -gt $MaxAudioBytes) {
      throw "Native audio response exceeded the configured size limit."
    }
    if ($response.durationMs -lt 250 -or $response.durationMs -gt 15000) {
      throw "Native audio duration is outside the accepted bounds."
    }

    $warmTimes += [int]$timer.ElapsedMilliseconds
    $cpuMs = ($cpuAfter - $cpuBefore).TotalMilliseconds
    $wallMs = [Math]::Max(1, $timer.ElapsedMilliseconds)
    $cpuPercent = ($cpuMs / $wallMs / [Environment]::ProcessorCount) * 100
    $cpuSamples += [Math]::Round($cpuPercent, 2)
    $peakMemoryMb = [Math]::Max($peakMemoryMb, [Math]::Ceiling($process.PeakWorkingSet64 / 1MB))
    $maxAudioBytesSeen = [Math]::Max($maxAudioBytesSeen, $audioBytes.Length)
    [Array]::Clear($audioBytes, 0, $audioBytes.Length)
  }

  $sortedWarm = @($warmTimes | Sort-Object)
  $p95Index = [Math]::Max(0, [Math]::Ceiling($sortedWarm.Count * 0.95) - 1)
  $p95WarmMs = [int]$sortedWarm[$p95Index]
  $maxCpu = if ($cpuSamples.Count) { ($cpuSamples | Measure-Object -Maximum).Maximum } else { 0 }
  $startupPass = $startupMs -le $MaxStartupMs
  $latencyPass = $p95WarmMs -le $MaxWarmSynthesisMs
  $cpuPass = $maxCpu -le $MaxCpuPercent
  $memoryPass = $peakMemoryMb -le $MaxMemoryMb
  $audioPass = $maxAudioBytesSeen -le $MaxAudioBytes
  $report = [ordered]@{
    report = "SEPHIA Native Host Local Inference Benchmark"
    iterations = $Iterations
    coldStartupMs = $startupMs
    warmSynthesisMs = $warmTimes
    p95WarmSynthesisMs = $p95WarmMs
    maxCpuPercentOfTotalMachine = $maxCpu
    peakWorkingSetMb = $peakMemoryMb
    maxPcmBytes = $maxAudioBytesSeen
    checks = @{
      coldStartup = $startupPass
      warmSynthesis = $latencyPass
      cpu = $cpuPass
      memory = $memoryPass
      audioBuffer = $audioPass
    }
    playbackStartMeasured = $false
    voiceQualityReviewRequired = $true
    overallTechnicalPass = ($startupPass -and $latencyPass -and $cpuPass -and $memoryPass -and $audioPass)
    privacy = "Audio response was decoded and cleared in memory; no audio file or transcript was written by this benchmark."
  }
  $report | ConvertTo-Json -Depth 6
  if (-not $report.overallTechnicalPass) { exit 1 }
}
finally {
  if ($process -and -not $process.HasExited) {
    try { $process.Kill($true) } catch { try { $process.Kill() } catch {} }
    $process.WaitForExit(5000) | Out-Null
  }
  if ($process) { $process.Dispose() }
}
