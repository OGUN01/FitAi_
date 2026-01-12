# FitAI Android CLEAN Build Script
# Use this when you've added new native packages (npm install with native modules)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FitAI Android CLEAN Build" -ForegroundColor Cyan
Write-Host "  (Use after adding native packages)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set Android SDK path
$env:ANDROID_HOME = "C:\Users\Harsh\AppData\Local\Android\Sdk"

# Navigate to project
Set-Location "D:\FitAi\FitAI"

Write-Host "[1/4] Regenerating native Android project..." -ForegroundColor Yellow
npx expo prebuild --platform android --clean

if ($LASTEXITCODE -ne 0) {
    Write-Host "Prebuild failed!" -ForegroundColor Red
    exit 1
}

Write-Host "[2/4] Native project regenerated" -ForegroundColor Green
Write-Host "[3/4] Building APK... (this may take 5-10 minutes)" -ForegroundColor Yellow
Write-Host ""

# Build the app
npx expo run:android --variant debug --no-bundler

# Check if build succeeded
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  CLEAN BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK Location:" -ForegroundColor Cyan
    Write-Host "D:\FitAi\FitAI\android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
    Write-Host ""
    
    # Check if device is connected
    $devices = & "$env:ANDROID_HOME\platform-tools\adb.exe" devices
    if ($devices -match "device$") {
        Write-Host "Device detected! Install now? (Y/N): " -ForegroundColor Yellow -NoNewline
        $install = Read-Host
        if ($install -eq "Y" -or $install -eq "y") {
            Write-Host "Installing APK..." -ForegroundColor Yellow
            & "$env:ANDROID_HOME\platform-tools\adb.exe" install -r "D:\FitAi\FitAI\android\app\build\outputs\apk\debug\app-debug.apk"
            Write-Host "Installation complete!" -ForegroundColor Green
        }
    }
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  BUILD FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}
