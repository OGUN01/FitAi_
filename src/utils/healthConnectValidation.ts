/**
 * Health Connect Registration Validation Utility
 * Validates that all necessary components for Health Connect app registration are properly configured
 * This can be run during build-time to catch registration issues early
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  passed: string[];
}

interface HealthConnectConfig {
  // AndroidManifest.xml requirements
  hasHealthPermissions: boolean;
  hasHealthConnectQueries: boolean;
  hasPrivacyPolicyIntent: boolean;
  hasHealthPermissionIntent: boolean;
  
  // app.config.js requirements  
  hasHealthConnectMetadata: boolean;
  hasHealthCapabilities: boolean;
  hasDataTypes: boolean;
  hasPrivacyPolicyUrl: boolean;
}

/**
 * Main validation function for Health Connect registration
 */
export const validateHealthConnectRegistration = (projectRoot: string = process.cwd()): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    passed: []
  };

  console.log('🔍 Health Connect Registration Validation Starting...');

  try {
    // Validate AndroidManifest.xml
    const manifestValidation = validateAndroidManifest(projectRoot);
    result.errors.push(...manifestValidation.errors);
    result.warnings.push(...manifestValidation.warnings);
    result.passed.push(...manifestValidation.passed);

    // Validate app.config.js
    const configValidation = validateAppConfig(projectRoot);
    result.errors.push(...configValidation.errors);
    result.warnings.push(...configValidation.warnings);
    result.passed.push(...configValidation.passed);

    // Validate Health Connect service implementation
    const serviceValidation = validateHealthConnectService(projectRoot);
    result.errors.push(...serviceValidation.errors);
    result.warnings.push(...serviceValidation.warnings);
    result.passed.push(...serviceValidation.passed);

    result.isValid = result.errors.length === 0;

    // Print summary
    console.log(`\n📊 Health Connect Registration Validation Summary:`);
    console.log(`✅ Passed: ${result.passed.length}`);
    console.log(`⚠️ Warnings: ${result.warnings.length}`);
    console.log(`❌ Errors: ${result.errors.length}`);
    console.log(`\n🎯 Overall Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`);

    if (result.errors.length > 0) {
      console.log(`\n🚨 Critical Issues:`);
      result.errors.forEach(error => console.log(`   ❌ ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log(`\n⚠️ Warnings:`);
      result.warnings.forEach(warning => console.log(`   ⚠️ ${warning}`));
    }

    return result;
  } catch (error) {
    result.errors.push(`Validation failed: ${error}`);
    result.isValid = false;
    return result;
  }
};

/**
 * Validate AndroidManifest.xml for Health Connect requirements
 */
const validateAndroidManifest = (projectRoot: string): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    passed: []
  };

  const manifestPath = join(projectRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  
  if (!existsSync(manifestPath)) {
    result.errors.push('AndroidManifest.xml not found at expected location');
    return result;
  }

  try {
    const manifestContent = readFileSync(manifestPath, 'utf8');

    // Check required Health Connect permissions
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
      if (manifestContent.includes(permission)) {
        result.passed.push(`Health permission declared: ${permission}`);
      } else {
        result.errors.push(`Missing health permission: ${permission}`);
      }
    });

    // Check Health Connect queries
    if (manifestContent.includes('com.google.android.apps.healthdata')) {
      result.passed.push('Health Connect app query declared');
    } else {
      result.errors.push('Missing Health Connect app query for app detection');
    }

    if (manifestContent.includes('androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE')) {
      result.passed.push('Health Connect permissions rationale intent declared');
    } else {
      result.errors.push('Missing Health Connect permissions rationale intent');
    }

    // Check critical privacy policy intent filter
    if (manifestContent.includes('android.intent.action.VIEW_PERMISSION_USAGE') && 
        manifestContent.includes('android.intent.category.HEALTH_PERMISSIONS')) {
      result.passed.push('Privacy policy intent filter declared (CRITICAL for registration)');
    } else {
      result.errors.push('Missing privacy policy intent filter - CRITICAL for Health Connect app registration');
    }

    return result;
  } catch (error) {
    result.errors.push(`Failed to read AndroidManifest.xml: ${error}`);
    return result;
  }
};

/**
 * Validate app.config.js for Health Connect metadata
 */
const validateAppConfig = (projectRoot: string): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    passed: []
  };

  const configPath = join(projectRoot, 'app.config.js');
  
  if (!existsSync(configPath)) {
    result.errors.push('app.config.js not found - required for Health Connect metadata');
    return result;
  }

  try {
    const configContent = readFileSync(configPath, 'utf8');

    // Check Health Connect configuration block
    if (configContent.includes('healthConnect:')) {
      result.passed.push('Health Connect configuration block found');

      // Check capabilities
      if (configContent.includes('HEALTH_PERMISSION_CAPABILITY')) {
        result.passed.push('Health Connect capabilities declared');
      } else {
        result.errors.push('Missing Health Connect capabilities');
      }

      // Check data types
      const requiredDataTypes = ['Steps', 'HeartRate', 'ActiveCaloriesBurned', 'Distance', 'Weight', 'SleepSession'];
      requiredDataTypes.forEach(dataType => {
        if (configContent.includes(dataType)) {
          result.passed.push(`Data type declared: ${dataType}`);
        } else {
          result.warnings.push(`Data type not explicitly declared: ${dataType}`);
        }
      });

      // Check privacy policy URL
      if (configContent.includes('privacyPolicyUrl:')) {
        result.passed.push('Privacy policy URL configured');
      } else {
        result.errors.push('Missing privacy policy URL - required for Health Connect registration');
      }
    } else {
      result.errors.push('Missing Health Connect configuration block in app.config.js');
    }

    // Check background permission in permissions array
    if (configContent.includes('android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND')) {
      result.passed.push('Background health data permission in app config');
    } else {
      result.warnings.push('Background health data permission not found in app config');
    }

    return result;
  } catch (error) {
    result.errors.push(`Failed to read app.config.js: ${error}`);
    return result;
  }
};

/**
 * Validate Health Connect service implementation
 */
const validateHealthConnectService = (projectRoot: string): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    passed: []
  };

  const servicePath = join(projectRoot, 'src', 'services', 'healthConnect.ts');
  
  if (!existsSync(servicePath)) {
    result.errors.push('Health Connect service not found at src/services/healthConnect.ts');
    return result;
  }

  try {
    const serviceContent = readFileSync(servicePath, 'utf8');

    // Check essential methods
    const requiredMethods = [
      'initialize',
      'requestPermissions',
      'validateActualPermissions',
      'syncHealthData',
      'getDetailedHealthConnectStatus'
    ];

    requiredMethods.forEach(method => {
      if (serviceContent.includes(method)) {
        result.passed.push(`Health Connect service method: ${method}`);
      } else {
        result.errors.push(`Missing essential service method: ${method}`);
      }
    });

    // Check for real data validation
    if (serviceContent.includes('validateRealDataAvailability')) {
      result.passed.push('Real data validation implemented');
    } else {
      result.warnings.push('Real data validation not implemented');
    }

    // Check for production error handling
    if (serviceContent.includes('SecurityException')) {
      result.passed.push('SecurityException handling for production builds');
    } else {
      result.warnings.push('Missing SecurityException handling for production permission issues');
    }

    return result;
  } catch (error) {
    result.errors.push(`Failed to read Health Connect service: ${error}`);
    return result;
  }
};

/**
 * CLI entry point for build-time validation
 */
export const runHealthConnectValidation = () => {
  const projectRoot = process.cwd();
  const result = validateHealthConnectRegistration(projectRoot);
  
  if (!result.isValid) {
    console.log('\n🚨 Health Connect registration validation FAILED!');
    console.log('Fix the issues above before building for production.');
    process.exit(1);
  } else {
    console.log('\n✅ Health Connect registration validation PASSED!');
    console.log('Your app should be properly registered with Health Connect.');
  }
};

// CLI execution
if (require.main === module) {
  runHealthConnectValidation();
}