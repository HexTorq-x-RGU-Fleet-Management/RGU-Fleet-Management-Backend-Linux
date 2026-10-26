param([Parameter(Mandatory=$true)][string]$WindowsBackend)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$taskSource = (Resolve-Path -LiteralPath $WindowsBackend).Path
$taskExport = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.local/migration'))
function Read-ProtectedJson([string]$taskFile) {
  $taskValue = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($taskFile), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  try { return ([Text.Encoding]::UTF8.GetString($taskValue) | ConvertFrom-Json) }
  finally { [Array]::Clear($taskValue, 0, $taskValue.Length) }
}
$taskDb = Read-ProtectedJson (Join-Path $taskSource '.local/database-admin.dpapi')
$taskRuntime = Read-ProtectedJson (Join-Path $taskSource '.local/runtime.dpapi')
# Exporting the original key also creates a directory restricted to this Windows user.
& (Join-Path $PSScriptRoot 'export-windows-key.ps1') -KeyFile (Join-Path $taskRuntime.dataDirectory 'provider-key.dpapi')
$taskUri = [Uri]$taskRuntime.databaseUrl
if ($taskUri.Host -ne '127.0.0.1' -or $taskUri.Port -ne 55432) { throw 'This helper only exports the private local PostgreSQL instance.' }
$taskDump = Join-Path $taskExport 'fleet.dump'
if (Test-Path -LiteralPath $taskDump) { throw 'A backup already exists. Preserve it before creating another.' }
$taskPreviousPassword = $env:PGPASSWORD
try {
  $env:PGPASSWORD = $taskDb.bootstrapPassword
  & (Join-Path $taskSource '.local/postgresql/pgsql/bin/pg_dump.exe') -h 127.0.0.1 -p 55432 -U saas_bootstrap -d ($taskUri.AbsolutePath.TrimStart('/')) -Fc --no-owner --no-acl -f $taskDump
  if ($LASTEXITCODE -ne 0) { throw 'Database export failed. Do not use an incomplete backup.' }
} finally { $env:PGPASSWORD = $taskPreviousPassword }
$taskTenantSource = Join-Path $taskRuntime.dataDirectory 'tenants'
$taskTenantTarget = Join-Path $taskExport 'tenants'
if (Test-Path -LiteralPath $taskTenantTarget) { throw 'Recording backup already exists; refusing to mix backup generations.' }
if (Test-Path -LiteralPath $taskTenantSource) { Copy-Item -LiteralPath $taskTenantSource -Destination $taskTenantTarget -Recurse }
Write-Output 'Private backup created: fleet.dump, tenants and provider-key in .local/migration. Keep Windows stopped until the backup is complete. Transfer securely; do not commit these files.'
