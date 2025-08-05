# 🚀 FitAI Real-Time Development Workflow

This guide explains how to set up and use the real-time development environment for FitAI, enabling instant code updates without rebuilding the APK.

## 🎯 Overview

The FitAI development workflow uses **Expo Development Builds** to create a custom development client that:
- ✅ Includes all native dependencies
- ✅ Connects to your laptop for real-time updates
- ✅ Supports hot reloading and fast refresh
- ✅ Works with physical devices and emulators
- ✅ Maintains 100% compatibility with production builds

## 🛠️ Initial Setup (One-Time)

### 1. Check Requirements
```bash
npm run dev:setup check
```

### 2. Create Development Build
```bash
npm run dev:build
```
This creates a custom APK with development client capabilities (~10-15 minutes).

### 3. Install on Device
- Download APK from EAS build dashboard
- Install via ADB: `adb install development-build.apk`
- Or use: `npm run dev:install development-build.apk`

## 📱 Daily Development Workflow

### 1. Start Development Server
```bash
npm run dev:start
```
This starts Metro bundler with development client support.

### 2. Connect Device
- Open the FitAI Development app on your device
- Scan the QR code from terminal/browser
- Or manually enter the server URL (e.g., `http://192.168.1.100:8081`)

### 3. Start Coding!
- Make changes to any `.ts`, `.tsx`, `.js`, `.jsx` files
- Changes appear instantly in the app (Fast Refresh)
- Component state is preserved during updates
- Syntax errors show helpful overlays

## 🔧 Available Commands

| Command | Purpose |
|---------|---------|
| `npm run dev:start` | Start development server |
| `npm run dev:android` | Start with Android device scanning |
| `npm run dev:tunnel` | Enable tunneling for remote access |
| `npm run dev:build` | Create new development build |
| `npm run dev:install` | Install APK via ADB |
| `npm run dev:setup` | Show setup instructions |
| `npm run dev:status` | Check build status |

## 💻 Laptop Testing Options

### Option 1: Physical Device (Recommended)
**Pros**: Real device performance, accurate testing
**Setup**:
1. Connect phone to same WiFi as laptop
2. Run `npm run dev:start`
3. Scan QR code in development app

### Option 2: Android Emulator
**Pros**: No physical device needed, debug tools
**Setup**:
1. Install Android Studio
2. Create AVD with API 30+
3. Run `npm run dev:android`

### Option 3: Web Development
**Pros**: Fastest iteration for UI work
**Setup**:
1. Run `npm run web`
2. Open browser to `http://localhost:8081`

## 🔄 When to Rebuild

You only need to rebuild the development client when:
- ✅ Adding new native dependencies
- ✅ Changing app.json configuration
- ✅ Modifying native code
- ✅ Updating Expo SDK version

For all JavaScript/TypeScript changes, use the development server.

## 🚨 Troubleshooting

### Device Can't Connect
```bash
# Check if development server is running
npm run dev:status

# Try tunnel mode for network issues
npm run dev:tunnel

# Ensure same network
ipconfig  # Windows
ifconfig  # Mac/Linux
```

### Build Failed
```bash
# Check build logs
eas build:list --platform android --limit 1

# Clear Metro cache
npx expo start --clear

# Reset node modules
rm -rf node_modules package-lock.json
npm install
```

### Slow Updates
```bash
# Kill and restart Metro
npx kill-port 8081
npm run dev:start

# Check file watching
echo "Test change" > test.txt && rm test.txt
```

## 🎛️ Advanced Configuration

### Custom Metro Config
Metro is configured in `metro.config.js` for optimal development:
- Fast file watching
- Hot reloading support
- Development client integration

### Environment Variables
Development builds use environment variables from `eas.json`:
- `EXPO_PUBLIC_ENVIRONMENT=development`
- `EXPO_PUBLIC_APP_NAME=FitAI Dev`
- All production APIs and keys

### Network Configuration
```bash
# For remote testing (teammates, different networks)
npm run dev:tunnel

# For local network only (faster)
npm run dev:start
```

## 📊 Performance Tips

1. **Keep Metro running** - Don't restart unless necessary
2. **Use Fast Refresh** - Preserves component state
3. **Monitor bundle size** - Large changes may take longer
4. **Use development build** - Much faster than production builds
5. **WiFi connection** - Faster than mobile data

## 🔗 Related Links

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/)
- [Metro Configuration](https://metrobundler.dev/docs/configuration)
- [React Native Fast Refresh](https://reactnative.dev/docs/fast-refresh)

---

## Quick Start Summary

```bash
# One-time setup
npm run dev:build

# Daily workflow
npm run dev:start
# Make code changes → See updates instantly ⚡
```

Happy coding! 🚀