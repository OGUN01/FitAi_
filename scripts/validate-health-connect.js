#!/usr/bin/env node

/**
 * Health Connect Registration Validation Script
 * Run this before building production APKs to ensure Health Connect registration is proper
 * 
 * Usage:
 *   node scripts/validate-health-connect.js
 *   npm run validate:health-connect
 */

const fs = require('fs');
const path = require('path');

// Project root directory
const projectRoot = path.resolve(__dirname, '..');

console.log('🔍 Health Connect Registration Validation Starting...');
console.log(`📁 Project root: ${projectRoot}\n`);

/**
 * Validation results accumulator
 */
const results = {
  passed: [],
  warnings: [],
  errors: []
};

/**
 * Add result helper functions
 */
const addPassed = (message) => results.passed.push(message);
const addWarning = (message) => results.warnings.push(message);
const addError = (message) => results.errors.push(message);

/**
 * Check if file exists
 */
const checkFileExists = (filePath, description) => {
  if (fs.existsSync(filePath)) {
    addPassed(`${description} found`);
    return true;
  } else {
    addError(`${description} not found at: ${path.relative(projectRoot, filePath)}`);
    return false;
  }
};

/**
 * Read file content safely
 */
const readFileContent = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    addError(`Failed to read file: ${path.relative(projectRoot, filePath)} - ${error.message}`);
    return null;
  }
};

/**
 * Validate AndroidManifest.xml
 */
const validateAndroidManifest = () => {
  console.log('📱 Validating AndroidManifest.xml...');
  
  const manifestPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  
  if (!checkFileExists(manifestPath, 'AndroidManifest.xml')) {
    return;
  }

  const content = readFileContent(manifestPath);
  if (!content) return;

  // Required Health Connect permissions
  const requiredPermissions = [
    'android.permission.health.READ_STEPS',
    'android.permission.health.READ_HEART_RATE', 
    'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
    'android.permission.health.READ_DISTANCE',
    'android.permission.health.READ_WEIGHT',
    'android.permission.health.READ_SLEEP',
    'android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND'
  ];

  requiredPermissions.forEach(permission => {
    if (content.includes(permission)) {
      addPassed(`Health permission: ${permission}`);
    } else {
      addError(`Missing health permission: ${permission}`);
    }
  });

  // Health Connect app queries
  if (content.includes('com.google.android.apps.healthdata')) {
    addPassed('Health Connect app query declared');
  } else {
    addError('Missing Health Connect app query (required for app detection)');
  }

  // Health Connect permission rationale intent
  if (content.includes('androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE')) {
    addPassed('Health permissions rationale intent declared');
  } else {
    addError('Missing Health Connect permissions rationale intent');
  }

  // CRITICAL: Privacy policy intent filter
  const hasPrivacyPolicyIntent = content.includes('android.intent.action.VIEW_PERMISSION_USAGE') && 
                                content.includes('android.intent.category.HEALTH_PERMISSIONS');
  
  if (hasPrivacyPolicyIntent) {
    addPassed('✨ Privacy policy intent filter declared (CRITICAL for registration)');
  } else {
    addError('🚨 CRITICAL: Missing privacy policy intent filter - App will NOT appear in Health Connect permissions');
  }
};

/**
 * Validate app.config.js
 */
const validateAppConfig = () => {
  console.log('⚙️ Validating app.config.js...');
  
  const configPath = path.join(projectRoot, 'app.config.js');
  
  if (!checkFileExists(configPath, 'app.config.js')) {
    return;
  }

  const content = readFileContent(configPath);
  if (!content) return;

  // Health Connect configuration block
  if (content.includes('healthConnect:')) {
    addPassed('Health Connect configuration block found');

    // Check capabilities
    if (content.includes('HEALTH_PERMISSION_CAPABILITY')) {
      addPassed('Health Connect capabilities declared');
    } else {
      addError('Missing Health Connect capabilities');
    }

    // Check data types
    const requiredDataTypes = ['Steps', 'HeartRate', 'ActiveCaloriesBurned', 'Distance', 'Weight', 'SleepSession'];
    let dataTypesFound = 0;
    
    requiredDataTypes.forEach(dataType => {
      if (content.includes(`"${dataType}"`)) {
        addPassed(`Data type: ${dataType}`);
        dataTypesFound++;
      } else {
        addWarning(`Data type not explicitly declared: ${dataType}`);
      }
    });

    if (dataTypesFound >= 4) {
      addPassed('Sufficient data types declared for Health Connect registration');
    } else {
      addWarning('Consider declaring more data types for better Health Connect integration');
    }

    // Check privacy policy URL
    if (content.includes('privacyPolicyUrl:')) {
      addPassed('Privacy policy URL configured');
    } else {
      addError('Missing privacy policy URL (required for Health Connect registration)');
    }

    // Check description
    if (content.includes('description:') && content.includes('health')) {
      addPassed('Health Connect description provided');
    } else {
      addWarning('Consider adding health-focused description for Health Connect');
    }
  } else {
    addError('Missing Health Connect configuration block in app.config.js');
  }

  // Background permission in Android permissions
  if (content.includes('"android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND"')) {
    addPassed('Background health data permission in Android config');
  } else {
    addWarning('Background health data permission not found in Android permissions array');
  }
};

/**
 * Validate Health Connect service
 */
const validateHealthConnectService = () => {
  console.log('🔗 Validating Health Connect service...');
  
  const servicePath = path.join(projectRoot, 'src', 'services', 'healthConnect.ts');
  
  if (!checkFileExists(servicePath, 'Health Connect service')) {
    return;
  }

  const content = readFileContent(servicePath);
  if (!content) return;

  // Essential methods
  const requiredMethods = [
    { method: 'initialize', critical: true },
    { method: 'requestPermissions', critical: true },
    { method: 'validateActualPermissions', critical: true },
    { method: 'syncHealthData', critical: true },
    { method: 'getDetailedHealthConnectStatus', critical: false }
  ];

  requiredMethods.forEach(({ method, critical }) => {
    if (content.includes(`${method}(`)) {
      addPassed(`Service method: ${method}`);
    } else {
      if (critical) {
        addError(`Missing critical service method: ${method}`);
      } else {
        addWarning(`Missing service method: ${method}`);
      }
    }
  });

  // Real data validation
  if (content.includes('validateRealDataAvailability')) {
    addPassed('Real data validation implemented (prevents fake data)');
  } else {
    addWarning('Real data validation not implemented - may show fake data');
  }

  // Production error handling
  if (content.includes('SecurityException')) {
    addPassed('SecurityException handling for production builds');
  } else {
    addWarning('Missing SecurityException handling - production permission issues may not be caught');
  }

  // Environment detection integration
  if (content.includes('environmentDetector') || content.includes('shouldExpectHealthConnect')) {
    addPassed('Environment-aware Health Connect handling');
  } else {
    addWarning('Consider adding environment detection for better user experience');
  }
};

/**
 * Validate setup wizard
 */
const validateSetupWizard = () => {
  console.log('🧙 Validating Health Connect setup wizard...');
  
  const wizardPath = path.join(projectRoot, 'src', 'components', 'health', 'HealthConnectSetupWizard.tsx');
  
  if (checkFileExists(wizardPath, 'Health Connect setup wizard')) {
    const content = readFileContent(wizardPath);
    if (content && content.includes('validate_app_registration')) {
      addPassed('Setup wizard includes app registration validation');
    } else {
      addWarning('Setup wizard missing app registration validation step');
    }
  }
};

/**
 * Run all validations
 */
const runValidation = () => {
  validateAndroidManifest();
  console.log('');
  
  validateAppConfig();
  console.log('');
  
  validateHealthConnectService();
  console.log('');
  
  validateSetupWizard();
  console.log('');
  
  // Print summary
  console.log('📊 Health Connect Registration Validation Summary:');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`⚠️ Warnings: ${results.warnings.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);
  
  const isValid = results.errors.length === 0;
  console.log(`\n🎯 Overall Status: ${isValid ? '✅ VALID - Ready for production build' : '❌ INVALID - Fix errors before building'}`);

  // Print details if needed
  if (results.errors.length > 0) {
    console.log(`\n🚨 Critical Issues (must be fixed):`);
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ❌ ${error}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log(`\n⚠️ Warnings (recommended to fix):`);
    results.warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ⚠️ ${warning}`);
    });
  }

  console.log(`\n🔧 Next Steps:`);
  if (isValid) {
    console.log(`   1. ✅ Health Connect registration is properly configured`);
    console.log(`   2. 🚀 Safe to build production APK with: npm run build:production`);
    console.log(`   3. 📱 After installing, check if FitAI appears in Health Connect app permissions`);
  } else {
    console.log(`   1. 🔧 Fix all critical errors listed above`);
    console.log(`   2. 🔄 Run this validation again: npm run validate:health-connect`);
    console.log(`   3. 🚀 Only build production APK after all errors are resolved`);
  }

  return isValid;
};

// Run validation
const isValid = runValidation();

// Exit with appropriate code
process.exit(isValid ? 0 : 1);