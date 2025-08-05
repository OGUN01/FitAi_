#!/usr/bin/env node

/**
 * Android Emulator Setup Helper for FitAI Development
 * 
 * This script helps set up Android emulator for testing the development build.
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkAndroidStudio() {
  log('\n🔍 Checking Android Studio Installation...', colors.blue);
  
  try {
    execSync('adb version', { stdio: 'ignore' });
    log('✅ ADB is available', colors.green);
  } catch (error) {
    log('❌ ADB not found. Please install Android Studio or platform-tools', colors.red);
    return false;
  }

  try {
    execSync('emulator -version', { stdio: 'ignore' });
    log('✅ Android Emulator is available', colors.green);
  } catch (error) {
    log('⚠️  Emulator command not found. Make sure Android Studio is properly installed', colors.yellow);
  }

  return true;
}

function listAvailableAVDs() {
  log('\n📱 Available Android Virtual Devices:', colors.cyan);
  
  try {
    const result = execSync('emulator -list-avds', { encoding: 'utf8' });
    const avds = result.trim().split('\n').filter(line => line.trim());
    
    if (avds.length === 0) {
      log('❌ No AVDs found. Create one in Android Studio first.', colors.red);
      showAVDCreationInstructions();
      return [];
    }
    
    avds.forEach((avd, index) => {
      log(`${index + 1}. ${avd}`, colors.bright);
    });
    
    return avds;
  } catch (error) {
    log('❌ Unable to list AVDs. Make sure emulator is in PATH', colors.red);
    return [];
  }
}

function showAVDCreationInstructions() {
  log('\n🛠️  Creating Android Virtual Device (AVD):', colors.yellow);
  log('1. Open Android Studio', colors.bright);
  log('2. Go to Tools → AVD Manager', colors.bright);
  log('3. Click "Create Virtual Device"', colors.bright);
  log('4. Choose a device (recommended: Pixel 4 or newer)', colors.bright);
  log('5. Choose system image (recommended: API 30+ with Google Play)', colors.bright);
  log('6. Name your AVD (e.g., "FitAI_Dev")', colors.bright);
  log('7. Click "Finish"', colors.bright);
}

function startEmulator(avdName) {
  log(`\n🚀 Starting Android Emulator: ${avdName}`, colors.green);
  
  try {
    // Start emulator in background
    const emulatorProcess = spawn('emulator', ['-avd', avdName], {
      detached: true,
      stdio: 'ignore'
    });
    
    emulatorProcess.unref();
    
    log('✅ Emulator starting in background...', colors.green);
    log('⏳ Wait 30-60 seconds for emulator to fully boot', colors.yellow);
    log('\nNext steps:', colors.cyan);
    log('1. Wait for emulator to finish booting', colors.bright);
    log('2. Install development APK: npm run dev:install path/to/development.apk', colors.bright);
    log('3. Start development server: npm run dev:start', colors.bright);
    
  } catch (error) {
    log(`❌ Failed to start emulator: ${error.message}`, colors.red);
  }
}

function checkEmulatorStatus() {
  log('\n📊 Checking Emulator Status...', colors.blue);
  
  try {
    const result = execSync('adb devices', { encoding: 'utf8' });
    const lines = result.split('\n').filter(line => line.trim() && !line.includes('List of devices'));
    
    if (lines.length === 0) {
      log('❌ No devices/emulators connected', colors.red);
      return false;
    }
    
    log('Connected devices:', colors.green);
    lines.forEach(line => {
      const [device, status] = line.trim().split('\t');
      const deviceType = device.includes('emulator') ? '🖥️  Emulator' : '📱 Device';
      log(`${deviceType}: ${device} (${status})`, colors.bright);
    });
    
    return true;
  } catch (error) {
    log(`❌ Unable to check device status: ${error.message}`, colors.red);
    return false;
  }
}

function installAPK(apkPath) {
  if (!apkPath) {
    log('❌ Please provide APK path: npm run android:install path/to/app.apk', colors.red);
    return;
  }
  
  log(`\n📦 Installing APK: ${apkPath}`, colors.blue);
  
  try {
    execSync(`adb install -r "${apkPath}"`, { stdio: 'inherit' });
    log('✅ APK installed successfully', colors.green);
  } catch (error) {
    log(`❌ Failed to install APK: ${error.message}`, colors.red);
  }
}

function showEmulatorTips() {
  log('\n💡 Android Emulator Tips:', colors.cyan);
  log('');
  log('Performance:', colors.bright);
  log('• Enable Hardware Acceleration (HAXM/Hyper-V)', colors.yellow);
  log('• Allocate at least 4GB RAM to AVD', colors.yellow);
  log('• Use x86_64 system images (faster than ARM)', colors.yellow);
  log('');
  log('Debugging:', colors.bright);
  log('• Use Chrome DevTools: chrome://inspect', colors.yellow);
  log('• Shake device to open dev menu', colors.yellow);
  log('• Enable "Hot Reloading" in dev menu', colors.yellow);
  log('');
  log('Network:', colors.bright);
  log('• Emulator uses 10.0.2.2 to access host machine', colors.yellow);
  log('• Use Metro tunnel mode if having connection issues', colors.yellow);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];

  log('🤖 Android Emulator Setup for FitAI', colors.cyan);
  log('==================================', colors.cyan);

  switch (command) {
    case 'check':
      checkAndroidStudio();
      checkEmulatorStatus();
      break;
    case 'list':
      checkAndroidStudio();
      listAvailableAVDs();
      break;
    case 'start':
      if (!param) {
        const avds = listAvailableAVDs();
        if (avds.length > 0) {
          log(`\nUsage: node android-emulator-setup.js start ${avds[0]}`, colors.yellow);
        }
      } else {
        startEmulator(param);
      }
      break;
    case 'install':
      installAPK(param);
      break;
    case 'status':
      checkEmulatorStatus();
      break;
    case 'tips':
      showEmulatorTips();
      break;
    default:
      checkAndroidStudio();
      listAvailableAVDs();
      showEmulatorTips();
      log('\nCommands:', colors.cyan);
      log('check  - Check Android Studio installation', colors.bright);
      log('list   - List available AVDs', colors.bright);
      log('start <avd> - Start specific AVD', colors.bright);
      log('install <apk> - Install APK to connected device', colors.bright);
      log('status - Check connected devices', colors.bright);
      log('tips   - Show performance tips', colors.bright);
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkAndroidStudio,
  listAvailableAVDs,
  startEmulator,
  checkEmulatorStatus,
  installAPK,
};