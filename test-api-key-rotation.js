// Test API Key Rotation with New Key
require('dotenv').config();

console.log('🔧 Testing API Key Rotation System\n');

// Check environment variables
const apiKeys = {
  'Main Key': process.env.EXPO_PUBLIC_GEMINI_API_KEY,
  'Key 1': process.env.EXPO_PUBLIC_GEMINI_KEY_1,
  'Key 2': process.env.EXPO_PUBLIC_GEMINI_KEY_2,
  'Key 3': process.env.EXPO_PUBLIC_GEMINI_KEY_3,
  'Key 4': process.env.EXPO_PUBLIC_GEMINI_KEY_4,
  'Key 5': process.env.EXPO_PUBLIC_GEMINI_KEY_5,
  'Key 6': process.env.EXPO_PUBLIC_GEMINI_KEY_6,
  'Key 7': process.env.EXPO_PUBLIC_GEMINI_KEY_7,
  'Key 8': process.env.EXPO_PUBLIC_GEMINI_KEY_8,
  'Key 9': process.env.EXPO_PUBLIC_GEMINI_KEY_9,
  'Key 10': process.env.EXPO_PUBLIC_GEMINI_KEY_10,
};

console.log('📊 API Key Status:');
let totalKeys = 0;
Object.entries(apiKeys).forEach(([name, key]) => {
  if (key && key.trim()) {
    console.log(`✅ ${name}: ${key.substring(0, 20)}...`);
    totalKeys++;
  } else {
    console.log(`❌ ${name}: Not configured`);
  }
});

console.log(`\n📈 Total configured keys: ${totalKeys}`);

// Test the APIKeyRotator
try {
  const { APIKeyRotator } = require('./src/utils/apiKeyRotator');
  const rotator = new APIKeyRotator();
  
  console.log('\n🔄 Testing API Key Rotator:');
  const stats = rotator.getUsageStatistics();
  console.log(`  - Total keys loaded: ${stats.totalKeys}`);
  console.log(`  - Available keys: ${stats.availableKeys}`);
  console.log(`  - Key statistics:`);
  stats.keyStatistics.forEach(stat => {
    console.log(`    Key ${stat.keyIndex}: ${stat.hasQuota ? '✅ Available' : '❌ No quota'} (${stat.requestsToday}/1500 today)`);
  });
  
  // Test getting an available key
  rotator.getAvailableKey().then(key => {
    if (key) {
      console.log(`\n✅ Successfully retrieved available key: ${key.substring(0, 20)}...`);
    } else {
      console.log('\n❌ No available keys found');
    }
  });
  
} catch (error) {
  console.error('\n❌ Error testing APIKeyRotator:', error.message);
}

// Test with actual Gemini API
const testGeminiAPI = async () => {
  try {
    console.log('\n🧪 Testing Gemini API with new key...');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    // Test specifically with Key 6
    const testKey = process.env.EXPO_PUBLIC_GEMINI_KEY_6;
    if (!testKey) {
      console.log('❌ Key 6 not found in environment');
      return;
    }
    
    console.log(`🔑 Testing with Key 6: ${testKey.substring(0, 20)}...`);
    
    const genAI = new GoogleGenerativeAI(testKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const result = await model.generateContent('Say "API key test successful!" if you can read this.');
    const response = result.response;
    const text = response.text();
    
    console.log('✅ Gemini API Response:', text);
    console.log('✅ New API key is working correctly!');
    
  } catch (error) {
    console.error('❌ Gemini API test failed:', error.message);
    if (error.message.includes('quota')) {
      console.log('⚠️  This key has exceeded its quota');
    }
  }
};

// Run the test
testGeminiAPI().then(() => {
  console.log('\n✅ API Key rotation test completed');
}).catch(error => {
  console.error('\n❌ Test failed:', error);
});