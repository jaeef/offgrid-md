# MarkItDown Studio - PowerShell Launcher
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   MarkItDown Studio - Offline Converter               " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

$pyExe = $null
$pyArgs = @()
if (Get-Command py -ErrorAction SilentlyContinue) {
    $pyExe = "py"; $pyArgs = @("-3")
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $pyExe = "python"
}

if (-not $pyExe) {
    Write-Host "[ERROR] Python was not found in PATH." -ForegroundColor Red
    Write-Host "Install Python 3.10+ from https://www.python.org/ and tick" -ForegroundColor Yellow
    Write-Host "the 'Add Python to PATH' option during install." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

$venvPy = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPy)) {
    Write-Host "[*] Creating virtual environment (.venv)..." -ForegroundColor Yellow
    & $pyExe @pyArgs -m venv .venv
    if (-not (Test-Path $venvPy)) {
        Write-Host "[ERROR] Failed to create virtual environment." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "[*] Installing/Updating dependencies..." -ForegroundColor Yellow
& $venvPy -m pip install --quiet --disable-pip-version-check --no-warn-script-location --upgrade pip
& $venvPy -m pip install --quiet --disable-pip-version-check --no-warn-script-location -r "backend\requirements.txt"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Dependency install failed. See output above." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (Test-Path "package.json") {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "[WARN] Node.js/npm not found - skipping UI build." -ForegroundColor Yellow
        Write-Host "       Install Node.js 18+ from https://nodejs.org/ if the UI does not load." -ForegroundColor Yellow
    } else {
        if (-not (Test-Path "node_modules")) {
            Write-Host "[*] Installing UI packages..." -ForegroundColor Yellow
            npm install --silent
        }
        Write-Host "[*] Building UI..." -ForegroundColor Yellow
        npx vite build
    }
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "   Starting MarkItDown Studio..." -ForegroundColor Green
Write-Host "   Your browser will open automatically." -ForegroundColor Green
Write-Host "   Keep this window open while using the app." -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""

& $venvPy "backend\app.py"

Write-Host ""
Write-Host "[*] Server stopped." -ForegroundColor Yellow
Read-Host "Press Enter to close"