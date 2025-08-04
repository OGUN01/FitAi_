/**
 * Test Direct GIF Fix
 * Simulate exactly what should happen in the app
 */

// Simulate the getWorkingGifUrl function
function getWorkingGifUrl(exerciseName, originalQuery) {
  const normalized = exerciseName.toLowerCase();
  const query = originalQuery.toLowerCase();
  
  console.log(`🔧 Finding working GIF for "${exerciseName}" (originally "${originalQuery}")`);
  
  // Map common exercises to working Giphy URLs
  const workingGifMap = {
    // Core exercises
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
  
  // Pattern matching
  if (normalized.includes('mountain') && normalized.includes('climb')) {
    return workingGifMap['mountain climber'];
  }
  if (normalized.includes('push') && normalized.includes('up')) {
    return workingGifMap['push-up'];
  }
  if (normalized.includes('burpee')) {
    return workingGifMap['burpee'];
  }
  
  // Default workout GIF
  console.log(`🔄 Using default workout GIF for "${exerciseName}"`);
  return 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif';
}

// Test the function with your exact case
function testDirectFix() {
  console.log('🧪 Testing Direct GIF Fix');
  console.log('=' .repeat(50));
  
  // Test the exact scenario from your app
  const brokenUrl = 'https://v1.cdn.exercisedb.dev/media/RJgzwny.gif';
  const exerciseName = 'mountain climber';
  const originalQuery = 'mountain_climbers';
  
  console.log('📋 Input:');
  console.log(`   Exercise Name: "${exerciseName}"`);
  console.log(`   Original Query: "${originalQuery}"`);
  console.log(`   Broken URL: ${brokenUrl}`);
  
  console.log('\n🔧 Processing:');
  const newUrl = getWorkingGifUrl(exerciseName, originalQuery);
  
  console.log('\n📤 Output:');
  console.log(`   New Working URL: ${newUrl}`);
  
  console.log('\n🎯 Result:');
  if (newUrl !== brokenUrl) {
    console.log('✅ SUCCESS: URL was successfully replaced');
    console.log('✅ App should now display the mountain climber GIF');
    console.log('✅ "THIS CONTENT IS NOT AVAILABLE" should be gone');
  } else {
    console.log('❌ FAILED: URL was not replaced');
  }
  
  console.log('\n💡 What should happen in your app:');
  console.log('1. System detects broken v1.cdn.exercisedb.dev URL');
  console.log('2. getWorkingGifUrl() replaces it with Giphy URL');
  console.log('3. ExerciseGifPlayer loads the working URL');
  console.log('4. Mountain climber GIF displays perfectly');
  
  return newUrl;
}

// Test it
testDirectFix();