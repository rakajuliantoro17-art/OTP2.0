param(
  [Parameter(Mandatory = $true)]
  [string]$ModelDir,
  [switch]$Download
)

$ErrorActionPreference = "Stop"
$resolvedDir = [System.IO.Path]::GetFullPath($ModelDir)
if ($resolvedDir.StartsWith("\\")) { throw "Model provisioning must use a local disk, not a UNC share." }
New-Item -ItemType Directory -Path $resolvedDir -Force | Out-Null

$manifestPath = Join-Path $PSScriptRoot "..\docs\POCKET-TTS-INDONESIAN-ONNX-PROVENANCE.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$revision = "17257664e384561c957b02ac92edd1a24807f0e5"
$repo = "anak10thn/pocket-tts-indonesian"
$totalBytes = [int64]0

foreach ($file in $manifest.files) {
  if ($file.path.StartsWith("/") -or $file.path.Contains([char]92) -or $file.path.Split("/") -contains "..") {
    throw "Unsafe path in pinned model manifest."
  }
  $destination = Join-Path $resolvedDir $file.path
  if (-not (Test-Path -LiteralPath $destination -PathType Leaf)) {
    if (-not $Download) { throw "Missing $($file.path). Re-run with -Download to provision the pinned model bundle." }
    $url = "https://huggingface.co/$repo/resolve/$revision/$($file.path)?download=true"
    $temporary = "$destination.download"
    try {
      Invoke-WebRequest -Uri $url -OutFile $temporary -UseBasicParsing
      Move-Item -LiteralPath $temporary -Destination $destination -Force
    } catch {
      if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
      throw
    }
  }

  $item = Get-Item -LiteralPath $destination
  if ($item.Length -ne [int64]$file.bytes) { throw "Model file size mismatch: $($file.path)" }
  $actualHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne $file.sha256) { throw "Model file SHA-256 mismatch: $($file.path)" }
  $totalBytes += [int64]$file.bytes
  Write-Host ("Verified {0} ({1:N0} bytes)" -f $file.path, $item.Length)
}

if ($totalBytes -ne [int64]$manifest.modelBundleBytes) { throw "Model bundle total size mismatch." }
$canonical = ($manifest.files | ForEach-Object {
  "$($_.path)|$($_.bytes)|$($_.sha256)"
}) -join "`n"
$sha = [System.Security.Cryptography.SHA256]::Create()
try {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($canonical)
  $digest = ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
} finally {
  $sha.Dispose()
}
if ($digest -ne $manifest.modelBundleSha256) { throw "Pinned aggregate model bundle SHA-256 mismatch." }

Write-Host "Pocket TTS Indonesian model bundle verified."
Write-Host "Files: $($manifest.files.Count); total bytes: $totalBytes"
Write-Host "Attribution: Pocket TTS Indonesian by anak10thn, CC-BY-4.0."
Write-Host "This script downloads only when -Download is explicitly supplied. The runtime never downloads model files."
Write-Host "A separate adult feminine Indonesian voice reference and written consent are still required."
