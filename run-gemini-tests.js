#!/usr/bin/env node

/**
 * Simple Command Line Test Runner for Gemini Structured Output
 * 
 * Usage:
 *   node run-gemini-tests.js
 *   npm run test:gemini
 */

console.log('🧪 GEMINI STRUCTURED OUTPUT TEST RUNNER');
console.log('=' .repeat(60));

// Check if we can run the simple test
try {
  console.log('📋 Running simple Gemini test...\n');
  console.log('💡 For comprehensive testing, use: npm run test:gemini-full\n');

  // Run the simple test
  require('./test-gemini-simple.js');

} catch (error) {
  console.error('❌ Cannot load test suite:', error.message);
  console.log('\n🔧 TROUBLESHOOTING:');
  console.log('1. Make sure you are in the project root directory');
  console.log('2. Run: npm install');
  console.log('3. Make sure EXPO_PUBLIC_GEMINI_API_KEY is set in .env');
  console.log('4. Try running: node test-gemini-simple.js');
  process.exit(1);
}
