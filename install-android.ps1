# FitAI Android Install Script
# Installs the existing APK to a connected device

$env:ANDROID_HOME = "C:\Users\Harsh\AppData\Local\Android\Sdk"
$apkPath = "D:\FitAi\FitAI\android\app\build\outputs\apk\debug\app-debug.apk"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FitAI APK Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if APK exists
if (-not (Test-Path $apkPath)) {
    Write-Host "APK not found! Run build-android.ps1 first." -ForegroundColor Red
    exit 1
}

# Show APK info
$apk = Get-Item $apkPath
Write-Host "APK: $($apk.Name)" -ForegroundColor White
Write-Host "Size: $([math]::Round($apk.Length / 1MB, 2)) MB" -ForegroundColor White
Write-Host "Built: $($apk.LastWriteTime)" -ForegroundColor White
Write-Host ""

# Check connected devices
Write-Host "Checking for connected devices..." -ForegroundColor Yellow
$devices = & "$env:ANDROID_HOME\platform-tools\adb.exe" devices
Write-Host $devices

if ($devices -match "device$") {
    Write-Host ""
    Write-Host "Installing APK..." -ForegroundColor Yellow
    & "$env:ANDROID_HOME\platform-tools\adb.exe" install -r $apkPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Installation successful!" -ForegroundColor Green
        Write-Host "Open the 'FitAI' app on your device." -ForegroundColor Cyan
    } else {
        Write-Host "Installation failed!" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "No device connected!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To connect your phone:" -ForegroundColor Yellow
    Write-Host "1. Enable Developer Options on your phone" -ForegroundColor White
    Write-Host "2. Enable USB Debugging" -ForegroundColor White
    Write-Host "3. Connect phone via USB cable" -ForegroundColor White
    Write-Host "4. Accept the USB debugging prompt on your phone" -ForegroundColor White
    Write-Host "5. Run this script again" -ForegroundColor White
}
