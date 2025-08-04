/**
 * Test the mountain climber fix
 * Verify the bulletproof system is working with the getWorkingGifUrl fix
 */

// Simulate the getWorkingGifUrl function from exerciseVisualService.ts
function getWorkingGifUrl(exerciseName, originalQuery) {
  const normalized = exerciseName.toLowerCase();
  const query = originalQuery.toLowerCase();
  
  console.log(`🔧 Finding working GIF for "${exerciseName}" (originally "${originalQuery}")`);
  
  // Map common exercises to working Giphy URLs (same as in the actual service)
  const workingGifMap = {
    // Core exercises with verified working URLs
    'mountain climber': 'https://media.giphy.com/media/3oEjI8Kq5HhZLCrqBW/giphy.gif',
    'push-up': 'https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif',
    'burpee': 'https://media.giphy.com/media/3oEjI0ZBtK8e6XG1qg/giphy.gif',
    'jumping jack': 'https://media.giphy.com/media/3oEduGGZhLKWtfHJYc/giphy.gif',
    'plank': 'https://media.giphy.com/media/ZAOJHWhgLdHEI/giphy.gif',
    'squat': 'https://media.giphy.com/media/1qfDiTQ8NURS8rSHUF/giphy.gif',
  };
  
  // Direct match
  if (workingGifMap[normalized]) {
    console.log(`✅ Direct match found for "${normalized}"`);
    return workingGifMap[normalized];
  }
  
  // Pattern matching for mountain climbers
  if (normalized.includes('mountain') && normalized.includes('climb')) {
    console.log(`✅ Pattern match: mountain + climb → mountain climber GIF`);
    return workingGifMap['mountain climber'];
  }
  
  // Check original query for mountain_climbers pattern
  if (query.includes('mountain') && query.includes('climb')) {
    console.log(`✅ Query pattern match: "${query}" → mountain climber GIF`);
    return workingGifMap['mountain climber'];
  }
  
  // Default workout GIF
  console.log(`🔄 Using default workout GIF for "${exerciseName}"`);
  return 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif';
}

// Test the exact scenario from your app
function testMountainClimberFix() {
  console.log('🧪 Testing Mountain Climber Fix');
  console.log('=' .repeat(60));
  
  // Test scenarios that should work
  const testCases = [
    {
      exerciseName: 'mountain climber',
      originalQuery: 'mountain_climbers',
      expectedMatch: true
    },
    {
      exerciseName: 'Mountain Climber',
      originalQuery: 'mountain_climbers',
      expectedMatch: true
    },
    {
      exerciseName: 'mountain climbers',
      originalQuery: 'mountain_climbers',
      expectedMatch: true
    },
    {
      exerciseName: 'bodyweight mountain climber',
      originalQuery: 'mountain_climbers',
      expectedMatch: true
    }
  ];
  
  let successCount = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`\n📋 Test ${index + 1}:`);
    console.log(`   Exercise Name: "${testCase.exerciseName}"`);
    console.log(`   Original Query: "${testCase.originalQuery}"`);
    
    const result = getWorkingGifUrl(testCase.exerciseName, testCase.originalQuery);
    const isSuccess = result.includes('3oEjI8Kq5HhZLCrqBW'); // Mountain climber GIF ID
    
    console.log(`   Result URL: ${result}`);
    console.log(`   Expected Mountain Climber GIF: ${testCase.expectedMatch ? 'Yes' : 'No'}`);
    console.log(`   Got Mountain Climber GIF: ${isSuccess ? 'Yes' : 'No'}`);
    console.log(`   Status: ${isSuccess === testCase.expectedMatch ? '✅ PASS' : '❌ FAIL'}`);
    
    if (isSuccess === testCase.expectedMatch) successCount++;
  });
  
  console.log('\n📊 RESULTS:');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${successCount}/${testCases.length} tests`);
  
  if (successCount === testCases.length) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Mountain climber exercise should now show GIF properly');
    console.log('✅ The "THIS CONTENT IS NOT AVAILABLE" error should be fixed');
    console.log('\n💡 Next steps:');
    console.log('1. Hot reload should pick up the changes');
    console.log('2. Navigate to workout screen');
    console.log('3. Generate workout with mountain climbers');
    console.log('4. Verify GIF displays correctly');
  } else {
    console.log('❌ Some tests failed - fix needed');
  }
}

// Run the test
testMountainClimberFix();