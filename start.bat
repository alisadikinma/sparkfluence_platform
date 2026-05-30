@echo off
title Sparkfluence Dev Server
color 0A

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║     SPARKFLUENCE - Starting Dev...    ║
echo  ╚═══════════════════════════════════════╝
echo.

:: Start Python Backend in a new window
echo [1/2] Starting Python Backend (port 8000)...
start "Sparkfluence Backend" cmd /k "cd /d D:\Projects\sparkfluence_platform\backend && python main.py"

:: Small delay so backend window opens first
timeout /t 2 /nobreak >nul

:: Start Frontend in a new window
echo [2/2] Starting Frontend (port 5173)...
start "Sparkfluence Frontend" cmd /k "cd /d D:\Projects\sparkfluence_platform && npm run dev"

echo.
echo  ✓ Backend  → http://localhost:8000
echo  ✓ Frontend → http://localhost:5173
echo.
echo  Press any key to close this launcher...
pause >nul
