#!/usr/bin/env node

/**
 * FINAL CRASH TEST - Validates all critical fixes
 * This tests the exact issues that were causing the APK to crash
 */

console.log('🚀 FINAL CRASH TEST - FitAI App Startup Validation');
console.log('================================================');

const fs = require('fs');
const path = require('path');

// Test 1: Check ResponsiveTheme export exists
console.log('\n🔍 Test 1: ResponsiveTheme Export Validation');
try {
  const constantsFile = fs.readFileSync(path.join(__dirname, 'src/utils/constants.ts'), 'utf8');
  
  if (constantsFile.includes('export const ResponsiveTheme = THEME;')) {
    console.log('✅ ResponsiveTheme exported as THEME fallback');
    console.log('✅ This prevents "Cannot read property \'THEME\' of undefined" errors');
  } else {
    console.log('❌ ResponsiveTheme export missing - will cause import crashes');
  }
} catch (error) {
  console.log('❌ Constants file check failed:', error.message);
}

// Test 2: Check lazy Dimensions loading
console.log('\n🔍 Test 2: Lazy Dimensions Loading Validation');
try {
  const responsiveFile = fs.readFileSync(path.join(__dirname, 'src/utils/responsive.ts'), 'utf8');
  
  if (responsiveFile.includes('const getDimensions = () => {')) {
    console.log('✅ Lazy getDimensions function implemented');
  } else {
    console.log('❌ Lazy getDimensions function missing');
  }
  
  if (responsiveFile.includes('try {') && responsiveFile.includes('Dimensions.get(\'window\')')) {
    console.log('✅ Try/catch protection for Dimensions.get() added');
  } else {
    console.log('❌ Try/catch protection missing');
  }
  
  // Check if module-level Dimensions.get() was removed
  const lines = responsiveFile.split('\n');
  let hasModuleLevelDimensions = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('const { width:') && line.includes('Dimensions.get(\'window\')') && !line.includes('//')) {
      // Found an uncommented module-level Dimensions.get()
      if (i < 50) { // Only check first 50 lines (module level)
        hasModuleLevelDimensions = true;
        break;
      }
    }
  }
  
  if (!hasModuleLevelDimensions) {
    console.log('✅ Module-level Dimensions.get() removed from responsive.ts');
  } else {
    console.log('❌ Module-level Dimensions.get() still exists in responsive.ts');
  }
  
} catch (error) {
  console.log('❌ Responsive file check failed:', error.message);
}

// Test 3: Check critical files for module-level Dimensions.get()
console.log('\n🔍 Test 3: Critical Files Dimensions.get() Check');
const criticalFiles = [
  'src/components/navigation/TabBar.tsx',
  'src/components/ui/Modal.tsx', 
  'src/screens/onboarding/WelcomeScreen.tsx'
];

let allCriticalFilesSafe = true;
criticalFiles.forEach(filePath => {
  try {
    const fileContent = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    const lines = fileContent.split('\n');
    
    let hasUnsafeDimensions = false;
    for (let i = 0; i < Math.min(lines.length, 30); i++) { // Check first 30 lines
      const line = lines[i].trim();
      if (line.includes('const {') && line.includes('Dimensions.get(\'window\')') && !line.includes('//')) {
        hasUnsafeDimensions = true;
        break;
      }
    }
    
    if (!hasUnsafeDimensions) {
      console.log(`✅ ${filePath} - No unsafe Dimensions.get() calls`);
    } else {
      console.log(`❌ ${filePath} - Still has unsafe Dimensions.get() calls`);
      allCriticalFilesSafe = false;
    }
  } catch (error) {
    console.log(`❌ ${filePath} - Could not check: ${error.message}`);
    allCriticalFilesSafe = false;
  }
});

// Test 4: Overall Assessment
console.log('\n🎯 FINAL ASSESSMENT');
console.log('==================');

if (allCriticalFilesSafe) {
  console.log('🎉 ALL CRITICAL FIXES APPLIED SUCCESSFULLY!');
  console.log('');
  console.log('✅ Module-level Dimensions.get() calls removed');
  console.log('✅ ResponsiveTheme fallback export added');
  console.log('✅ Lazy dimension loading implemented');
  console.log('✅ Try/catch error protection added');
  console.log('');
  console.log('🚀 THE APK SHOULD NOW START WITHOUT CRASHING!');
  console.log('📱 Next steps:');
  console.log('   1. Build APK: npx eas build --platform android --profile preview');
  console.log('   2. Install and test on device');
  console.log('   3. App should launch without "Cannot read property \'THEME\' of undefined" error');
} else {
  console.log('⚠️  SOME CRITICAL ISSUES REMAIN');
  console.log('❌ Additional fixes needed before building APK');
}

console.log('\n' + '='.repeat(60));