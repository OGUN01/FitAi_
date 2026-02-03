# FitAI Development Start Script
# Run this to start development with hot reload

$ADB = "C:\Users\Harsh\AppData\Local\Android\Sdk\platform-tools\adb.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FitAI Development Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check device connection
$devices = & $ADB devices
if ($devices -match "device$") {
    Write-Host "[OK] Device connected" -ForegroundColor Green
    
    # Kill any existing Metro processes
    Write-Host "[...] Killing stale connections..." -ForegroundColor Yellow
    & $ADB reverse --remove-all 2>$null
    
    # Set up port forwarding for both common ports
    & $ADB reverse tcp:8081 tcp:8081
    & $ADB reverse tcp:8082 tcp:8082
    Write-Host "[OK] Port forwarding set up (8081 & 8082)" -ForegroundColor Green
    
    # Verify port forwarding
    Write-Host ""
    Write-Host "Active port forwards:" -ForegroundColor Gray
    & $ADB reverse --list
} else {
    Write-Host "[!] No device connected - connect via USB first" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting Metro bundler with cache clear..." -ForegroundColor Yellow
Write-Host ""
Write-Host "INSTRUCTIONS:" -ForegroundColor Cyan
Write-Host "  1. Wait for Metro to show 'Metro waiting on...'" -ForegroundColor White
Write-Host "  2. On your phone, shake or press 'a' here to launch" -ForegroundColor White
Write-Host "  3. If stuck, force close app and reopen" -ForegroundColor White
Write-Host ""

# Start Metro with cache clear
npx expo start --dev-client --clear
