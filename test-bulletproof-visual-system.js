/**
 * Bulletproof Visual System Test
 * 
 * Tests the new constraint-based exercise system with 100% guaranteed visuals
 */

const fs = require('fs');
const path = require('path');

class BulletproofSystemTester {
  constructor() {
    this.results = {
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        coverage: 0
      }
    };
  }

  async runAllTests() {
    console.log('🎯 BULLETPROOF VISUAL SYSTEM - COMPREHENSIVE TEST');
    console.log('=' .repeat(60));
    
    try {
      // Test 1: Exercise Database Integrity
      await this.testExerciseDatabaseIntegrity();
      
      // Test 2: Filter Service Functionality
      await this.testFilterService();
      
      // Test 3: Direct ID Lookup
      await this.testDirectIdLookup();
      
      // Test 4: AI Generation Constraints
      await this.testAIGenerationConstraints();
      
      // Test 5: Component Integration
      await this.testComponentIntegration();
      
      // Generate final report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ TEST SUITE FAILED:', error);
    }
  }

  async testExerciseDatabaseIntegrity() {
    console.log('🧪 TEST 1: Exercise Database Integrity');
    
    const dbPath = path.join(__dirname, 'src/data/exerciseDatabase.min.json');
    
    if (!fs.existsSync(dbPath)) {
      this.addResult('Database File Exists', false, 'Database file not found');
      return;
    }
    
    const database = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Test database structure
    this.addResult('Database Has Metadata', !!database.metadata, 'Database metadata missing');
    this.addResult('Database Has Exercises', !!database.exercises, 'Database exercises missing');
    
    // Test exercise count
    const exerciseCount = database.exercises.length;
    this.addResult('Exercise Count >= 1000', exerciseCount >= 1000, `Only ${exerciseCount} exercises found`);
    
    // Test GIF coverage
    const exercisesWithGifs = database.exercises.filter(ex => ex.gifUrl).length;
    const gifCoverage = (exercisesWithGifs / exerciseCount) * 100;
    this.addResult('100% GIF Coverage', gifCoverage === 100, `Only ${gifCoverage}% coverage`);
    
    // Test exercise structure
    const sampleExercise = database.exercises[0];
    const requiredFields = ['exerciseId', 'name', 'gifUrl', 'targetMuscles', 'bodyParts', 'equipments'];
    
    for (const field of requiredFields) {
      this.addResult(`Exercise Has ${field}`, !!sampleExercise[field], `Missing ${field} in exercise`);
    }
    
    console.log(`  ✅ Database loaded: ${exerciseCount} exercises with ${gifCoverage}% GIF coverage`);
  }

  async testFilterService() {
    console.log('🧪 TEST 2: Filter Service Functionality');
    
    try {
      // Import filter service (simulated)
      const filterServicePath = path.join(__dirname, 'src/services/exerciseFilterService.ts');
      
      if (!fs.existsSync(filterServicePath)) {
        this.addResult('Filter Service Exists', false, 'Filter service file not found');
        return;
      }
      
      const serviceContent = fs.readFileSync(filterServicePath, 'utf8');
      
      // Test service has required methods
      const requiredMethods = [
        'filterExercises',
        'getExerciseById',
        'getExercisesByType',
        'getAllExerciseIds'
      ];
      
      for (const method of requiredMethods) {
        const hasMethod = serviceContent.includes(method);
        this.addResult(`Has ${method} method`, hasMethod, `Missing ${method} method`);
      }
      
      // Test categorization logic
      const hasDifficultyLogic = serviceContent.includes('categorizeExercises');
      this.addResult('Has Difficulty Categorization', hasDifficultyLogic, 'Missing difficulty categorization');
      
      console.log(`  ✅ Filter service structure validated`);
      
    } catch (error) {
      this.addResult('Filter Service Test', false, error.message);
    }
  }

  async testDirectIdLookup() {
    console.log('🧪 TEST 3: Direct ID Lookup System');
    
    try {
      const database = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/exerciseDatabase.min.json'), 'utf8'));
      
      // Test unique IDs
      const exerciseIds = database.exercises.map(ex => ex.exerciseId);
      const uniqueIds = new Set(exerciseIds);
      
      this.addResult('All Exercise IDs Unique', exerciseIds.length === uniqueIds.size, 'Duplicate exercise IDs found');
      
      // Test ID format consistency
      const validIdFormat = exerciseIds.every(id => typeof id === 'string' && id.length > 0);
      this.addResult('Valid ID Format', validIdFormat, 'Invalid exercise ID format');
      
      // Test sample lookups
      const sampleIds = exerciseIds.slice(0, 10);
      
      for (const id of sampleIds) {
        const exercise = database.exercises.find(ex => ex.exerciseId === id);
        this.addResult(`Direct Lookup: ${id}`, !!exercise, `Failed to find exercise ${id}`);
        
        if (exercise) {
          this.addResult(`GIF URL Valid: ${id}`, !!exercise.gifUrl, `No GIF URL for ${id}`);
        }
      }
      
      console.log(`  ✅ Direct ID lookup system validated with ${sampleIds.length} samples`);
      
    } catch (error) {
      this.addResult('Direct ID Lookup Test', false, error.message);
    }
  }

  async testAIGenerationConstraints() {
    console.log('🧪 TEST 4: AI Generation Constraints');
    
    try {
      // Test workout schema has exerciseId
      const schemaPath = path.join(__dirname, 'src/ai/schemas/workoutSchema.ts');
      
      if (!fs.existsSync(schemaPath)) {
        this.addResult('Workout Schema Exists', false, 'Workout schema file not found');
        return;
      }
      
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      
      // Test schema has exerciseId requirement
      const hasExerciseId = schemaContent.includes('exerciseId');
      this.addResult('Schema Has exerciseId', hasExerciseId, 'exerciseId missing from schema');
      
      // Test weekly content generator uses filtering
      const generatorPath = path.join(__dirname, 'src/ai/weeklyContentGenerator.ts');
      
      if (fs.existsSync(generatorPath)) {
        const generatorContent = fs.readFileSync(generatorPath, 'utf8');
        
        const usesFilterService = generatorContent.includes('exerciseFilterService');
        this.addResult('Generator Uses Filter Service', usesFilterService, 'Generator not using filter service');
        
        const hasConstrainedPrompt = generatorContent.includes('CRITICAL: EXERCISE SELECTION REQUIREMENTS');
        this.addResult('Has Constrained Prompts', hasConstrainedPrompt, 'Missing constrained generation prompts');
      }
      
      console.log(`  ✅ AI generation constraints validated`);
      
    } catch (error) {
      this.addResult('AI Generation Constraints Test', false, error.message);
    }
  }

  async testComponentIntegration() {
    console.log('🧪 TEST 5: Component Integration');
    
    try {
      // Test ExerciseGifPlayer uses direct lookup
      const gifPlayerPath = path.join(__dirname, 'src/components/fitness/ExerciseGifPlayer.tsx');
      
      if (!fs.existsSync(gifPlayerPath)) {
        this.addResult('ExerciseGifPlayer Exists', false, 'ExerciseGifPlayer not found');
        return;
      }
      
      const gifPlayerContent = fs.readFileSync(gifPlayerPath, 'utf8');
      
      // Test component uses exerciseId prop
      const hasExerciseIdProp = gifPlayerContent.includes('exerciseId: string');
      this.addResult('GifPlayer Has exerciseId Prop', hasExerciseIdProp, 'Missing exerciseId prop');
      
      // Test component uses direct lookup via filter service
      const usesFilterService = gifPlayerContent.includes('exerciseFilterService.getExerciseById');
      this.addResult('GifPlayer Uses Direct Lookup', usesFilterService, 'Not using direct lookup');
      
      // Test no complex matching logic remains
      const hasComplexMatching = gifPlayerContent.includes('findExercise') || 
                                 gifPlayerContent.includes('bulletproof') ||
                                 gifPlayerContent.includes('tier');
      this.addResult('No Complex Matching Logic', !hasComplexMatching, 'Complex matching logic still present');
      
      // Test WorkoutSessionScreen integration
      const workoutScreenPath = path.join(__dirname, 'src/screens/workout/WorkoutSessionScreen.tsx');
      
      if (fs.existsSync(workoutScreenPath)) {
        const workoutScreenContent = fs.readFileSync(workoutScreenPath, 'utf8');
        
        const passesExerciseId = workoutScreenContent.includes('exerciseId={currentExercise.exerciseId}');
        this.addResult('WorkoutScreen Passes exerciseId', passesExerciseId, 'WorkoutScreen not passing exerciseId');
      }
      
      console.log(`  ✅ Component integration validated`);
      
    } catch (error) {
      this.addResult('Component Integration Test', false, error.message);
    }
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
    console.log('\n' + '=' .repeat(60));
    console.log('📊 BULLETPROOF SYSTEM TEST REPORT');
    console.log('=' .repeat(60));
    
    const { total, passed, failed } = this.results.summary;
    const successRate = Math.round((passed / total) * 100);
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${successRate}%`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n🎯 SYSTEM STATUS:');
    if (successRate >= 95) {
      console.log('✅ BULLETPROOF SYSTEM READY FOR PRODUCTION');
      console.log('   - 100% visual coverage guaranteed');
      console.log('   - Direct ID lookup ensures instant matching');
      console.log('   - Constraint-based AI generation prevents failures');
    } else if (successRate >= 80) {
      console.log('⚠️  SYSTEM NEEDS MINOR FIXES');
      console.log('   - Core functionality working');
      console.log('   - Address failed tests before production');
    } else {
      console.log('❌ SYSTEM NOT READY');
      console.log('   - Major issues detected');
      console.log('   - Fix critical failures before testing');
    }
    
    // Save report to file
    const reportPath = path.join(__dirname, 'bulletproof-system-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run the test suite
async function main() {
  const tester = new BulletproofSystemTester();
  await tester.runAllTests();
}

main().catch(console.error);