@echo off
setlocal
title MarkItDown Studio Launcher
color 0B

cd /d "%~dp0"

echo =======================================================
echo    Microsoft MarkItDown Studio - Offline Converter
echo =======================================================
echo.

set "PYEXE="
where py >nul 2>nul
if %ERRORLEVEL% equ 0 set "PYEXE=py -3"

if not defined PYEXE (
    where python >nul 2>nul
    if %ERRORLEVEL% equ 0 set "PYEXE=python"
)

if not defined PYEXE (
    echo [ERROR] Python was not found in PATH.
    echo Install Python 3.10+ from https://www.python.org/ and tick
    echo the "Add Python to PATH" option during install.
    echo.
    pause
    exit /b 1
)

set "VENV_PY=%~dp0.venv\Scripts\python.exe"

if not exist "%VENV_PY%" (
    echo [*] Creating virtual environment .venv ...
    %PYEXE% -m venv .venv
    if not exist "%VENV_PY%" (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

echo [*] Updating pip and installing dependencies into .venv ...
"%VENV_PY%" -m pip install --quiet --disable-pip-version-check --no-warn-script-location --upgrade pip
"%VENV_PY%" -m pip install --quiet --disable-pip-version-check --no-warn-script-location -r "backend\requirements.txt"
if errorlevel 1 (
    echo [ERROR] Dependency install failed. See output above.
    pause
    exit /b 1
)

if exist "package.json" (
    where npm >nul 2>nul
    if errorlevel 1 (
        echo [WARN] Node.js/npm not found - skipping UI build.
        echo        Install Node.js 18+ from https://nodejs.org/ if the UI does not load.
    ) else (
        if not exist "node_modules" (
            echo [*] Installing UI packages...
            call npm install
        )
        echo [*] Building UI...
        call npx vite build
    )
)

echo.
echo =======================================================
echo    Starting MarkItDown Studio...
echo    The exact localhost URL will be printed below.
echo    Keep this window open while using the app.
echo =======================================================
echo.

"%VENV_PY%" backend\app.py

echo.
echo [*] Server stopped. Press any key to close.
pause