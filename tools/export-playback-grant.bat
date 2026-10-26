@echo off
setlocal
title RGU Fleet - Export private playback grant
set "ROOT=%~dp0.."
set "DEFAULT_LOG=%~dp0..\..\..\..\Playground\Camera\log\opensdk\opensdk.log"
set "LOG=%~1"

if not defined LOG if exist "%DEFAULT_LOG%" set "LOG=%DEFAULT_LOG%"
if not defined LOG (
  echo Enter the full path to the iVMS OpenSDK log file.
  set /p "LOG=Log path: "
)
if not defined LOG (
  echo No log path was provided.
  pause
  exit /b 2
)
if not exist "%LOG%" (
  echo Log file not found: "%LOG%"
  pause
  exit /b 2
)

echo Checking the iVMS log and creating a private playback grant...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\tools\export-windows-playback.ps1" -ClientLog "%LOG%"
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
