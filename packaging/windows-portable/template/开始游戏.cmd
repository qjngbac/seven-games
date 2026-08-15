@echo off
chcp 65001 >nul
cd /d "%~dp0"

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 Windows PowerShell。
  echo 此便携版支持 Windows 10 和 Windows 11。
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
set "GAME_EXIT=%ERRORLEVEL%"
if not "%GAME_EXIT%"=="0" pause
exit /b %GAME_EXIT%
