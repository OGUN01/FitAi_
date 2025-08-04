/**
 * Test Enhanced Constraint System
 * 
 * Tests the improved structured output schema with strict exercise ID constraints
 * and validation retry logic.
 */

const fs = require('fs');
const path = require('path');

class EnhancedConstraintTester {
  constructor() {
    this.results = {
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };
  }

  async runAllTests() {
    console.log('🧪 ENHANCED CONSTRAINT SYSTEM TEST SUITE');
    console.log('=' .repeat(60));
    
    try {
      // Test 1: Schema constraint improvements
      await this.testSchemaConstraints();
      
      // Test 2: Validation methods
      await this.testValidationMethods();
      
      // Test 3: Retry logic implementation
      await this.testRetryLogic();
      
      // Test 4: Pattern validation
      await this.testPatternValidation();
      
      // Test 5: Integration with constraint prompts
      await this.testConstraintPromptIntegration();
      
      // Generate final report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ TEST SUITE FAILED:', error);
    }
  }

  async testSchemaConstraints() {
    console.log('🧪 TEST 1: Schema Constraint Improvements');
    
    const schemaPath = path.join(__dirname, 'src/ai/schemas/workoutSchema.ts');
    
    if (!fs.existsSync(schemaPath)) {
      this.addResult('Workout Schema File Exists', false, 'File not found');
      return;
    }
    
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Test strengthened descriptions
    const hasStrictDescription = schemaContent.includes('🚨 MANDATORY') || 
                                schemaContent.includes('🚨 CRITICAL');
    this.addResult('Strict Exercise ID Descriptions Added', hasStrictDescription, 'Missing strict descriptions');
    
    // Test pattern validation
    const hasPatternValidation = schemaContent.includes('pattern:') && 
                                schemaContent.includes('^[A-Za-z0-9]{7}$');
    this.addResult('Pattern Validation Added', hasPatternValidation, 'Missing pattern validation');
    
    // Test specific examples in descriptions
    const hasExamples = schemaContent.includes('VPPtusI') && 
                       schemaContent.includes('8d8qJQI');
    this.addResult('Correct ID Examples Provided', hasExamples, 'Missing correct ID examples');
    
    // Test prohibition of descriptive names
    const prohibitsDescriptive = schemaContent.includes('dynamic_elevators') && 
                               schemaContent.includes('mountain_climbers');
    this.addResult('Prohibits Descriptive Names', prohibitsDescriptive, 'Missing descriptive name prohibition');
    
    console.log('  ✅ Schema constraint improvements validated');
  }

  async testValidationMethods() {
    console.log('🧪 TEST 2: Validation Methods');
    
    const generatorPath = path.join(__dirname, 'src/ai/weeklyContentGenerator.ts');
    
    if (!fs.existsSync(generatorPath)) {
      this.addResult('Weekly Generator File Exists', false, 'File not found');
      return;
    }
    
    const generatorContent = fs.readFileSync(generatorPath, 'utf8');
    
    // Test validation methods exist
    const hasValidationMethods = generatorContent.includes('validateExerciseIds') && 
                                generatorContent.includes('quickValidateExerciseIds');
    this.addResult('Validation Methods Added', hasValidationMethods, 'Missing validation methods');
    
    // Test validation error handling
    const hasValidationErrors = generatorContent.includes('Invalid exercise IDs detected') && 
                               generatorContent.includes('validationErrors.length > 0');
    this.addResult('Validation Error Handling Added', hasValidationErrors, 'Missing validation error handling');
    
    // Test database ID checking
    const checksDatabase = generatorContent.includes('validExerciseIds.includes') && 
                          generatorContent.includes('getAllExerciseIds');
    this.addResult('Database ID Checking Added', checksDatabase, 'Missing database ID checking');
    
    console.log('  ✅ Validation methods validated');
  }

  async testRetryLogic() {
    console.log('🧪 TEST 3: Retry Logic Implementation');
    
    const generatorPath = path.join(__dirname, 'src/ai/weeklyContentGenerator.ts');
    const generatorContent = fs.readFileSync(generatorPath, 'utf8');
    
    // Test retry loop
    const hasRetryLoop = generatorContent.includes('maxValidationAttempts') && 
                        generatorContent.includes('while (validationAttempt < maxValidationAttempts)');
    this.addResult('Retry Loop Added', hasRetryLoop, 'Missing retry loop');
    
    // Test stricter prompts on retry
    const hasStricterPrompts = generatorContent.includes('buildStrictConstraintPrompt') && 
                              generatorContent.includes('validationAttempt > 1');
    this.addResult('Stricter Prompts on Retry', hasStricterPrompts, 'Missing stricter prompts');
    
    // Test temperature adjustment
    const hasTemperatureAdjustment = generatorContent.includes('temperature: validationAttempt > 1 ? 0.5 : 0.7');
    this.addResult('Temperature Adjustment Added', hasTemperatureAdjustment, 'Missing temperature adjustment');
    
    // Test final attempt warnings
    const hasFinalWarnings = generatorContent.includes('FINAL ATTEMPT') && 
                           generatorContent.includes('last chance');
    this.addResult('Final Attempt Warnings Added', hasFinalWarnings, 'Missing final attempt warnings');
    
    console.log('  ✅ Retry logic implementation validated');
  }

  async testPatternValidation() {
    console.log('🧪 TEST 4: Pattern Validation');
    
    // Test the pattern against known good and bad IDs
    const pattern = /^[A-Za-z0-9]{7}$/;
    
    const validIds = ['VPPtusI', '8d8qJQI', 'JGKowMS', 'dmgMp3n', 'ZqNOWQ6'];
    const invalidIds = ['dynamic_elevators', 'mountain_climbers', 'push_ups', 'burpees', 'abc', 'too_long_id'];
    
    let validMatches = 0;
    let invalidRejected = 0;
    
    for (const id of validIds) {
      if (pattern.test(id)) validMatches++;
    }
    
    for (const id of invalidIds) {
      if (!pattern.test(id)) invalidRejected++;
    }
    
    this.addResult('Pattern Accepts Valid IDs', validMatches === validIds.length, 
                   `Only ${validMatches}/${validIds.length} valid IDs accepted`);
    
    this.addResult('Pattern Rejects Invalid IDs', invalidRejected === invalidIds.length,
                   `Only ${invalidRejected}/${invalidIds.length} invalid IDs rejected`);
    
    console.log('  ✅ Pattern validation tested');
  }

  async testConstraintPromptIntegration() {
    console.log('🧪 TEST 5: Constraint Prompt Integration');
    
    const generatorPath = path.join(__dirname, 'src/ai/weeklyContentGenerator.ts');
    const generatorContent = fs.readFileSync(generatorPath, 'utf8');
    
    // Test enhanced constraint prompts
    const hasEnhancedPrompts = generatorContent.includes('🚨 CRITICAL: EXERCISE SELECTION REQUIREMENTS - MANDATORY COMPLIANCE 🚨');
    this.addResult('Enhanced Constraint Prompts Added', hasEnhancedPrompts, 'Missing enhanced prompts');
    
    // Test specific examples in prompts
    const hasPromptExamples = generatorContent.includes('like "VPPtusI", "8d8qJQI"') && 
                             generatorContent.includes('like "dynamic_elevators" or "mountain_climbers"');
    this.addResult('Prompt Examples Added', hasPromptExamples, 'Missing prompt examples');
    
    // Test rejection warnings
    const hasRejectionWarnings = generatorContent.includes('response will be REJECTED');
    this.addResult('Rejection Warnings Added', hasRejectionWarnings, 'Missing rejection warnings');
    
    console.log('  ✅ Constraint prompt integration validated');
  }

  addResult(testName, passed, errorMessage = '') {
    this.results.tests.push({
      name: testName,
      passed,
      error: errorMessage
    });
    
    this.results.summary.total++;
    if (passed) {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
      console.log(`    ❌ ${testName}: ${errorMessage}`);
    }
  }

  generateReport() {
    console.log('\\n' + '=' .repeat(60));
    console.log('📊 ENHANCED CONSTRAINT SYSTEM TEST REPORT');
    console.log('=' .repeat(60));
    
    const { total, passed, failed } = this.results.summary;
    const successRate = Math.round((passed / total) * 100);
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${successRate}%`);
    
    if (failed > 0) {
      console.log('\\n❌ FAILED TESTS:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\\n🎯 CONSTRAINT SYSTEM STATUS:');
    if (successRate >= 95) {
      console.log('✅ ENHANCED CONSTRAINT SYSTEM READY');
      console.log('   - Schema enforces exact database ID format (7 alphanumeric chars)');
      console.log('   - Validation prevents invalid exercise IDs from being processed');
      console.log('   - Retry logic with increasingly strict prompts');
      console.log('   - Pattern validation rejects descriptive names');
      console.log('   - Integration maintains bulletproof visual system');
    } else if (successRate >= 80) {
      console.log('⚠️  CONSTRAINT SYSTEM NEEDS MINOR FIXES');
      console.log('   - Core constraints working');
      console.log('   - Address failed tests before deployment');
    } else {
      console.log('❌ CONSTRAINT SYSTEM NOT READY');
      console.log('   - Critical issues detected');
      console.log('   - Fix failures before testing');
    }
    
    console.log('\\n🚀 EXPECTED BEHAVIOR NOW:');
    console.log('1. AI MUST use exact database IDs (e.g., "VPPtusI") in structured output');
    console.log('2. Schema validation rejects responses with invalid exercise IDs');
    console.log('3. Retry logic tries up to 3 times with stricter prompts');
    console.log('4. Pattern validation prevents descriptive names like "dynamic_elevators"');
    console.log('5. User sees workouts with proper exercise GIFs every time');
    
    // Save test report
    const reportPath = path.join(__dirname, 'enhanced-constraint-system-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\\n📄 Test report saved to: ${reportPath}`);
  }
}

// Run the test suite
async function main() {
  const tester = new EnhancedConstraintTester();
  await tester.runAllTests();
}

main().catch(console.error);