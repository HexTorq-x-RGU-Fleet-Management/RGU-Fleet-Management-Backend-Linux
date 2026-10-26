@echo off
setlocal
title RGU Fleet - Export private playback grant
set "ROOT=%~dp0.."
set "DEFAULT_LOG=%~dp0..\..\..\..\Playground\Camera\log\opensdk\opensdk.log"
set "LOG=%~1"

if not defined LOG if exist "%DEFAULT_LOG%" set "LOG=%DEFAULT_LOG%"
echo Checking iVMS, the OpenSDK log and the playback grant...
if defined LOG (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\tools\export-windows-playback.ps1" -ClientLog "%LOG%"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\tools\export-windows-playback.ps1"
)
if errorlevel 1 (
  echo.
  echo Export failed. Make sure iVMS is signed in and has played a camera.
  pause
  exit /b 1
)
echo.
echo Created: "%ROOT%\.local\migration\playback.json"
echo Import this file in RGU Settings - Hik-Connect account - Import playback authorization.
echo Never email, print, commit or upload this file anywhere except the RGU HTTPS dialog.
pause
