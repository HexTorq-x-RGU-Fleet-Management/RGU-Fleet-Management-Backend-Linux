param([Parameter(Mandatory=$true)][string]$KeyFile)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$taskExportDir = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.local/migration'))
[IO.Directory]::CreateDirectory($taskExportDir) | Out-Null
$taskIdentity = [Security.Principal.WindowsIdentity]::GetCurrent().User
$taskAcl = New-Object Security.AccessControl.DirectorySecurity
$taskAcl.SetAccessRuleProtection($true, $false)
$taskAcl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($taskIdentity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
Set-Acl -LiteralPath $taskExportDir -AclObject $taskAcl
$taskBytes = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $KeyFile)), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
if ($taskBytes.Length -ne 32) { throw 'Unexpected provider key length' }
$taskTarget = Join-Path $taskExportDir 'provider-key'
$taskStream = [IO.File]::Open($taskTarget, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
try {
  $taskEncoded = [Text.Encoding]::ASCII.GetBytes([Convert]::ToBase64String($taskBytes))
  $taskStream.Write($taskEncoded, 0, $taskEncoded.Length)
} finally { $taskStream.Dispose(); [Array]::Clear($taskBytes, 0, $taskBytes.Length) }
Write-Output 'Original key exported to the private .local/migration/provider-key file. No key displayed. Transfer securely; do not commit it.'
