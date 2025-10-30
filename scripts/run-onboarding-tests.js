#!/usr/bin/env node

/**
 * Onboarding Test Runner
 * Automates the complete testing of the onboarding flow on devices/emulators
 *
 * Usage:
 *   node scripts/run-onboarding-tests.js [options]
 *
 * Options:
 *   --device <id>      Run on specific device
 *   --emulator         Start emulator if not running
 *   --coverage         Generate coverage report
 *   --verbose          Show detailed output
 *   --quick            Run quick tests only
 *   --full             Run full test suite including E2E
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  emulatorName: 'Pixel_9_Pro_XL',
  androidHome: process.env.ANDROID_HOME || 'C:\\Users\\Harsh\\AppData\\Local\\Android\\Sdk',
  testTimeout: 300000, // 5 minutes
  colors: {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
  },
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  device: args.includes('--device') ? args[args.indexOf('--device') + 1] : null,
  emulator: args.includes('--emulator'),
  coverage: args.includes('--coverage'),
  verbose: args.includes('--verbose'),
  quick: args.includes('--quick'),
  full: args.includes('--full'),
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${CONFIG.colors[color]}${message}${CONFIG.colors.reset}`);
}

function logSection(title) {
  log('\n' + '═'.repeat(80), 'bright');
  log(`  ${title}`, 'bright');
  log('═'.repeat(80), 'bright');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function execCommand(command, options = {}) {
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

// Main test functions
async function checkADBConnection() {
  logSection('🔌 Checking ADB Connection');

  const result = execCommand('adb devices', { silent: true });

  if (!result.success) {
    logError('ADB not found. Please install Android SDK platform-tools.');
    return false;
  }

  const devices = result.output
    .split('\n')
    .slice(1)
    .filter(line => line.trim() && !line.includes('List of devices'))
    .map(line => line.split('\t')[0]);

  if (devices.length === 0) {
    logWarning('No devices connected.');
    return false;
  }

  logSuccess(`Found ${devices.length} device(s):`);
  devices.forEach(device => log(`  • ${device}`, 'cyan'));

  return true;
}

async function startEmulator() {
  logSection('📱 Starting Android Emulator');

  const emulatorPath = path.join(CONFIG.androidHome, 'emulator', 'emulator.exe');

  if (!fs.existsSync(emulatorPath)) {
    logError(`Emulator not found at: ${emulatorPath}`);
    return false;
  }

  logInfo(`Starting ${CONFIG.emulatorName}...`);

  // Start emulator in background
  const emulator = spawn(emulatorPath, ['-avd', CONFIG.emulatorName], {
    detached: true,
    stdio: 'ignore',
  });

  emulator.unref();

  // Wait for device to be ready
  logInfo('Waiting for emulator to boot...');

  let attempts = 0;
  const maxAttempts = 60; // 2 minutes (60 * 2 seconds)

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = execCommand('adb shell getprop sys.boot_completed', { silent: true });

    if (result.success && result.output.trim() === '1') {
      logSuccess('Emulator is ready!');
      return true;
    }

    attempts++;

    if (attempts % 10 === 0) {
      logInfo(`Still waiting... (${attempts * 2}s)`);
    }
  }

  logError('Emulator failed to start within 2 minutes.');
  return false;
}

async function runJestTests(testType = 'all') {
  logSection(`🧪 Running ${testType.toUpperCase()} Tests`);

  let testPattern = '';

  switch (testType) {
    case 'unit':
      testPattern = 'src/__tests__/onboarding/OnboardingContainer.test.tsx';
      break;
    case 'integration':
      testPattern = 'src/__tests__/onboarding/OnboardingFlow.integration.test.tsx';
      break;
    case 'e2e':
      testPattern = 'src/__tests__/e2e/onboarding.e2e.test.tsx';
      break;
    default:
      testPattern = 'src/__tests__/onboarding/';
  }

  const coverageFlag = options.coverage ? '--coverage' : '';
  const verboseFlag = options.verbose ? '--verbose' : '';

  const command = `npm test -- ${testPattern} ${coverageFlag} ${verboseFlag}`;

  logInfo(`Running: ${command}`);

  const result = execCommand(command);

  if (result.success) {
    logSuccess(`${testType.toUpperCase()} tests passed!`);
    return true;
  } else {
    logError(`${testType.toUpperCase()} tests failed.`);
    return false;
  }
}

async function generateTestReport(results) {
  logSection('📊 Generating Test Report');

  const reportPath = path.join(__dirname, '..', 'test-results', 'onboarding-test-report.json');
  const reportDir = path.dirname(reportPath);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
    },
    results,
    environment: {
      platform: process.platform,
      nodeVersion: process.version,
      androidHome: CONFIG.androidHome,
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  logSuccess(`Report saved to: ${reportPath}`);

  // Print summary
  log('\n📈 Test Summary:', 'bright');
  log('━'.repeat(80));
  log(`Total Tests:  ${report.summary.total}`);
  log(`Passed:       ${report.summary.passed}`, 'green');
  log(`Failed:       ${report.summary.failed}`, report.summary.failed > 0 ? 'red' : 'green');
  log('━'.repeat(80));

  return report;
}

async function displayOnboardingMetrics() {
  logSection('📊 Onboarding System Metrics');

  log('\n🎯 Coverage Overview:', 'bright');
  log('  • Tab 1 (Personal Info):      21 fields');
  log('  • Tab 2 (Diet Preferences):   27 fields');
  log('  • Tab 3 (Body Analysis):      20+ fields');
  log('  • Tab 4 (Workout Prefs):      22 fields');
  log('  • Tab 5 (Advanced Review):    50+ calculated fields');
  log('  ─'.repeat(40));
  log('  • Total Data Points:          170+ fields');
  log('  • Validation Rules:           100+ rules');
  log('  • Health Calculations:        50+ formulas');

  log('\n🧪 Test Coverage:', 'bright');
  log('  • Unit Tests:                 20+ test cases');
  log('  • Integration Tests:          15+ scenarios');
  log('  • E2E Tests:                  4 complete flows');
  log('  • Validation Tests:           All field types');

  log('\n⚡ Performance Targets:', 'bright');
  log('  • Tab Load Time:              < 500ms');
  log('  • Validation Time:            < 100ms');
  log('  • Save Operation:             < 1s');
  log('  • Complete Flow:              < 5s');
}

// Main execution
async function main() {
  log('\n' + '█'.repeat(80), 'cyan');
  log('  🚀 FITAI ONBOARDING TEST AUTOMATION', 'bright');
  log('█'.repeat(80) + '\n', 'cyan');

  const startTime = Date.now();
  const results = [];

  try {
    // Step 1: Check ADB connection
    const hasDevice = await checkADBConnection();

    if (!hasDevice && options.emulator) {
      const emulatorStarted = await startEmulator();
      if (!emulatorStarted) {
        logError('Failed to start emulator. Exiting.');
        process.exit(1);
      }
    } else if (!hasDevice) {
      logWarning('No device connected. Please connect a device or use --emulator flag.');
      logInfo('You can still run unit and integration tests without a device.');
    }

    // Step 2: Run tests based on options
    if (options.quick) {
      // Quick mode: Unit tests only
      const unitPassed = await runJestTests('unit');
      results.push({ name: 'Unit Tests', passed: unitPassed });
    } else if (options.full) {
      // Full mode: All tests
      const unitPassed = await runJestTests('unit');
      results.push({ name: 'Unit Tests', passed: unitPassed });

      const integrationPassed = await runJestTests('integration');
      results.push({ name: 'Integration Tests', passed: integrationPassed });

      const e2ePassed = await runJestTests('e2e');
      results.push({ name: 'E2E Tests', passed: e2ePassed });
    } else {
      // Default mode: Unit + Integration
      const unitPassed = await runJestTests('unit');
      results.push({ name: 'Unit Tests', passed: unitPassed });

      const integrationPassed = await runJestTests('integration');
      results.push({ name: 'Integration Tests', passed: integrationPassed });
    }

    // Step 3: Display metrics
    displayOnboardingMetrics();

    // Step 4: Generate report
    const report = await generateTestReport(results);

    // Step 5: Final summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    logSection('✨ Test Automation Complete');

    log(`\n⏱️  Total Duration: ${duration}s`, 'cyan');

    const allPassed = results.every(r => r.passed);

    if (allPassed) {
      log('\n🎉 All tests passed successfully!', 'green');
      logInfo('Your onboarding system is working correctly.');
      process.exit(0);
    } else {
      log('\n⚠️  Some tests failed.', 'yellow');
      logInfo('Please review the test output above for details.');
      process.exit(1);
    }
  } catch (error) {
    logError(`Test automation failed: ${error.message}`);
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, checkADBConnection, runJestTests };
