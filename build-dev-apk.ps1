# FitAI Development APK Build Script
# Builds a self-contained development APK with embedded JS bundle
# This APK will work without needing Metro bundler connection

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FitAI Development APK Builder" -ForegroundColor Cyan
Write-Host "  (Self-contained with JS bundle)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set environment
$env:ANDROID_HOME = "C:\Users\Harsh\AppData\Local\Android\Sdk"
$ADB = "$env:ANDROID_HOME\platform-tools\adb.exe"
$PROJECT_DIR = "D:\FitAi\FitAI"
$APK_OUTPUT = "$PROJECT_DIR\android\app\build\outputs\apk\debug\app-arm64-v8a-debug.apk"

Set-Location $PROJECT_DIR

# Step 1: Clear caches
Write-Host "[1/5] Clearing Expo cache..." -ForegroundColor Yellow
if (Test-Path ".expo") { Remove-Item -Recurse -Force ".expo" }
Write-Host "      Cache cleared" -ForegroundColor Green

# Step 2: Set up ADB reverse for hot reload
Write-Host "[2/5] Setting up ADB port forwarding..." -ForegroundColor Yellow
$devices = & $ADB devices
if ($devices -match "device$") {
    & $ADB reverse tcp:8081 tcp:8081
    Write-Host "      Port 8081 forwarded for Metro connection" -ForegroundColor Green
} else {
    Write-Host "      No device connected (will set up later)" -ForegroundColor Yellow
}

# Step 3: Build the APK with bundler (this embeds the JS)
Write-Host "[3/5] Building development APK with embedded JS bundle..." -ForegroundColor Yellow
Write-Host "      This may take 2-5 minutes..." -ForegroundColor Gray
Write-Host ""

# Use expo run:android WITHOUT --no-bundler to embed the JS bundle
# The --variant debug ensures dev-client is included for hot reload
npx expo run:android --variant debug

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  BUILD FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Check the error messages above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[4/5] Build successful!" -ForegroundColor Green

# Step 4: Find the APK
$possibleApks = @(
    "$PROJECT_DIR\android\app\build\outputs\apk\debug\app-arm64-v8a-debug.apk",
    "$PROJECT_DIR\android\app\build\outputs\apk\debug\app-debug.apk"
)

$APK_PATH = $null
foreach ($apk in $possibleApks) {
    if (Test-Path $apk) {
        $APK_PATH = $apk
        break
    }
}

if (-not $APK_PATH) {
    Write-Host "Could not find APK file!" -ForegroundColor Red
    exit 1
}

Write-Host "      APK: $APK_PATH" -ForegroundColor Cyan

# Step 5: Install on device
Write-Host "[5/5] Installing on device..." -ForegroundColor Yellow
$devices = & $ADB devices
if ($devices -match "device$") {
    & $ADB install -r $APK_PATH
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  SUCCESS! APK installed on device" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "NEXT STEPS for Hot Reload:" -ForegroundColor Cyan
        Write-Host "1. Run: npx expo start --dev-client" -ForegroundColor White
        Write-Host "2. Open the FitAI app on your phone" -ForegroundColor White
        Write-Host "3. It will connect to Metro for hot reload" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "Installation failed!" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "No device connected. APK location:" -ForegroundColor Yellow
    Write-Host $APK_PATH -ForegroundColor White
    Write-Host ""
    Write-Host "To install manually:" -ForegroundColor Cyan
    Write-Host "adb install -r `"$APK_PATH`"" -ForegroundColor White
}
