/**
 * Debug GIF URLs from Exercise Database
 * Check what URLs are being returned for "mountain_climbers"
 */

const exerciseDatabase = require('./src/data/exerciseDatabase.json');

function debugGifUrls() {
  console.log('🔍 DEBUGGING GIF URLS');
  console.log('=' .repeat(50));
  
  // Find mountain climber exercise
  const mountainClimber = exerciseDatabase.exercises.find(ex => 
    ex.name.toLowerCase().includes('mountain climber')
  );
  
  if (mountainClimber) {
    console.log('✅ Found mountain climber exercise:');
    console.log(`   Name: ${mountainClimber.name}`);
    console.log(`   ID: ${mountainClimber.exerciseId}`);
    console.log(`   GIF URL: ${mountainClimber.gifUrl}`);
    console.log(`   URL Length: ${mountainClimber.gifUrl?.length || 0}`);
    
    // Test the URL format
    if (mountainClimber.gifUrl) {
      const url = mountainClimber.gifUrl;
      console.log('\n🧪 URL Analysis:');
      console.log(`   Protocol: ${url.startsWith('https://') ? '✅ HTTPS' : '❌ Invalid'}`);
      console.log(`   Domain: ${url.includes('d205bpvrqc9yn1.cloudfront.net') ? '✅ CDN' : url.split('/')[2] || 'Unknown'}`);
      console.log(`   Extension: ${url.endsWith('.gif') ? '✅ GIF' : '❌ Not GIF'}`);
      
      // Check if it's a proper exercisedb URL
      if (url.includes('d205bpvrqc9yn1.cloudfront.net')) {
        console.log('   ✅ Proper ExerciseDB CDN URL');
      } else {
        console.log('   ⚠️  Not standard ExerciseDB URL');
      }
    }
  } else {
    console.log('❌ Mountain climber not found in database');
  }
  
  // Check a few other exercises
  console.log('\n📊 Sample of other exercise GIF URLs:');
  const sampleExercises = exerciseDatabase.exercises.slice(0, 5);
  sampleExercises.forEach((ex, i) => {
    console.log(`${i + 1}. "${ex.name}"`);
    console.log(`   URL: ${ex.gifUrl?.substring(0, 80)}...`);
    console.log(`   Valid: ${ex.gifUrl && ex.gifUrl.startsWith('https://') ? '✅' : '❌'}`);
  });
  
  // Get total stats
  const totalExercises = exerciseDatabase.exercises.length;
  const exercisesWithGifs = exerciseDatabase.exercises.filter(ex => 
    ex.gifUrl && ex.gifUrl.trim() !== ''
  ).length;
  
  console.log(`\n📈 Overall GIF Coverage:`);
  console.log(`   Total exercises: ${totalExercises}`);
  console.log(`   With GIFs: ${exercisesWithGifs}`);
  console.log(`   Coverage: ${Math.round(exercisesWithGifs / totalExercises * 100)}%`);
}

debugGifUrls();