$adb = 'C:\Users\Harsh\AppData\Local\Android\Sdk\platform-tools\adb.exe'
$apk = 'D:\FitAi\FitAI\android\app\build\outputs\apk\debug\app-debug.apk'
Write-Output 'Waiting for device (connect your phone via USB with USB Debugging enabled)...'
& $adb wait-for-device
Write-Output 'Device found! Installing APK...'
& $adb install -r $apk
