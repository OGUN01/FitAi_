#!/usr/bin/env node

/**
 * FitAI Development Setup Helper
 * 
 * This script helps set up and manage the development workflow
 * for real-time coding with the development build APK.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkRequirements() {
  log('\n🔍 Checking Development Requirements...', colors.blue);
  
  try {
    // Check if EAS CLI is installed
    execSync('eas --version', { stdio: 'ignore' });
    log('✅ EAS CLI is installed', colors.green);
  } catch (error) {
    log('❌ EAS CLI is not installed. Install with: npm install -g eas-cli', colors.red);
    return false;
  }

  try {
    // Check if Expo CLI is installed
    execSync('expo --version', { stdio: 'ignore' });
    log('✅ Expo CLI is installed', colors.green);
  } catch (error) {
    log('❌ Expo CLI is not installed. Install with: npm install -g @expo/cli', colors.red);
    return false;
  }

  try {
    // Check if ADB is available (for device connection)
    execSync('adb version', { stdio: 'ignore' });
    log('✅ ADB is available', colors.green);
  } catch (error) {
    log('⚠️  ADB is not available. Install Android Studio or platform-tools for device connection', colors.yellow);
  }

  return true;
}

function showDeviceInstructions() {
  log('\n📱 Development Build Setup Instructions:', colors.cyan);
  log('');
  log('1. Build Development APK:', colors.bright);
  log('   npm run dev:build');
  log('');
  log('2. Download and install the APK on your device:', colors.bright);
  log('   - Check EAS build dashboard for download link');
  log('   - Or use: adb install development-build.apk');
  log('');
  log('3. Start development server:', colors.bright);
  log('   npm run dev:start');
  log('');
  log('4. Connect your device:', colors.bright);
  log('   - Ensure device and laptop are on same network');
  log('   - Open the development build app');
  log('   - Scan QR code or enter server URL manually');
  log('');
  log('5. Start coding! Changes will update in real-time 🚀', colors.green);
}

function showCommands() {
  log('\n⚡ Available Development Commands:', colors.magenta);
  log('');
  log('npm run dev:start     - Start development server', colors.bright);
  log('npm run dev:android   - Start with Android focus', colors.bright);
  log('npm run dev:tunnel    - Enable tunneling for remote access', colors.bright);
  log('npm run dev:build     - Create new development build', colors.bright);
  log('npm run dev:install   - Install APK via ADB', colors.bright);
  log('');
  log('Development workflow:', colors.bright);
  log('1. npm run dev:build   (only when native code changes)', colors.yellow);
  log('2. npm run dev:start   (for daily development)', colors.yellow);
  log('3. Make code changes   (auto-refresh in app)', colors.yellow);
}

function checkBuildStatus() {
  log('\n🏗️  Checking Latest Build Status...', colors.blue);
  
  try {
    const result = execSync('eas build:list --platform android --limit 1 --json', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    const builds = JSON.parse(result);
    if (builds.length > 0) {
      const latestBuild = builds[0];
      log(`Latest build: ${latestBuild.id}`, colors.bright);
      log(`Status: ${latestBuild.status}`, colors.bright);
      log(`Profile: ${latestBuild.buildProfile}`, colors.bright);
      
      if (latestBuild.status === 'finished' && latestBuild.artifacts) {
        log(`Download: ${latestBuild.artifacts.buildUrl}`, colors.green);
      } else if (latestBuild.status === 'in-progress') {
        log('Build is still in progress...', colors.yellow);
      }
    }
  } catch (error) {
    log('Unable to check build status. Make sure you\'re logged into EAS.', colors.red);
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  log('🚀 FitAI Development Setup Helper', colors.cyan);
  log('================================', colors.cyan);

  switch (command) {
    case 'check':
      checkRequirements();
      break;
    case 'instructions':
      showDeviceInstructions();
      break;
    case 'commands':
      showCommands();
      break;
    case 'status':
      checkBuildStatus();
      break;
    default:
      checkRequirements();
      showDeviceInstructions();
      showCommands();
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkRequirements,
  showDeviceInstructions,
  showCommands,
  checkBuildStatus,
};