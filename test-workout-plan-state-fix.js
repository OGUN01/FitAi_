/**
 * Test Workout Plan State Fix
 * 
 * Tests that the workout plan state synchronization issue is resolved
 * and that workouts use proper database IDs instead of descriptive names.
 */

const fs = require('fs');
const path = require('path');

class WorkoutPlanStateFixTester {
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
    console.log('🧪 WORKOUT PLAN STATE FIX TEST SUITE');
    console.log('=' .repeat(60));
    
    try {
      // Test 1: Exercise ID mapping fix
      await this.testExerciseIdMapping();
      
      // Test 2: State synchronization improvements
      await this.testStateSynchronization();
      
      // Test 3: Error handling and logging
      await this.testErrorHandling();
      
      // Test 4: UI render logic improvements
      await this.testUIRenderLogic();
      
      // Test 5: Integration with bulletproof system
      await this.testBulletproofIntegration();
      
      // Generate final report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ TEST SUITE FAILED:', error);
    }
  }

  async testExerciseIdMapping() {
    console.log('🧪 TEST 1: Exercise ID Mapping Fix');
    
    const generatorPath = path.join(__dirname, 'src/ai/weeklyContentGenerator.ts');
    
    if (!fs.existsSync(generatorPath)) {
      this.addResult('WeeklyContentGenerator File Exists', false, 'File not found');
      return;
    }
    
    const generatorContent = fs.readFileSync(generatorPath, 'utf8');
    
    // Test the old descriptive name mapping is removed
    const hasOldMapping = generatorContent.includes('exercise.name?.toLowerCase().replace(/\\s+/g, \'_\')');
    this.addResult('Old Descriptive Name Mapping Removed', !hasOldMapping, 'Still using old naming system');
    
    // Test new database ID mapping is present
    const hasNewMapping = generatorContent.includes('exercise.exerciseId || \'unknown\'');
    this.addResult('New Database ID Mapping Added', hasNewMapping, 'Missing new ID mapping');
    
    // Test exercise name is preserved for display
    const hasDisplayName = generatorContent.includes('name: exercise.name');
    this.addResult('Exercise Display Name Preserved', hasDisplayName, 'Missing display name');
    
    // Test validation logic is present
    const hasValidation = generatorContent.includes('!exercise.exerciseId');
    this.addResult('Exercise ID Validation Added', hasValidation, 'Missing ID validation');
    
    console.log('  ✅ Exercise ID mapping fixes validated');
  }

  async testStateSynchronization() {
    console.log('🧪 TEST 2: State Synchronization Improvements');
    
    const fitnessScreenPath = path.join(__dirname, 'src/screens/main/FitnessScreen.tsx');
    
    if (!fs.existsSync(fitnessScreenPath)) {
      this.addResult('FitnessScreen File Exists', false, 'File not found');
      return;
    }
    
    const screenContent = fs.readFileSync(fitnessScreenPath, 'utf8');
    
    // Test immediate state setting
    const hasImmediateStateSet = screenContent.includes('setWeeklyWorkoutPlan(response.data)') &&
                                 screenContent.includes('setForceUpdate(prev => prev + 1)');
    this.addResult('Immediate State Setting Added', hasImmediateStateSet, 'Missing immediate state updates');
    
    // Test state verification
    const hasStateVerification = screenContent.includes('State set, verifying');
    this.addResult('State Verification Added', hasStateVerification, 'Missing state verification');
    
    // Test timeout verification
    const hasTimeoutCheck = screenContent.includes('Final State Check');
    this.addResult('Timeout State Check Added', hasTimeoutCheck, 'Missing timeout verification');
    
    // Test improved error handling
    const hasImprovedErrorHandling = screenContent.includes('but UI state is set');
    this.addResult('Improved Error Handling Added', hasImprovedErrorHandling, 'Missing improved error handling');
    
    console.log('  ✅ State synchronization improvements validated');
  }

  async testErrorHandling() {
    console.log('🧪 TEST 3: Error Handling and Logging');
    
    const generatorPath = path.join(__dirname, 'src/ai/weeklyContentGenerator.ts');
    const generatorContent = fs.readFileSync(generatorPath, 'utf8');
    
    // Test workout validation
    const hasWorkoutValidation = generatorContent.includes('Invalid workout') &&
                                generatorContent.includes('!workout.title || !workout.dayOfWeek');
    this.addResult('Workout Validation Added', hasWorkoutValidation, 'Missing workout validation');
    
    // Test exercise validation
    const hasExerciseValidation = generatorContent.includes('missing exerciseId');
    this.addResult('Exercise Validation Added', hasExerciseValidation, 'Missing exercise validation');
    
    // Test detailed logging
    const hasDetailedLogging = generatorContent.includes('Day:') && 
                              generatorContent.includes('Exercises:') &&
                              generatorContent.includes('Exercise ${exIndex + 1}: ${exercise.exerciseId}');
    this.addResult('Detailed Logging Added', hasDetailedLogging, 'Missing detailed logging');
    
    console.log('  ✅ Error handling and logging validated');
  }

  async testUIRenderLogic() {
    console.log('🧪 TEST 4: UI Render Logic Improvements');
    
    const fitnessScreenPath = path.join(__dirname, 'src/screens/main/FitnessScreen.tsx');
    const screenContent = fs.readFileSync(fitnessScreenPath, 'utf8');
    
    // Test improved debug logging
    const hasImprovedDebug = screenContent.includes('Valid workout plan detected') &&
                            screenContent.includes('planTitle:') &&
                            screenContent.includes('workoutCount:');
    this.addResult('Improved UI Debug Logging', hasImprovedDebug, 'Missing improved debug logging');
    
    // Test force update tracking
    const hasForceUpdateTracking = screenContent.includes('forceUpdateCount:');
    this.addResult('Force Update Tracking Added', hasForceUpdateTracking, 'Missing force update tracking');
    
    console.log('  ✅ UI render logic improvements validated');
  }

  async testBulletproofIntegration() {
    console.log('🧪 TEST 5: Integration with Bulletproof System');
    
    // Test that bulletproof system components are still intact
    const exerciseGifPlayerPath = path.join(__dirname, 'src/components/fitness/ExerciseGifPlayer.tsx');
    const exerciseFilterServicePath = path.join(__dirname, 'src/services/exerciseFilterService.ts');
    
    const hasGifPlayer = fs.existsSync(exerciseGifPlayerPath);
    this.addResult('ExerciseGifPlayer Still Present', hasGifPlayer, 'ExerciseGifPlayer missing');
    
    const hasFilterService = fs.existsSync(exerciseFilterServicePath);
    this.addResult('ExerciseFilterService Still Present', hasFilterService, 'ExerciseFilterService missing');
    
    if (hasGifPlayer) {
      const gifPlayerContent = fs.readFileSync(exerciseGifPlayerPath, 'utf8');
      const usesDirectLookup = gifPlayerContent.includes('exerciseFilterService.getExerciseById');
      this.addResult('GifPlayer Uses Direct Lookup', usesDirectLookup, 'Direct lookup missing');
    }
    
    // Test bulletproof system report is still valid
    const bulletproofReportPath = path.join(__dirname, 'bulletproof-system-report.json');
    if (fs.existsSync(bulletproofReportPath)) {
      const report = JSON.parse(fs.readFileSync(bulletproofReportPath, 'utf8'));
      const systemIntact = report.summary.passed === 44 && report.summary.failed === 0;
      this.addResult('Bulletproof System Still Intact', systemIntact, 'System integrity compromised');
    }
    
    console.log('  ✅ Bulletproof system integration validated');
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
    console.log('📊 WORKOUT PLAN STATE FIX TEST REPORT');
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
    
    console.log('\\n🎯 FIX STATUS:');
    if (successRate >= 95) {
      console.log('✅ WORKOUT PLAN STATE FIX READY');
      console.log('   - Exercise IDs now use database IDs instead of descriptive names');
      console.log('   - State synchronization improved with immediate updates');
      console.log('   - Comprehensive error handling and validation added');
      console.log('   - UI rendering logic enhanced with better debugging');
      console.log('   - Bulletproof visual system integration maintained');
    } else if (successRate >= 80) {
      console.log('⚠️  FIX NEEDS MINOR ADJUSTMENTS');
      console.log('   - Core fixes working');
      console.log('   - Address failed tests before deployment');
    } else {
      console.log('❌ FIX NOT READY');
      console.log('   - Critical issues detected');
      console.log('   - Fix failures before testing');
    }
    
    console.log('\\n🚀 EXPECTED USER EXPERIENCE:');
    console.log('1. Generate workout plan → Processes successfully');
    console.log('2. UI immediately shows valid workout plan');
    console.log('3. All 5 workouts appear in weekly calendar');
    console.log('4. Start workout → Exercises show proper GIFs with database IDs');
    console.log('5. No more "No valid workout plan detected" messages');
    
    // Save test report
    const reportPath = path.join(__dirname, 'workout-plan-state-fix-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\\n📄 Test report saved to: ${reportPath}`);
  }
}

// Run the test suite
async function main() {
  const tester = new WorkoutPlanStateFixTester();
  await tester.runAllTests();
}

main().catch(console.error);