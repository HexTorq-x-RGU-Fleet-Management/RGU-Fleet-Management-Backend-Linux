param(
  [string]$ClientLog,
  [switch]$NoPause
)
$ErrorActionPreference = 'Stop'

function Write-Check([string]$State, [string]$Message) {
  $label = if ($State -eq 'PASS') { '[PASS]' } elseif ($State -eq 'WARN') { '[WARN]' } else { '[FAIL]' }
  Write-Output "$label $Message"
}

function Find-IvmsInstall {
  $paths = @(
    (Join-Path ${env:ProgramFiles} 'iVMS-4200 Site\iVMS-4200 Client\Client\iVMS-4200.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'iVMS-4200 Site\iVMS-4200 Client\Client\iVMS-4200.exe'),
    (Join-Path ${env:ProgramFiles} 'iVMS-4200\iVMS-4200.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'iVMS-4200\iVMS-4200.exe')
  )
  $found = @($paths | Where-Object { $_ -and (Test-Path -LiteralPath $_) })
  if ($found.Count) { return $found[0] }
  $registryPaths = @(
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
  )
  foreach ($root in $registryPaths) {
    $entry = Get-ItemProperty $root -ErrorAction SilentlyContinue |
      Where-Object { $_.DisplayName -match 'iVMS-4200' } | Select-Object -First 1
    if ($entry) { return "installed ($($entry.DisplayName))" }
  }
  return $null
}

function Find-OpenSdkLogs {
  $scriptRoot = Split-Path -Parent $PSScriptRoot
  $known = @(
    (Join-Path $scriptRoot '..\..\..\..\Playground\Camera\log\opensdk\opensdk.log'),
    (Join-Path $scriptRoot '.local\logs\opensdk.log')
  )
  $roots = @($env:ProgramData, $env:LOCALAPPDATA, $env:APPDATA, $env:PUBLIC) |
    Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique
  $found = @($known | Where-Object { Test-Path -LiteralPath $_ })
  foreach ($root in $roots) {
    try {
      $found += Get-ChildItem -LiteralPath $root -Filter 'opensdk.log' -File -Recurse -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty FullName
    } catch { }
  }
  @($found | Where-Object { Test-Path -LiteralPath $_ } | Sort-Object -Unique |
    ForEach-Object { Get-Item -LiteralPath $_ } | Sort-Object LastWriteTime -Descending)
}
function Read-LogLines([string]$path) {
  $stream = $null; $reader = $null
  try {
    $stream = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete)
    $reader = [IO.StreamReader]::new($stream)
    while (($line = $reader.ReadLine()) -ne $null) { Write-Output $line }
  } finally {
    if ($reader) { $reader.Dispose() } elseif ($stream) { $stream.Dispose() }
  }
}

Write-Output 'RGU PLAYBACK GRANT EXPORT'
Write-Output '========================='
Write-Output ''

$install = Find-IvmsInstall
if ($install) { Write-Check PASS "iVMS-4200 installation detected: $install" }
else { Write-Check FAIL 'iVMS-4200 was not found in the standard installation locations.' }

$running = @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match '(?i)ivms' })
if ($running.Count) { Write-Check PASS "iVMS process is running ($($running[0].ProcessName))." }
else { Write-Check WARN 'iVMS is not currently running. Sign in and play a shared camera before retrying.' }

if ($ClientLog) {
  if (-not (Test-Path -LiteralPath $ClientLog)) { Write-Check FAIL "Requested log was not found: $ClientLog"; exit 2 }
  $logItem = Get-Item -LiteralPath $ClientLog
  Write-Check PASS "Using requested OpenSDK log: $($logItem.FullName)"
} else {
  $logs = Find-OpenSdkLogs
  if (-not $logs.Count) {
    Write-Check FAIL 'No opensdk.log was found in the known locations.'
    Write-Output 'Searched: Playground\Camera\log\opensdk, .local\logs, ProgramData, LocalAppData, AppData and Public.'
    Write-Output 'Open iVMS, sign in, play one shared camera, then run this helper again.'
    exit 2
  }
  $logItem = $logs[0]
  Write-Check PASS "OpenSDK log found: $($logItem.FullName)"
  if ($logs.Count -gt 1) { Write-Check WARN "Found $($logs.Count) logs; using newest: $($logItem.LastWriteTime)." }
}

$taskRegion = $false
$taskToken = $null
$hasLoginRecord = $false
$hasPlaybackEvidence = $false
try { $taskLines = @(Read-LogLines $logItem.FullName) }
catch {
  Write-Check FAIL "The OpenSDK log is locked and could not be read: $($logItem.FullName)"
  Write-Output 'Leave iVMS open and retry, or close iVMS and run this helper again.'
  exit 4
}
foreach ($taskLine in $taskLines) {
  if ($taskLine -notmatch 'COpenSDKUnited::GetLoginParams') { continue }
  $hasLoginRecord = $true
  $taskKey = [regex]::Match($taskLine, '\bKey\s*[:=]\s*(\d+)').Groups[1].Value
  $taskValue = [regex]::Match($taskLine, '\bValue\s*[:=]\s*(.*)$').Groups[1].Value.Trim()
  if ($taskKey -eq '3') { $taskRegion = $taskValue -match '^https://iindiaopen\.ezvizlife\.com(?:\s|$)' }
  if ($taskKey -eq '5' -and $taskRegion) {
    $taskCandidate = [regex]::Match($taskValue, '^at\.[A-Za-z0-9._-]{16,1024}(?=\s|$)').Value
    if ($taskCandidate) { $taskToken = $taskCandidate }
  }
  if ($taskLine -match '(?i)(play|playback|stream|channel|preview|live)') { $hasPlaybackEvidence = $true }
}

if ($hasLoginRecord) { Write-Check PASS 'Hik-Connect OpenSDK login record found in the log.' }
else { Write-Check FAIL 'No Hik-Connect login record found. Sign in to the correct iVMS account and retry.' }
if ($taskRegion) { Write-Check PASS 'India Hik-Connect region detected.' }
else { Write-Check FAIL 'India region login record was not found.' }
if ($taskToken) { Write-Check PASS 'Private playback grant found (token contents hidden).' }
else { Write-Check FAIL 'No playback grant found. The account may be signed out, the recorder may be offline, or no camera was played.' }
if ($hasPlaybackEvidence) { Write-Check PASS 'The log contains camera playback/stream activity.' }
else { Write-Check WARN 'No clear camera playback activity was found; live playback should be tested in iVMS first.' }

if (-not $taskToken) {
  Write-Output ''
  Write-Output 'Export stopped. No private file was created.'
  exit 3
}

$taskExportDir = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.local/migration'))
New-Item -ItemType Directory -Path $taskExportDir -Force | Out-Null
$taskTarget = Join-Path $taskExportDir 'playback.json'
$taskJson = @{ accessToken = $taskToken; expiresAt = $null } | ConvertTo-Json -Compress
[IO.File]::WriteAllText($taskTarget, $taskJson, [Text.UTF8Encoding]::new($false))
$taskToken = $null

Write-Output ''
Write-Check PASS "Private playback grant created: $taskTarget"
Write-Output 'Next: open the RGU portal, go to Settings → Hik-Connect account → Import playback authorization.'
Write-Output 'The file contents were not displayed. Do not email, commit or paste this file.'
if (-not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }
