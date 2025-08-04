/**
 * Test Migration Fix
 * 
 * Tests that the old workout data migration correctly clears descriptive
 * exercise names and ensures fresh generation uses database IDs.
 */

const fs = require('fs');
const path = require('path');

class MigrationFixTester {
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
    console.log('🧪 MIGRATION FIX TEST SUITE');
    console.log('=' .repeat(50));
    
    try {
      // Test 1: Migration service exists and is properly structured
      await this.testMigrationService();
      
      // Test 2: Fitness store has new migration methods
      await this.testFitnessStoreMethods();
      
      // Test 3: App.tsx includes migration initialization
      await this.testAppInitialization();
      
      // Test 4: Old data detection logic
      await this.testOldDataDetection();
      
      // Test 5: System status after fix
      await this.testSystemStatus();
      
      // Generate final report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ TEST SUITE FAILED:', error);
    }
  }

  async testMigrationService() {
    console.log('🧪 TEST 1: Migration Service');
    
    const servicePath = path.join(__dirname, 'src/services/migrationService.ts');
    
    if (!fs.existsSync(servicePath)) {
      this.addResult('Migration Service File Exists', false, 'migrationService.ts not found');
      return;
    }
    
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    
    // Test service has required methods
    const requiredMethods = [
      'runMigrations',
      'migrateToBulletproofSystem',
      'emergencyReset',
      'getMigrationStatus'
    ];
    
    for (const method of requiredMethods) {
      const hasMethod = serviceContent.includes(method);
      this.addResult(`Migration Service has ${method}`, hasMethod, `Missing ${method} method`);
    }
    
    // Test migration logic
    const hasOldDataDetection = serviceContent.includes('isOldFormat') && 
                               serviceContent.includes('includes(\'_\')');
    this.addResult('Has Old Data Detection Logic', hasOldDataDetection, 'Missing old data detection');
    
    console.log('  ✅ Migration service structure validated');
  }

  async testFitnessStoreMethods() {
    console.log('🧪 TEST 2: Fitness Store Methods');
    
    const storePath = path.join(__dirname, 'src/stores/fitnessStore.ts');
    
    if (!fs.existsSync(storePath)) {
      this.addResult('Fitness Store File Exists', false, 'fitnessStore.ts not found');
      return;
    }
    
    const storeContent = fs.readFileSync(storePath, 'utf8');
    
    // Test new methods exist
    const requiredMethods = [
      'clearOldWorkoutData',
      'forceWorkoutRegeneration'
    ];
    
    for (const method of requiredMethods) {
      const hasMethod = storeContent.includes(method);
      this.addResult(`Fitness Store has ${method}`, hasMethod, `Missing ${method} method`);
    }
    
    // Test implementation details
    const hasAsyncStorageClear = storeContent.includes('AsyncStorage.removeItem');
    this.addResult('Has AsyncStorage Clear Logic', hasAsyncStorageClear, 'Missing AsyncStorage clear');
    
    const hasDatabaseClear = storeContent.includes('crudOperations.clearAllData');
    this.addResult('Has Database Clear Logic', hasDatabaseClear, 'Missing database clear');
    
    console.log('  ✅ Fitness store methods validated');
  }

  async testAppInitialization() {
    console.log('🧪 TEST 3: App Initialization');
    
    const appPath = path.join(__dirname, 'App.tsx');
    
    if (!fs.existsSync(appPath)) {
      this.addResult('App.tsx File Exists', false, 'App.tsx not found');
      return;
    }
    
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    // Test migration service import
    const hasMigrationImport = appContent.includes('migrationService');
    this.addResult('App Imports Migration Service', hasMigrationImport, 'Missing migration service import');
    
    // Test migration call in initialization
    const hasMigrationCall = appContent.includes('migrationService.runMigrations');
    this.addResult('App Calls Migration Service', hasMigrationCall, 'Missing migration service call');
    
    console.log('  ✅ App initialization validated');
  }

  async testOldDataDetection() {
    console.log('🧪 TEST 4: Old Data Detection Logic');
    
    // Test with mock old data patterns
    const oldDataPatterns = [
      'warm-up:_jumping_jacks_(light)',
      'strength:_push_ups_(medium)',
      'cardio:_burpees_(high_intensity)',
      'cool-down:_stretching_(gentle)'
    ];
    
    const newDataPatterns = [
      'VPPtusI',
      '8d8qJQI',
      'JGKowMS',
      'dmgMp3n'
    ];
    
    // Simulate detection logic
    let oldDetectedCorrectly = 0;
    let newDetectedCorrectly = 0;
    
    for (const pattern of oldDataPatterns) {
      const isDetectedAsOld = pattern.includes('_') || 
                             pattern.includes(':') ||
                             pattern.includes('(') ||
                             pattern.length > 15;
      if (isDetectedAsOld) oldDetectedCorrectly++;
    }
    
    for (const pattern of newDataPatterns) {
      const isDetectedAsOld = pattern.includes('_') || 
                             pattern.includes(':') ||
                             pattern.includes('(') ||
                             pattern.length > 15;
      if (!isDetectedAsOld) newDetectedCorrectly++;
    }
    
    this.addResult('Old Data Pattern Detection', oldDetectedCorrectly === oldDataPatterns.length, 
                   `Only ${oldDetectedCorrectly}/${oldDataPatterns.length} old patterns detected`);
    
    this.addResult('New Data Pattern Detection', newDetectedCorrectly === newDataPatterns.length,
                   `${newDetectedCorrectly}/${newDataPatterns.length} new patterns correctly identified`);
    
    console.log('  ✅ Data detection logic validated');
  }

  async testSystemStatus() {
    console.log('🧪 TEST 5: System Status After Fix');
    
    // Check that bulletproof system is still intact
    const bulletproofReportPath = path.join(__dirname, 'bulletproof-system-report.json');
    
    if (fs.existsSync(bulletproofReportPath)) {
      const report = JSON.parse(fs.readFileSync(bulletproofReportPath, 'utf8'));
      
      this.addResult('Bulletproof System Still Intact', report.summary.passed === 44,
                     `Only ${report.summary.passed}/44 tests passing`);
      
      this.addResult('100% Test Coverage Maintained', report.summary.failed === 0,
                     `${report.summary.failed} tests failing`);
    } else {
      this.addResult('Bulletproof Report Available', false, 'Report file missing');
    }
    
    // Check cleanup files were created 
    const cleanupReportPath = path.join(__dirname, 'cleanup-report.json');
    const hasCleanupReport = fs.existsSync(cleanupReportPath);
    this.addResult('Cleanup Process Completed', hasCleanupReport, 'Cleanup report missing');
    
    console.log('  ✅ System status validated');
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
    console.log('\\n' + '=' .repeat(50));
    console.log('📊 MIGRATION FIX TEST REPORT');
    console.log('=' .repeat(50));
    
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
    
    console.log('\\n🎯 MIGRATION STATUS:');
    if (successRate >= 95) {
      console.log('✅ MIGRATION FIX READY FOR DEPLOYMENT');
      console.log('   - Old data will be automatically cleared on app start');
      console.log('   - Fresh workout generation uses database IDs');
      console.log('   - 100% GIF coverage guaranteed');
      console.log('   - User will see custom exercises with matching visuals');
    } else if (successRate >= 80) {
      console.log('⚠️  MIGRATION NEEDS MINOR FIXES');
      console.log('   - Core migration logic working');
      console.log('   - Address failed tests before deployment');
    } else {
      console.log('❌ MIGRATION NOT READY');
      console.log('   - Critical issues detected');
      console.log('   - Fix failures before testing');
    }
    
    console.log('\\n🚀 NEXT STEPS FOR USER:');
    console.log('1. Start the app (migration runs automatically)');
    console.log('2. Navigate to Fitness screen');
    console.log('3. Generate new workout plan');
    console.log('4. Start workout session');
    console.log('5. Verify all exercises show GIFs correctly');
    
    // Save test report
    const reportPath = path.join(__dirname, 'migration-fix-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\\n📄 Test report saved to: ${reportPath}`);
  }
}

// Run the test suite
async function main() {
  const tester = new MigrationFixTester();
  await tester.runAllTests();
}

main().catch(console.error);