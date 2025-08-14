#!/usr/bin/env node

/**
 * YouTube API Test Script - 100% Validation Before Main App Integration
 * 
 * This script tests the YouTube Data API v3 integration completely
 * before integrating into the React Native app.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

// Load environment variables
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        process.env[key] = value;
      }
    });
    
    console.log(`${colors.green}✅ Environment variables loaded${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Error loading .env file:${colors.reset}`, error.message);
    return false;
  }
}

// Mock meal data matching the actual app
const mockMeals = [
  {
    name: "Green Power Protein Smoothie",
    type: "breakfast",
    cuisine: "American",
    difficulty: "easy"
  },
  {
    name: "Mediterranean Quinoa Salad", 
    type: "lunch",
    cuisine: "Mediterranean",
    difficulty: "medium"
  },
  {
    name: "Spicy Paneer Bhurji with Roti",
    type: "dinner", 
    cuisine: "Indian",
    difficulty: "medium"
  },
  {
    name: "Chicken Teriyaki Bowl",
    type: "dinner",
    cuisine: "Japanese", 
    difficulty: "medium"
  },
  {
    name: "Avocado Toast with Poached Egg",
    type: "breakfast",
    cuisine: "American",
    difficulty: "easy"
  },
  {
    name: "Thai Green Curry with Jasmine Rice",
    type: "dinner",
    cuisine: "Thai",
    difficulty: "hard"
  }
];

// Test statistics
const testStats = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  apiCalls: 0,
  totalResponseTime: 0,
  errors: []
};

// Utility function for HTTP requests
function makeHttpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const req = https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        testStats.totalResponseTime += responseTime;
        testStats.apiCalls++;
        
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData,
            responseTime: responseTime,
            headers: res.headers
          });
        } catch (parseError) {
          reject(new Error(`JSON parse error: ${parseError.message}. Response: ${data.substring(0, 200)}...`));
        }
      });
    });
    
    req.on('error', (error) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      testStats.totalResponseTime += responseTime;
      testStats.apiCalls++;
      reject(error);
    });
    
    // Set timeout
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Generate search queries for a meal
function generateSearchQueries(mealName) {
  const cleanMealName = mealName.toLowerCase().trim();
  return [
    `${cleanMealName} recipe cooking tutorial`,
    `how to cook ${cleanMealName}`,
    `${cleanMealName} recipe step by step`,
    `${cleanMealName} cooking guide`,
    `making ${cleanMealName} recipe`
  ];
}

// Parse YouTube duration format (PT4M13S -> 253 seconds)
function parseYouTubeDuration(duration) {
  if (!duration) return 0;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Calculate video score (matching app logic)
function calculateVideoScore(video, query, cookingKeywords) {
  let score = 0;
  const title = (video.snippet?.title || '').toLowerCase();
  const channelTitle = (video.snippet?.channelTitle || '').toLowerCase();
  const queryWords = query.toLowerCase().split(' ');

  // Title relevance (40 points max)
  queryWords.forEach(word => {
    if (title.includes(word)) score += 8;
  });

  // Cooking keywords bonus (30 points max)
  cookingKeywords.forEach(keyword => {
    if (title.includes(keyword)) score += 5;
  });

  // View count factor (25 points max)
  const viewCount = parseInt(video.statistics?.viewCount || '0');
  if (viewCount > 1000000) score += 25;
  else if (viewCount > 500000) score += 20;
  else if (viewCount > 100000) score += 15;
  else if (viewCount > 10000) score += 10;
  else if (viewCount > 1000) score += 5;

  // Duration preference (15 points max)
  const duration = parseYouTubeDuration(video.contentDetails?.duration);
  if (duration >= 300 && duration <= 1200) score += 15; // 5-20 minutes is ideal
  else if (duration >= 180 && duration <= 1800) score += 10; // 3-30 minutes is good

  // Channel reputation bonus (20 points max)
  const popularCookingChannels = [
    'tasty', 'gordon ramsay', 'babish', 'bon appétit', 'food network',
    'joshua weissman', 'chef john', 'food wishes', 'allrecipes',
    'sorted food', 'america\'s test kitchen', 'serious eats'
  ];
  
  if (popularCookingChannels.some(channel => channelTitle.includes(channel))) {
    score += 20;
  }

  return score;
}

// Select best cooking video
function selectBestVideo(videos, query) {
  const cookingKeywords = [
    'recipe', 'cooking', 'how to cook', 'tutorial', 'make', 'making',
    'step by step', 'easy', 'homemade', 'chef', 'kitchen'
  ];

  // Filter and score videos
  const scoredVideos = videos
    .filter(video => {
      if (!video.snippet?.title || !video.id) return false;
      
      // Duration filter (3 minutes to 45 minutes)
      const duration = parseYouTubeDuration(video.contentDetails?.duration);
      if (duration < 180 || duration > 2700) return false;
      
      // Check if title contains cooking-related keywords
      const title = video.snippet.title.toLowerCase();
      return cookingKeywords.some(keyword => title.includes(keyword));
    })
    .map(video => ({
      video,
      score: calculateVideoScore(video, query, cookingKeywords)
    }))
    .sort((a, b) => b.score - a.score);

  if (scoredVideos.length === 0) return null;

  const bestVideo = scoredVideos[0].video;
  
  return {
    id: bestVideo.id,
    title: bestVideo.snippet.title,
    author: bestVideo.snippet.channelTitle || 'Unknown',
    lengthSeconds: parseYouTubeDuration(bestVideo.contentDetails?.duration),
    viewCount: parseInt(bestVideo.statistics?.viewCount || '0'),
    publishedText: bestVideo.snippet.publishedAt || '',
    thumbnails: bestVideo.snippet.thumbnails ? [{
      url: bestVideo.snippet.thumbnails.medium?.url || bestVideo.snippet.thumbnails.default?.url || '',
      width: bestVideo.snippet.thumbnails.medium?.width || 320,
      height: bestVideo.snippet.thumbnails.medium?.height || 180
    }] : [],
    description: bestVideo.snippet.description || '',
    score: scoredVideos[0].score
  };
}

// Test YouTube API search for a meal
async function testYouTubeSearch(meal, apiKey) {
  console.log(`\n${colors.cyan}🔍 Testing: ${meal.name}${colors.reset}`);
  
  const queries = generateSearchQueries(meal.name);
  
  for (const query of queries) {
    try {
      console.log(`   ${colors.blue}→ Query: "${query}"${colors.reset}`);
      
      // Search for videos
      const encodedQuery = encodeURIComponent(query);
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodedQuery}&regionCode=US&relevanceLanguage=en&videoDefinition=any&videoEmbeddable=true&maxResults=10&key=${apiKey}`;
      
      const searchResponse = await makeHttpRequest(searchUrl);
      
      if (searchResponse.statusCode !== 200) {
        throw new Error(`Search API error: ${searchResponse.statusCode} ${JSON.stringify(searchResponse.data)}`);
      }
      
      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        console.log(`     ${colors.yellow}⚠️  No videos found${colors.reset}`);
        continue;
      }
      
      // Get detailed video info
      const videoIds = searchResponse.data.items.slice(0, 5).map(item => item.id.videoId).join(',');
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`;
      
      const detailsResponse = await makeHttpRequest(detailsUrl);
      
      if (detailsResponse.statusCode !== 200) {
        throw new Error(`Details API error: ${detailsResponse.statusCode} ${JSON.stringify(detailsResponse.data)}`);
      }
      
      // Select best video
      const bestVideo = selectBestVideo(detailsResponse.data.items, query);
      
      if (bestVideo) {
        console.log(`     ${colors.green}✅ Found: "${bestVideo.title}"${colors.reset}`);
        console.log(`     ${colors.white}   Author: ${bestVideo.author}${colors.reset}`);
        console.log(`     ${colors.white}   Duration: ${Math.floor(bestVideo.lengthSeconds / 60)}:${(bestVideo.lengthSeconds % 60).toString().padStart(2, '0')}${colors.reset}`);
        console.log(`     ${colors.white}   Views: ${bestVideo.viewCount.toLocaleString()}${colors.reset}`);
        console.log(`     ${colors.white}   Score: ${bestVideo.score}${colors.reset}`);
        console.log(`     ${colors.white}   URL: https://www.youtube.com/watch?v=${bestVideo.id}${colors.reset}`);
        console.log(`     ${colors.white}   Response time: ${searchResponse.responseTime + detailsResponse.responseTime}ms${colors.reset}`);
        
        return {
          success: true,
          video: bestVideo,
          responseTime: searchResponse.responseTime + detailsResponse.responseTime
        };
      } else {
        console.log(`     ${colors.yellow}⚠️  No suitable cooking videos found${colors.reset}`);
      }
      
    } catch (error) {
      console.log(`     ${colors.red}❌ Error: ${error.message}${colors.reset}`);
      testStats.errors.push({
        meal: meal.name,
        query: query,
        error: error.message
      });
    }
  }
  
  return { success: false, error: 'No videos found for any query' };
}

// Test API key validation
async function testApiKeyValidation(apiKey) {
  console.log(`\n${colors.magenta}🔑 Testing API Key Validation${colors.reset}`);
  
  try {
    // Simple test search
    const testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=cooking&maxResults=1&key=${apiKey}`;
    const response = await makeHttpRequest(testUrl);
    
    if (response.statusCode === 200) {
      console.log(`${colors.green}✅ API Key is valid and working${colors.reset}`);
      console.log(`${colors.white}   Response time: ${response.responseTime}ms${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}❌ API Key validation failed: ${response.statusCode}${colors.reset}`);
      console.log(`${colors.red}   Error: ${JSON.stringify(response.data)}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ API Key test error: ${error.message}${colors.reset}`);
    return false;
  }
}

// Test quota tracking
async function testQuotaTracking() {
  console.log(`\n${colors.magenta}📊 Quota Usage Tracking${colors.reset}`);
  console.log(`${colors.white}   API calls made: ${testStats.apiCalls}${colors.reset}`);
  console.log(`${colors.white}   Estimated quota used: ${testStats.apiCalls * 100} units${colors.reset}`);
  console.log(`${colors.white}   Remaining daily quota: ~${10000 - (testStats.apiCalls * 100)} units${colors.reset}`);
  console.log(`${colors.white}   Average response time: ${Math.round(testStats.totalResponseTime / testStats.apiCalls)}ms${colors.reset}`);
}

// Run all tests
async function runAllTests() {
  console.log(`${colors.cyan}🧪 YouTube API Integration Test Suite${colors.reset}\n`);
  console.log(`${colors.white}Testing ${mockMeals.length} meals with comprehensive validation...${colors.reset}\n`);
  
  // Load environment
  if (!loadEnv()) {
    console.error(`${colors.red}❌ Cannot proceed without environment variables${colors.reset}`);
    process.exit(1);
  }
  
  // Get API key
  const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error(`${colors.red}❌ YouTube API key not found in environment${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.green}✅ API Key loaded: ${apiKey.substring(0, 10)}...${colors.reset}\n`);
  
  // Test API key validation
  const isValidKey = await testApiKeyValidation(apiKey);
  if (!isValidKey) {
    console.error(`${colors.red}❌ Cannot proceed with invalid API key${colors.reset}`);
    process.exit(1);
  }
  
  // Test each meal
  console.log(`\n${colors.cyan}🍽️  Testing Meal Video Search${colors.reset}`);
  
  for (const meal of mockMeals) {
    testStats.totalTests++;
    
    const result = await testYouTubeSearch(meal, apiKey);
    
    if (result.success) {
      testStats.passedTests++;
      console.log(`   ${colors.green}✅ ${meal.name} - SUCCESS${colors.reset}`);
    } else {
      testStats.failedTests++;
      console.log(`   ${colors.red}❌ ${meal.name} - FAILED${colors.reset}`);
    }
    
    // Small delay to respect API limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test quota tracking
  testQuotaTracking();
  
  // Final results
  console.log(`\n${colors.cyan}📋 Test Results Summary${colors.reset}`);
  console.log(`${colors.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.white}   Total Tests: ${testStats.totalTests}${colors.reset}`);
  console.log(`${colors.green}   Passed: ${testStats.passedTests}${colors.reset}`);
  console.log(`${colors.red}   Failed: ${testStats.failedTests}${colors.reset}`);
  console.log(`${colors.white}   Success Rate: ${Math.round((testStats.passedTests / testStats.totalTests) * 100)}%${colors.reset}`);
  console.log(`${colors.white}   API Calls: ${testStats.apiCalls}${colors.reset}`);
  console.log(`${colors.white}   Quota Used: ~${testStats.apiCalls * 100} units${colors.reset}`);
  console.log(`${colors.white}   Avg Response: ${Math.round(testStats.totalResponseTime / testStats.apiCalls)}ms${colors.reset}`);
  
  if (testStats.errors.length > 0) {
    console.log(`\n${colors.red}❌ Errors encountered:${colors.reset}`);
    testStats.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.meal}: ${error.error}`);
    });
  }
  
  // Integration readiness assessment
  console.log(`\n${colors.cyan}🎯 Integration Readiness Assessment${colors.reset}`);
  console.log(`${colors.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  const successRate = (testStats.passedTests / testStats.totalTests) * 100;
  const avgResponseTime = Math.round(testStats.totalResponseTime / testStats.apiCalls);
  
  if (successRate >= 80 && avgResponseTime < 3000) {
    console.log(`${colors.green}✅ READY FOR INTEGRATION${colors.reset}`);
    console.log(`${colors.green}   ✓ High success rate (${successRate}%)${colors.reset}`);
    console.log(`${colors.green}   ✓ Fast response times (${avgResponseTime}ms avg)${colors.reset}`);
    console.log(`${colors.green}   ✓ API is working reliably${colors.reset}`);
    console.log(`\n${colors.green}🚀 You can now integrate this into the main app with confidence!${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ NOT READY FOR INTEGRATION${colors.reset}`);
    if (successRate < 80) {
      console.log(`${colors.red}   ✗ Low success rate (${successRate}%)${colors.reset}`);
    }
    if (avgResponseTime >= 3000) {
      console.log(`${colors.red}   ✗ Slow response times (${avgResponseTime}ms avg)${colors.reset}`);
    }
    console.log(`\n${colors.red}🛠️  Please fix the issues above before integrating into main app.${colors.reset}`);
  }
  
  console.log(`\n${colors.white}Test completed at: ${new Date().toLocaleString()}${colors.reset}`);
}

// Run the test suite
if (require.main === module) {
  runAllTests().catch(error => {
    console.error(`${colors.red}❌ Test suite failed:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testYouTubeSearch,
  mockMeals
};