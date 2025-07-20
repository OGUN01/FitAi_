// Simple test script to validate structured output implementation
// Run with: node test-ai-structured-output.js

const { runAllTests } = require('./src/ai/test-structured-output.ts');

async function main() {
  console.log('🧪 Testing FitAI Structured Output Implementation');
  console.log('================================================');
  
  try {
    await runAllTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

main();
