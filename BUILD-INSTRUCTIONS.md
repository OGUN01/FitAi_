# FitAI Android Local Build Instructions

## Overview

Local builds are much faster than EAS cloud builds after the initial setup:
- **First build:** ~12 minutes (downloads dependencies, compiles everything)
- **Subsequent builds:** ~1-3 minutes (uses cached dependencies)

---

## Quick Reference

| Script | When to Use | Time |
|--------|-------------|------|
| `build-android.ps1` | Regular builds (JS/TS changes only) | ~1-3 min |
| `build-android-clean.ps1` | After adding new native packages | ~5-10 min |
| `install-android.ps1` | Just install existing APK to phone | ~30 sec |

---

## Build Scripts

### 1. Quick Build (Most Common)
Use this for regular development when you've only changed JavaScript/TypeScript code.

```powershell
cd D:\FitAi\FitAI
.\build-android.ps1
```

### 2. Clean Build
Use this after adding new native packages (e.g., `npm install some-native-package`).

```powershell
cd D:\FitAi\FitAI
.\build-android-clean.ps1
```

### 3. Install Only
Use this when APK is already built and you just want to install it on your phone.

```powershell
cd D:\FitAi\FitAI
.\install-android.ps1
```

---

## Manual Build Commands

If you prefer running commands manually:

### Quick Rebuild
```powershell
cd D:\FitAi\FitAI
$env:ANDROID_HOME = "C:\Users\Harsh\AppData\Local\Android\Sdk"
npx expo run:android --variant debug --no-bundler
```

### Full Clean Rebuild
```powershell
cd D:\FitAi\FitAI
$env:ANDROID_HOME = "C:\Users\Harsh\AppData\Local\Android\Sdk"
npx expo prebuild --platform android --clean
npx expo run:android --variant debug --no-bundler
```

### Install APK via ADB
```powershell
$env:ANDROID_HOME = "C:\Users\Harsh\AppData\Local\Android\Sdk"
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r "D:\FitAi\FitAI\android\app\build\outputs\apk\debug\app-debug.apk"
```

---

## APK Location

After a successful build, the APK is located at:
```
D:\FitAi\FitAI\android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Development Server

After installing the APK on your phone, start the Metro bundler for hot reload:

```powershell
cd D:\FitAi\FitAI
npx expo start --dev-client
```

Then open the FitAI app on your phone - it will connect to the dev server automatically.

---

## Installing on Your Phone

### Option 1: Via USB (ADB)
1. Enable **Developer Options** on your phone:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Go to Settings > Developer Options
   - Enable "USB Debugging"
3. Connect phone via USB cable
4. Accept the USB debugging prompt on your phone
5. Run `.\install-android.ps1`

### Option 2: Manual Transfer
1. Copy the APK file to your phone via:
   - USB file transfer
   - Google Drive
   - Email attachment
   - Any file sharing method
2. On your phone, open a file manager
3. Navigate to the APK and tap to install
4. Enable "Install from unknown sources" if prompted

---

## Troubleshooting

### PowerShell Script Blocked
If PowerShell blocks the scripts, run this once:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ANDROID_HOME Not Found
Set it permanently:
1. Open System Properties → Environment Variables
2. Add new System Variable:
   - Name: `ANDROID_HOME`
   - Value: `C:\Users\Harsh\AppData\Local\Android\Sdk`

### Build Fails After Adding Native Package
Use the clean build script:
```powershell
.\build-android-clean.ps1
```

### Device Not Detected
1. Check USB cable connection
2. Ensure USB Debugging is enabled
3. Try a different USB port
4. Accept any prompts on your phone
5. Run `adb devices` to verify

### Metro Bundler Connection Issues
Make sure your phone and computer are on the same WiFi network.

---

## Project Structure

```
D:\FitAi\FitAI\
├── android/                    # Native Android project
│   └── app/
│       └── build/
│           └── outputs/
│               └── apk/
│                   └── debug/
│                       └── app-debug.apk   # Built APK
├── build-android.ps1           # Quick build script
├── build-android-clean.ps1     # Clean build script
├── install-android.ps1         # Install script
└── BUILD-INSTRUCTIONS.md       # This file
```

---

## Tips

1. **Use Quick Build** for most development - it's much faster
2. **Use Clean Build** only when you add native packages
3. **Keep Metro running** for hot reload during development
4. **Check device connection** before installing via ADB

---

Last Updated: January 12, 2026
