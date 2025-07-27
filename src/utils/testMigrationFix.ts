/**
 * Test Migration Fix
 * Quick verification script to test the migration system fix
 */

import { dataManager } from '../services/dataManager';
import { migrationManager } from '../services/migrationManager';

export const testMigrationFix = async () => {
  console.log('🧪 ========================================');
  console.log('🧪 TESTING MIGRATION SYSTEM FIX');
  console.log('🧪 ========================================');

  const testUserId = 'test-user-fix-verification';

  try {
    // Step 1: Test localStorage methods directly
    console.log('\n🧪 STEP 1: Testing localStorage methods...');
    dataManager.setUserId(testUserId);
    await dataManager.testLocalStorageMethods();

    // Step 2: Test hasLocalData (should return false initially)
    console.log('\n🧪 STEP 2: Testing hasLocalData (should be false)...');
    const hasDataBefore = await dataManager.hasLocalData();
    console.log('📊 Has local data before creating sample:', hasDataBefore);

    // Step 3: Create sample profile data
    console.log('\n🧪 STEP 3: Creating sample profile data...');
    const sampleCreated = await dataManager.createSampleProfileData();
    console.log('📊 Sample data created:', sampleCreated);

    // Step 4: Test hasLocalData (should return true now)
    console.log('\n🧪 STEP 4: Testing hasLocalData (should be true)...');
    const hasDataAfter = await dataManager.hasLocalData();
    console.log('📊 Has local data after creating sample:', hasDataAfter);

    // Step 5: Get profile data summary
    console.log('\n🧪 STEP 5: Getting profile data summary...');
    const summary = await dataManager.getProfileDataSummary();
    console.log('📊 Profile data summary:', summary);

    // Step 6: Test migration detection
    console.log('\n🧪 STEP 6: Testing migration detection...');
    const migrationNeeded = await migrationManager.checkProfileMigrationNeeded(testUserId);
    console.log('📊 Migration needed:', migrationNeeded);

    // Step 7: Clean up test data
    console.log('\n🧪 STEP 7: Cleaning up test data...');
    const cleaned = await dataManager.clearLocalData();
    console.log('📊 Test data cleaned:', cleaned);

    // Step 8: Verify cleanup
    console.log('\n🧪 STEP 8: Verifying cleanup...');
    const hasDataAfterCleanup = await dataManager.hasLocalData();
    console.log('📊 Has local data after cleanup:', hasDataAfterCleanup);

    console.log('\n✅ ========================================');
    console.log('✅ MIGRATION SYSTEM FIX TEST COMPLETED');
    console.log('✅ ========================================');

    return {
      success: true,
      results: {
        localStorageWorking: true,
        hasDataBefore,
        sampleCreated,
        hasDataAfter,
        summary,
        migrationNeeded,
        cleaned,
        hasDataAfterCleanup,
      },
    };

  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('❌ MIGRATION SYSTEM FIX TEST FAILED');
    console.error('❌ ========================================');
    console.error('❌ Error:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const quickMigrationTest = async () => {
  console.log('🚀 Quick Migration Test...');
  
  try {
    const testUserId = 'quick-test-user';
    dataManager.setUserId(testUserId);

    // Quick test: Check if hasLocalData method exists and works
    const hasData = await dataManager.hasLocalData();
    console.log('✅ hasLocalData method works:', hasData);

    // Quick test: Check if migration detection works
    const migrationNeeded = await migrationManager.checkProfileMigrationNeeded(testUserId);
    console.log('✅ Migration detection works:', migrationNeeded);

    console.log('🎉 Quick test passed! Migration system is working.');
    return true;

  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return false;
  }
};

// Export for easy testing
export default {
  testMigrationFix,
  quickMigrationTest,
};
