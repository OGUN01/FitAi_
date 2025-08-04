/**
 * Test Vercel API Endpoints
 * Tests different endpoint formats to find working API structure
 */

const BASE_URL = 'https://exercisedata.vercel.app';

// Test different endpoint patterns
const testEndpoints = [
  // Basic endpoints
  `${BASE_URL}/api/v1/exercises`,
  `${BASE_URL}/api/exercises`,
  `${BASE_URL}/exercises`,
  
  // With pagination
  `${BASE_URL}/api/v1/exercises?page=1&limit=5`,
  `${BASE_URL}/api/v1/exercises?offset=0&limit=5`,
  
  // Search endpoints
  `${BASE_URL}/api/v1/exercises?name=push-up`,
  `${BASE_URL}/api/v1/exercises/search?q=push-up`,
  `${BASE_URL}/api/v1/exercises/name/push-up`,
  
  // Alternative structures
  `${BASE_URL}/api/v1/exercise`,
  `${BASE_URL}/v1/exercises`,
  
  // Root endpoint for API info
  `${BASE_URL}/api/v1`,
  `${BASE_URL}/api`,
  `${BASE_URL}/`
];

async function testEndpoint(url) {
  try {
    console.log(`\n🔍 Testing: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const text = await response.text();
      
      // Try to parse as JSON
      try {
        const data = JSON.parse(text);
        console.log(`   ✅ SUCCESS - JSON Response:`);
        
        // Show structure
        if (Array.isArray(data)) {
          console.log(`      Type: Array with ${data.length} items`);
          if (data.length > 0) {
            console.log(`      First item keys:`, Object.keys(data[0]));
            if (data[0].gifUrl || data[0].images) {
              console.log(`      ✅ GIF URLs found!`);
            }
          }
        } else if (typeof data === 'object') {
          console.log(`      Type: Object`);
          console.log(`      Keys:`, Object.keys(data));
          
          // Check for common API response patterns
          if (data.data) {
            console.log(`      Has 'data' property with ${Array.isArray(data.data) ? data.data.length + ' items' : typeof data.data}`);
            if (Array.isArray(data.data) && data.data.length > 0) {
              console.log(`      First data item keys:`, Object.keys(data.data[0]));
              if (data.data[0].gifUrl || data.data[0].images) {
                console.log(`      ✅ GIF URLs found in data!`);
              }
            }
          }
          
          if (data.exercises) {
            console.log(`      Has 'exercises' property with ${Array.isArray(data.exercises) ? data.exercises.length + ' items' : typeof data.exercises}`);
          }
          
          if (data.success !== undefined) {
            console.log(`      Success field: ${data.success}`);
          }
        }
        
        // Show sample data (first few characters)
        const sampleText = text.substring(0, 200) + (text.length > 200 ? '...' : '');
        console.log(`      Sample: ${sampleText}`);
        
        return { success: true, data, url, status: response.status };
        
      } catch (parseError) {
        console.log(`   ⚠️  Non-JSON Response (${text.length} chars):`);
        console.log(`      Sample: ${text.substring(0, 100)}...`);
        return { success: false, error: 'Non-JSON response', url, status: response.status };
      }
    } else {
      const errorText = await response.text();
      console.log(`   ❌ ERROR: ${errorText.substring(0, 100)}...`);
      return { success: false, error: `HTTP ${response.status}`, url, status: response.status };
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`   ⏱️  TIMEOUT after 3 seconds`);
      return { success: false, error: 'Timeout', url };
    } else {
      console.log(`   ❌ FETCH ERROR: ${error.message}`);
      return { success: false, error: error.message, url };
    }
  }
}

async function runAllTests() {
  console.log('🚀 Testing Vercel ExerciseDB API Endpoints');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const endpoint of testEndpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 SUMMARY RESULTS');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful endpoints: ${successful.length}`);
  successful.forEach(r => {
    console.log(`   ${r.url} (${r.status})`);
  });
  
  console.log(`\n❌ Failed endpoints: ${failed.length}`);
  failed.forEach(r => {
    console.log(`   ${r.url} - ${r.error}`);
  });
  
  if (successful.length > 0) {
    console.log('\n🎯 RECOMMENDED ENDPOINTS:');
    successful.forEach((r, i) => {
      console.log(`${i + 1}. ${r.url}`);
    });
    
    console.log('\n💡 Next steps:');
    console.log('1. Update exerciseVisualService.ts to use working endpoints');
    console.log('2. Verify GIF URLs are included in response data');
    console.log('3. Test with specific exercise searches');
  } else {
    console.log('\n⚠️  NO WORKING ENDPOINTS FOUND');
    console.log('The Vercel API might be:');
    console.log('- Using different URL structure');
    console.log('- Requiring authentication');
    console.log('- Having deployment issues');
    console.log('- Using different HTTP methods (POST, etc.)');
  }
}

// Run the tests
runAllTests().catch(console.error);