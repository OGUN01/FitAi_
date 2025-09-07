# 🚀 FitAI Development Guide - Complete Setup & Commands

This guide contains all the commands you need to build and run FitAI locally on Windows.

## 📋 Prerequisites Check

Make sure you have these installed:
- ✅ Java JDK (already installed at `C:\Program Files\Java\jdk-21`)
- ✅ Android Studio with SDK (already installed at `C:\Users\Harsh\AppData\Local\Android\Sdk`)
- ✅ Node.js and npm (for running the development server)

## ⚡ **OPTIONAL: Simplify Commands (One-time setup)**

To use short commands like `emulator` and `adb` instead of full paths:

1. **Run the setup script:**
```bash
# Run from your project folder
setup-android-path.bat
```

2. **Restart your terminal** or run `refreshenv` in Command Prompt

3. **Test the commands:**
```bash
emulator -list-avds
adb devices
```

After this setup, you can use:
- `emulator -avd Medium_Phone_API_36.0` instead of the long path
- `adb install app.apk` instead of the full path

---

## 🎯 Quick Start Commands

### 1️⃣ **Build Development APK (One-time setup)**

Open terminal in your project folder (`D:\FitAi\FitAI`) and run:

```bash
cd android && ./gradlew assemblePlayDebug
```

**What this does:** Creates a development APK that can connect to your laptop for real-time changes  
**Time:** 5-7 minutes  
**Output location:** `android/app/build/outputs/apk/play/debug/app-play-debug.apk`

### 2️⃣ **Start Android Emulator**

```bash
"C:\Users\Harsh\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone_API_36.0
```

**What this does:** Opens the Android emulator on your screen  
**Note:** Keep this running in the background

### 3️⃣ **Install APK on Emulator**

After the APK build completes:

```bash
adb install android/app/build/outputs/apk/play/debug/app-play-debug.apk
```

**What this does:** Installs your app on the emulator  
**Success message:** "Success" or "Performing Streamed Install"

### 4️⃣ **Start Development Server**

In a new terminal window:

```bash
npm start
```

**What this does:** Starts Metro bundler for real-time code updates  
**What you'll see:** QR code and Metro bundler running on port 8081

### 5️⃣ **Connect App to Server**

After `npm start` is running:
- Open the FitAI app on your emulator
- Press `a` in the terminal where npm start is running
- Or shake the device (Ctrl+M) and select "Debug server host"
- Enter: `10.0.2.2:8081` (for emulator) or your laptop IP for physical device

## 🔄 Daily Development Workflow

Once you've done the initial setup, here's your daily workflow:

### **Every Day (Simple 3 Steps):**

1. **Start Emulator:**
```bash
# After running setup-android-path.bat (simplified command):
emulator -avd Medium_Phone_API_36.0

# Or use full path if not set up:
"C:\Users\Harsh\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone_API_36.0
```

2. **Start Dev Server:**
```bash
npm start
```

3. **Open App:** 
- The app is already installed, just click on it in emulator
- It automatically connects to your dev server

**That's it!** Now any code changes you make will appear instantly.

## 📱 Building Different APK Types

### **Development APK (for testing with real-time changes):**
```bash
cd android && ./gradlew assemblePlayDebug
```
Output: `android/app/build/outputs/apk/play/debug/app-play-debug.apk`

### **Production APK (for final testing/release):**
```bash
cd android && ./gradlew assemblePlayRelease
```
Output: `android/app/build/outputs/apk/play/release/app-play-release.apk`

## 🛠️ Useful Commands

### **Check Connected Devices:**
```bash
adb devices
```

### **Clear Build Cache (if build fails):**
```bash
cd android && ./gradlew clean
```

### **Uninstall App from Emulator:**
```bash
adb uninstall com.fitai.app
```

### **View Logs from Device:**
```bash
adb logcat
```

### **Kill Development Server:**
Press `Ctrl+C` in the terminal running npm start

### **List Available Emulators:**
```bash
"C:\Users\Harsh\AppData\Local\Android\Sdk\emulator\emulator.exe" -list-avds
```

## 🔥 Real-Time Development Features

Once connected to development server, you can:

1. **Edit any JavaScript/TypeScript file** → Changes appear instantly
2. **Modify styles** → See updates immediately
3. **Add new screens/components** → No rebuild needed
4. **Fix bugs** → Test fixes in real-time
5. **Shake device (Ctrl+M)** → Opens developer menu with:
   - Reload option
   - Debug in Chrome
   - Show Inspector
   - Performance monitor

## ⚡ Speed Comparison

| Task | EAS Cloud | Local Build | Dev Server |
|------|-----------|-------------|------------|
| Production APK | 3+ hours | 10-15 mins | N/A |
| Development APK | 3+ hours | 5-7 mins | N/A |
| Code Changes | Rebuild needed | Rebuild needed | **Instant!** |

## 🚨 Troubleshooting

### **Build Fails?**
```bash
cd android && ./gradlew clean
cd android && ./gradlew assemblePlayDebug
```

### **Emulator Won't Start?**
- Open Android Studio → AVD Manager → Start emulator from there

### **Can't Connect to Dev Server?**
- Make sure `npm start` is running
- Check firewall isn't blocking port 8081
- Try: `adb reverse tcp:8081 tcp:8081`

### **Metro Bundler Error?**
```bash
npx react-native start --reset-cache
```

## 📝 Notes

- **First build takes longer** (5-7 minutes) because it downloads dependencies
- **Subsequent builds are faster** (2-3 minutes) due to caching
- **Development server must stay running** for real-time changes
- **Keep emulator open** for faster testing
- **Java and Android SDK paths** are already configured in your system

## 🎉 Summary

**Initial Setup (one-time):**
1. Build development APK
2. Install on emulator

**Daily Use (every time):**
1. Start emulator
2. Run `npm start`
3. Open app and code!

**Result:** Instant updates without rebuilding! 🚀

---

*Last Updated: December 2024*  
*Project: FitAI - AI Fitness Coach*