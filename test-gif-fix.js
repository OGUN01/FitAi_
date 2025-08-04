/**
 * Test GIF URL Fix
 * Verify the working Giphy URLs are accessible
 */

async function testWorkingGifUrls() {
  console.log('🧪 Testing Working GIF URLs (Giphy)');
  console.log('=' .repeat(50));
  
  const workingUrls = [
    { name: 'Mountain Climber', url: 'https://media.giphy.com/media/3oEjI8Kq5HhZLCrqBW/giphy.gif' },
    { name: 'Push-up', url: 'https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif' },
    { name: 'Burpee', url: 'https://media.giphy.com/media/3oEjI0ZBtK8e6XG1qg/giphy.gif' },
    { name: 'Jumping Jacks', url: 'https://media.giphy.com/media/3oEduGGZhLKWtfHJYc/giphy.gif' },
    { name: 'Plank', url: 'https://media.giphy.com/media/ZAOJHWhgLdHEI/giphy.gif' },
    { name: 'Default Workout', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif' }
  ];
  
  let successCount = 0;
  let totalCount = workingUrls.length;
  
  for (const { name, url } of workingUrls) {
    try {
      console.log(`\n🔍 Testing ${name}...`);
      console.log(`   URL: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        
        console.log(`   ✅ Status: ${response.status} OK`);
        console.log(`   📄 Type: ${contentType}`);
        console.log(`   📊 Size: ${contentLength ? Math.round(parseInt(contentLength) / 1024) + 'KB' : 'Unknown'}`);
        successCount++;
      } else {
        console.log(`   ❌ Status: ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`   ⏱️  Timeout: Request took too long`);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n📊 RESULTS:');
  console.log('=' .repeat(50));
  console.log(`✅ Working URLs: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
  
  if (successCount === totalCount) {
    console.log('🎉 ALL GIF URLs ARE WORKING!');
    console.log('✅ The mountain climber GIF should now load properly');
    console.log('✅ Your bulletproof system has working fallback URLs');
  } else if (successCount >= totalCount * 0.8) {
    console.log('👍 Most GIF URLs are working');
    console.log('✅ System should work for most exercises');
  } else {
    console.log('⚠️  Some GIF URLs are not accessible');
    console.log('❌ Network issues or URL changes detected');
  }
  
  console.log('\n💡 SOLUTION:');
  console.log('The app will now automatically replace broken CDN URLs');
  console.log('with working Giphy URLs for common exercises like:');
  console.log('- mountain_climbers → Mountain Climber GIF');
  console.log('- push_ups → Push-up GIF');
  console.log('- burpees → Burpee GIF');
  console.log('- And many more...');
}

testWorkingGifUrls().catch(console.error);