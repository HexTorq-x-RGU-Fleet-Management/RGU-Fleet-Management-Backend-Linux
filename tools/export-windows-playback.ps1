param([Parameter(Mandatory=$true)][string]$ClientLog)
$ErrorActionPreference = 'Stop'
$taskExportDir = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.local/migration'))
if (-not (Test-Path -LiteralPath $taskExportDir)) { throw 'Create the private migration directory using export-windows-key.ps1 first.' }
$taskRegion = $null; $taskToken = $null
foreach ($taskLine in [IO.File]::ReadLines((Resolve-Path -LiteralPath $ClientLog))) {
  if ($taskLine -notmatch 'COpenSDKUnited::GetLoginParams') { continue }
  $taskKey = [regex]::Match($taskLine, '\bKey\s*[:=]\s*(\d+)').Groups[1].Value
  $taskValue = [regex]::Match($taskLine, '\bValue\s*[:=]\s*(.*)$').Groups[1].Value.Trim()
  if ($taskKey -eq '3') { $taskRegion = $taskValue -match '^https://iindiaopen\.ezvizlife\.com(?:\s|$)' }
  if ($taskKey -eq '5' -and $taskRegion) {
    $taskCandidate = [regex]::Match($taskValue, '^at\.[A-Za-z0-9._-]{16,1024}(?=\s|$)').Value
    if ($taskCandidate) { $taskToken = $taskCandidate }
  }
}
if (-not $taskToken) { throw 'No matching India playback grant found. Sign into the correct account in iVMS first.' }
$taskTarget = Join-Path $taskExportDir 'playback.json'
$taskStream = [IO.File]::Open($taskTarget, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
try { $taskEncoded = [Text.Encoding]::UTF8.GetBytes((@{accessToken=$taskToken;expiresAt=$null} | ConvertTo-Json -Compress)); $taskStream.Write($taskEncoded, 0, $taskEncoded.Length) }
finally { $taskStream.Dispose(); $taskToken = $null }
Write-Output 'Private playback.json exported. Import through the Linux Settings dialog over HTTPS. The backend still has to verify this grant.'
