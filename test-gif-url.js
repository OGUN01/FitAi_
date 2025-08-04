/**
 * Test GIF URL Accessibility
 * Verify if the mountain climber GIF URL is accessible
 */

async function testGifUrl() {
  const gifUrl = 'https://v1.cdn.exercisedb.dev/media/RJgzwny.gif';
  
  console.log('🧪 Testing GIF URL Accessibility');
  console.log('=' .repeat(50));
  console.log(`URL: ${gifUrl}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    console.log('📡 Making request...');
    const response = await fetch(gifUrl, {
      method: 'HEAD', // Just check if accessible
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📊 Content-Type: ${response.headers.get('content-type')}`);
    console.log(`📊 Content-Length: ${response.headers.get('content-length')} bytes`);
    
    if (response.ok) {
      console.log('✅ GIF URL is accessible!');
      console.log('✅ The URL should work in React Native');
      
      // Check CORS headers
      const corsOrigin = response.headers.get('access-control-allow-origin');
      const corsCredentials = response.headers.get('access-control-allow-credentials');
      
      console.log(`🌐 CORS Analysis:`);
      console.log(`   Access-Control-Allow-Origin: ${corsOrigin || 'Not set'}`);
      console.log(`   Access-Control-Allow-Credentials: ${corsCredentials || 'Not set'}`);
      
      if (corsOrigin === '*' || corsOrigin === null) {
        console.log('✅ CORS should not be an issue');
      }
      
    } else {
      console.log('❌ GIF URL is not accessible');
      console.log('This could be the reason for the loading failure');
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('⏱️  Request timed out after 5 seconds');
    } else {
      console.log(`❌ Network error: ${error.message}`);
    }
    
    console.log('\n🔧 Possible Solutions:');
    console.log('1. The CDN might be temporarily down');
    console.log('2. Network connectivity issues');
    console.log('3. The URL format might have changed');
  }
  
  // Test a few more URLs
  console.log('\n🧪 Testing additional GIF URLs...');
  const testUrls = [
    'https://v1.cdn.exercisedb.dev/media/VPPtusI.gif', // inverted row
    'https://v1.cdn.exercisedb.dev/media/8d8qJQI.gif', // barbell row
    'https://d205bpvrqc9yn1.cloudfront.net/0009.gif'  // Alternative CDN test
  ];
  
  for (const url of testUrls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      console.log(`   ${response.ok ? '✅' : '❌'} ${url.split('/').pop()}: ${response.status}`);
    } catch (error) {
      console.log(`   ❌ ${url.split('/').pop()}: ${error.message}`);
    }
  }
}

testGifUrl().catch(console.error);