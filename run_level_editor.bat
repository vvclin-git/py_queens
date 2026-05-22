@echo off
setlocal

cd /d "%~dp0"

start "py_queens level editor server" /min ".\.venv\Scripts\python.exe" -m http.server 8000 --bind 127.0.0.1
timeout /t 1 >nul
start "" "http://127.0.0.1:8000/tools/level_editor/"
