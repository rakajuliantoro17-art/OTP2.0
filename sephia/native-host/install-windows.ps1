param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-p]{32}$')]
  [string]$ExtensionId,
  [Parameter(Mandatory = $true)]
  [string]$HostExePath,
  [Parameter(Mandatory = $true)]
  [string]$ModelDir,
  [Parameter(Mandatory = $true)]
  [string]$VoiceReferenceWav,
  [Parameter(Mandatory = $true)]
  [string]$VoiceConsentEvidencePath,
  [Parameter(Mandatory = $true)]
  [string]$ModelLicenseEvidencePath,
  [ValidateRange(1, 8)]
  [int]$Threads = 2
)

$ErrorActionPreference = "Stop"
$resolvedHost = (Resolve-Path -LiteralPath $HostExePath).Path
$resolvedModelDir = (Resolve-Path -LiteralPath $ModelDir).Path
$resolvedVoice = (Resolve-Path -LiteralPath $VoiceReferenceWav).Path
$resolvedConsent = (Resolve-Path -LiteralPath $VoiceConsentEvidencePath).Path
$resolvedLicense = (Resolve-Path -LiteralPath $ModelLicenseEvidencePath).Path
if (-not (Test-Path -LiteralPath $resolvedHost -PathType Leaf)) { throw "Native host executable not found." }
if (-not (Test-Path -LiteralPath $resolvedModelDir -PathType Container)) { throw "Model directory not found." }
if ([System.IO.Path]::GetExtension($resolvedVoice).ToLowerInvariant() -ne ".wav") { throw "Voice reference must be a WAV file." }
foreach ($evidence in @($resolvedConsent, $resolvedLicense)) {
  if (-not (Test-Path -LiteralPath $evidence -PathType Leaf)) { throw "Required evidence file not found: $evidence" }
}
if ($resolvedModelDir.StartsWith("\\")) { throw "Model bundle must be provisioned on a local disk, not a UNC share." }

$provenancePath = Join-Path $PSScriptRoot "..\docs\POCKET-TTS-INDONESIAN-ONNX-PROVENANCE.json"
$provenance = Get-Content -LiteralPath $provenancePath -Raw | ConvertFrom-Json
if (-not $provenance.files -or $provenance.files.Count -ne 9) { throw "Pinned Pocket TTS model manifest is invalid." }

$totalBytes = [int64]0
foreach ($file in $provenance.files) {
  if ($file.path.StartsWith("/") -or $file.path.Contains([char]92) -or $file.path.Split("/") -contains "..") {
    throw "Unsafe model path in pinned manifest."
  }
  $sourceFile = Join-Path $resolvedModelDir $file.path
  if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) { throw "Missing model file: $($file.path)" }
  $item = Get-Item -LiteralPath $sourceFile
  if ($item.Length -ne [int64]$file.bytes) { throw "Model file size mismatch: $($file.path)" }
  $actualHash = (Get-FileHash -LiteralPath $sourceFile -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne $file.sha256) { throw "Model file SHA-256 mismatch: $($file.path)" }
  $totalBytes += [int64]$file.bytes
}
if ($totalBytes -ne [int64]$provenance.modelBundleBytes) { throw "Model bundle byte total mismatch." }

$hostName = "com.smansasoo.sephia"
$origin = "chrome-extension://$ExtensionId/"
$installDir = Join-Path $env:LOCALAPPDATA "SMANSASOO\SEPHIA"
$modelInstallDir = Join-Path $installDir "models"
$evidenceDir = Join-Path $installDir "evidence"
New-Item -ItemType Directory -Path $modelInstallDir -Force | Out-Null
New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null

$installedHost = Join-Path $installDir "sephia-native-host.exe"
Copy-Item -LiteralPath $resolvedHost -Destination $installedHost -Force
$hostSourceDir = Split-Path -Parent $resolvedHost
Get-ChildItem -LiteralPath $hostSourceDir -Filter "*.dll" -File | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $installDir -Force
}

foreach ($file in $provenance.files) {
  $sourceFile = Join-Path $resolvedModelDir $file.path
  $destination = Join-Path $modelInstallDir $file.path
  $destinationDir = Split-Path -Parent $destination
  New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
  Copy-Item -LiteralPath $sourceFile -Destination $destination -Force
}

$installedVoice = Join-Path $installDir "voice-reference.wav"
Copy-Item -LiteralPath $resolvedVoice -Destination $installedVoice -Force
$consentExtension = [System.IO.Path]::GetExtension($resolvedConsent)
$installedConsent = Join-Path $evidenceDir ("voice-consent" + $consentExtension)
Copy-Item -LiteralPath $resolvedConsent -Destination $installedConsent -Force
$installedLicense = Join-Path $evidenceDir "model-license-evidence"
Copy-Item -LiteralPath $resolvedLicense -Destination $installedLicense -Force

$voiceHash = (Get-FileHash -LiteralPath $installedVoice -Algorithm SHA256).Hash.ToLowerInvariant()
$runtimeHash = (Get-FileHash -LiteralPath $installedHost -Algorithm SHA256).Hash.ToLowerInvariant()
$runtimeDlls = @()
Get-ChildItem -LiteralPath $installDir -Filter "*.dll" -File | ForEach-Object {
  $runtimeDlls += @{
    file_name = $_.Name
    sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  }
}
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$configPath = Join-Path $installDir "sephia-host-config.json"
$config = @{
  extension_origin = $origin
  model_dir = $modelInstallDir
  voice_reference_wav = $installedVoice
  voice_reference_sha256 = $voiceHash
  voice_consent_evidence_path = $installedConsent
  model_license_evidence_path = $installedLicense
  runtime_sha256 = $runtimeHash
  runtime_dlls = $runtimeDlls
  threads = $Threads
}
$configJson = $config | ConvertTo-Json -Depth 5
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

Write-Host "SEPHIA Native Messaging host installed."
Write-Host "Allowed extension: $origin"
Write-Host "Pinned model files verified: $($provenance.files.Count)"
Write-Host "Voice reference SHA-256: $voiceHash"
Write-Host "Restart Chrome before testing."
