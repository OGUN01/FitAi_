// 🧪 Quick API Key Test Script
// Run this to validate your Gemini API key setup

const testGeminiKeys = async () => {
  console.log('🔑 Testing Gemini API Keys Setup...\n');

  // Environment variables to check
  const keyNames = [
    'EXPO_PUBLIC_GEMINI_KEY_1',
    'EXPO_PUBLIC_GEMINI_KEY_2', 
    'EXPO_PUBLIC_GEMINI_KEY_3',
    'EXPO_PUBLIC_GEMINI_KEY_4',
    'EXPO_PUBLIC_GEMINI_KEY_5',
    'EXPO_PUBLIC_GEMINI_KEY_6',
    'EXPO_PUBLIC_GEMINI_KEY_7',
    'EXPO_PUBLIC_GEMINI_KEY_8',
    'EXPO_PUBLIC_GEMINI_KEY_9',
    'EXPO_PUBLIC_GEMINI_KEY_10',
  ];

  let validKeys = 0;
  let totalKeys = 0;

  for (const keyName of keyNames) {
    const key = process.env[keyName];
    totalKeys++;
    
    if (key) {
      console.log(`✅ ${keyName}: ${key.substring(0, 20)}...`);
      validKeys++;
      
      // Test the key with a simple API call
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: 'Test'
              }]
            }]
          })
        });

        if (response.ok) {
          console.log(`   🟢 API Key ${keyName} is working`);
        } else {
          console.log(`   🔴 API Key ${keyName} failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ⚠️ API Key ${keyName} test failed: ${error.message}`);
      }
    } else {
      console.log(`❌ ${keyName}: Not set`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`• Valid keys: ${validKeys}/${totalKeys}`);
  console.log(`• Capacity: ${validKeys * 15} requests/minute`);
  console.log(`• Daily quota: ${validKeys * 1500} requests/day`);
  
  if (validKeys >= 5) {
    console.log(`✅ Great! You have enough keys for production use.`);
  } else if (validKeys >= 2) {
    console.log(`⚠️ You have some keys but may need more for high traffic.`);
  } else {
    console.log(`❌ Please set up at least 2-5 API keys for proper operation.`);
  }

  // Test optional APIs
  console.log(`\n🆓 Testing Optional Free APIs:`);
  
  const usdaKey = process.env.USDA_API_KEY;
  console.log(`• USDA API: ${usdaKey ? '✅ Set' : '⚪ Optional (works without key)'}`);
  
  const fatSecretKeys = [
    process.env.FATSECRET_KEY_1,
    process.env.FATSECRET_KEY_2,
    process.env.FATSECRET_KEY_3
  ].filter(Boolean);
  console.log(`• FatSecret Keys: ${fatSecretKeys.length} configured`);

  console.log(`\n🚀 Food Recognition System Status: ${validKeys >= 2 ? 'READY' : 'NEEDS SETUP'}`);
};

// Run the test
if (require.main === module) {
  testGeminiKeys().catch(console.error);
}

module.exports = { testGeminiKeys };