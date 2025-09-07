// Quick validation script to verify all 23 API keys are properly configured
const fs = require('fs');

console.log('🧪 Validating FitAI API Keys Configuration...\n');

// Check eas.json
console.log('📁 Checking eas.json configuration...');
const easConfig = JSON.parse(fs.readFileSync('./eas.json', 'utf8'));

const profiles = ['development', 'preview', 'production', 'production-aab'];
for (const profile of profiles) {
  console.log(`\n🔧 Profile: ${profile}`);
  const env = easConfig.build[profile].env;
  
  let geminiKeys = 0;
  for (let i = 0; i < 23; i++) {
    const keyName = i === 0 ? 'EXPO_PUBLIC_GEMINI_API_KEY' : `EXPO_PUBLIC_GEMINI_KEY_${i}`;
    if (env[keyName]) {
      geminiKeys++;
    }
  }
  
  console.log(`  ✅ Gemini API Keys: ${geminiKeys}/23 configured`);
  console.log(`  ⚡ Capacity: ${geminiKeys * 1500} requests/day`);
}

// Check app.config.js
console.log('\n📁 Checking app.config.js configuration...');
const appConfigContent = fs.readFileSync('./app.config.js', 'utf8');

let extraKeys = 0;
for (let i = 0; i < 23; i++) {
  const keyName = i === 0 ? 'EXPO_PUBLIC_GEMINI_API_KEY' : `EXPO_PUBLIC_GEMINI_KEY_${i}`;
  if (appConfigContent.includes(`${keyName}: process.env.${keyName}`)) {
    extraKeys++;
  }
}

console.log(`  ✅ Extra section keys: ${extraKeys}/23 mapped`);

// Summary
console.log('\n🎯 VALIDATION SUMMARY:');
console.log(`📊 Total API Keys Configured: ${Math.min(...profiles.map(p => {
  const env = easConfig.build[p].env;
  let count = 0;
  for (let i = 0; i < 23; i++) {
    const keyName = i === 0 ? 'EXPO_PUBLIC_GEMINI_API_KEY' : `EXPO_PUBLIC_GEMINI_KEY_${i}`;
    if (env[keyName]) count++;
  }
  return count;
}))}/23`);

console.log(`🚀 Estimated Daily Capacity: ${Math.min(...profiles.map(p => {
  const env = easConfig.build[p].env;
  let count = 0;
  for (let i = 0; i < 23; i++) {
    const keyName = i === 0 ? 'EXPO_PUBLIC_GEMINI_API_KEY' : `EXPO_PUBLIC_GEMINI_KEY_${i}`;
    if (env[keyName]) count++;
  }
  return count;
})) * 1500} requests`);

console.log(`👥 Estimated User Support: ${Math.floor((Math.min(...profiles.map(p => {
  const env = easConfig.build[p].env;
  let count = 0;
  for (let i = 0; i < 23; i++) {
    const keyName = i === 0 ? 'EXPO_PUBLIC_GEMINI_API_KEY' : `EXPO_PUBLIC_GEMINI_KEY_${i}`;
    if (env[keyName]) count++;
  }
  return count;
})) * 1500) / 50)} active users/day`);

console.log('\n✅ Configuration validation completed!');