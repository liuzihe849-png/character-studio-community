@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" start.py
) else (
  py -3 setup.py --start
)
if errorlevel 1 pause
