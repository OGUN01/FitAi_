# FitAI Android Local Build Script
# Run this script to build the Android APK locally

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FitAI Android Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set Android SDK path
$env:ANDROID_HOME = "C:\Users\Harsh\AppData\Local\Android\Sdk"
Write-Host "[1/3] Android SDK configured" -ForegroundColor Green

# Navigate to project
Set-Location "D:\FitAi\FitAI"
Write-Host "[2/3] Building APK... (this may take 1-3 minutes)" -ForegroundColor Yellow
Write-Host ""

# Build the app
npx expo run:android --variant debug --no-bundler

# Check if build succeeded
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
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
    } else {
        Write-Host "No device connected. Copy APK manually to your phone." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  BUILD FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Check the error messages above." -ForegroundColor Red
}
