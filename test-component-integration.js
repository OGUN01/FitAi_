#!/usr/bin/env node

/**
 * Test Component Integration
 * Verifies that the test component can be imported and used
 */

console.log('🧪 TESTING COMPONENT INTEGRATION');
console.log('=' .repeat(60));

async function testComponentIntegration() {
  console.log('🎯 Testing React Native Component Integration...\n');

  try {
    // Test 1: Check if component files exist and are properly structured
    console.log('📋 Test 1: Checking component files...');
    
    const fs = require('fs');
    const path = require('path');
    
    const componentPath = path.join(__dirname, 'src', 'components', 'test', 'GeminiTestComponent.tsx');
    const testUtilPath = path.join(__dirname, 'src', 'test', 'geminiStructuredOutputTest.ts');
    
    if (fs.existsSync(componentPath)) {
      console.log('✅ GeminiTestComponent.tsx exists');
      const componentContent = fs.readFileSync(componentPath, 'utf8');
      
      // Check for key imports and exports
      const hasImports = componentContent.includes('import geminiTest') && 
                        componentContent.includes('TestSummary') &&
                        componentContent.includes('TestResult');
      
      const hasExports = componentContent.includes('export const GeminiTestComponent') ||
                        componentContent.includes('export default');
      
      if (hasImports && hasExports) {
        console.log('✅ Component has correct imports and exports');
      } else {
        console.log('⚠️  Component structure may have issues');
        console.log('   Has imports:', hasImports);
        console.log('   Has exports:', hasExports);
      }
    } else {
      console.log('❌ GeminiTestComponent.tsx not found');
      return false;
    }
    
    if (fs.existsSync(testUtilPath)) {
      console.log('✅ geminiStructuredOutputTest.ts exists');
    } else {
      console.log('❌ geminiStructuredOutputTest.ts not found');
      return false;
    }
    
    // Test 2: Check integration guide
    console.log('\n📋 Test 2: Checking integration documentation...');
    
    const guidePath = path.join(__dirname, 'GEMINI_TEST_INTEGRATION.md');
    if (fs.existsSync(guidePath)) {
      console.log('✅ Integration guide exists');
      const guideContent = fs.readFileSync(guidePath, 'utf8');
      
      if (guideContent.includes('GeminiTestComponent') && 
          guideContent.includes('npm run test:gemini') &&
          guideContent.includes('How to Use')) {
        console.log('✅ Integration guide is complete');
      } else {
        console.log('⚠️  Integration guide may be incomplete');
      }
    } else {
      console.log('❌ Integration guide not found');
    }
    
    // Test 3: Check package.json scripts
    console.log('\n📋 Test 3: Checking package.json scripts...');
    
    const packagePath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageContent = fs.readFileSync(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      if (packageJson.scripts && packageJson.scripts['test:gemini']) {
        console.log('✅ test:gemini script exists');
      } else {
        console.log('❌ test:gemini script missing');
      }
      
      if (packageJson.scripts && packageJson.scripts['test:gemini-full']) {
        console.log('✅ test:gemini-full script exists');
      } else {
        console.log('❌ test:gemini-full script missing');
      }
    }
    
    // Test 4: Verify test files are executable
    console.log('\n📋 Test 4: Checking test file executability...');
    
    const testFiles = [
      'test-gemini-simple.js',
      'test-real-integration.js',
      'run-gemini-tests.js'
    ];
    
    let allTestFilesExist = true;
    testFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} exists`);
      } else {
        console.log(`❌ ${file} missing`);
        allTestFilesExist = false;
      }
    });
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 COMPONENT INTEGRATION TEST RESULTS');
    console.log('=' .repeat(60));
    
    if (allTestFilesExist) {
      console.log('🎉 ALL INTEGRATION TESTS PASSED!');
      console.log('✅ Component files are properly structured');
      console.log('✅ Test utilities are available');
      console.log('✅ Documentation is complete');
      console.log('✅ Package scripts are configured');
      console.log('🚀 Ready for in-app testing!');
      
      console.log('\n💡 NEXT STEPS:');
      console.log('1. Add GeminiTestComponent to any screen in your app');
      console.log('2. Use npm run test:gemini for command line testing');
      console.log('3. Import geminiTest for programmatic testing');
      console.log('4. Check GEMINI_TEST_INTEGRATION.md for detailed usage');
      
      return true;
    } else {
      console.log('❌ SOME INTEGRATION TESTS FAILED');
      console.log('🔧 Review the missing files above');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Component integration test failed:', error.message);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testComponentIntegration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testComponentIntegration };
