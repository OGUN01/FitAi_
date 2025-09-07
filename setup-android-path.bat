@echo off
echo ====================================
echo   FitAI Local Build Setup
echo ====================================
echo.

echo Setting up Android environment for local builds...
echo.

set ANDROID_HOME=C:\Users\Harsh\AppData\Local\Android\Sdk
set JAVA_HOME=C:\Program Files\Java\jdk-21
set PATH=%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%JAVA_HOME%\bin

echo ✅ Android Home: %ANDROID_HOME%
echo ✅ Java Home: %JAVA_HOME%
echo.

echo Verifying setup...
if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
    echo ✅ ADB found
) else (
    echo ❌ ADB not found - check Android SDK installation
    goto end
)

if exist "%JAVA_HOME%\bin\javac.exe" (
    echo ✅ Java compiler found
) else (
    echo ❌ Java compiler not found - check JDK installation
    goto end
)

echo.
echo 🎉 Environment setup complete! Available build commands:
echo.
echo   Development APK:     npm run build:development-local
echo   Preview APK:         npm run build:preview-local
echo   Production APK:      npm run build:production-local
echo   Production AAB:      npm run build:production-aab-local
echo.
echo 📱 For Google Play Store:
echo   • Use production-aab-local for production releases
echo   • Use production-local for internal testing
echo.

:end
echo.
pause
