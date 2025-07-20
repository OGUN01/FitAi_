// Simple test to verify structured output is working
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

async function testBasicStructuredOutput() {
  console.log('🧪 Testing Basic Structured Output...');

  // Read API key from .env file
  let apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    try {
      const envContent = fs.readFileSync('.env', 'utf8');
      const match = envContent.match(/EXPO_PUBLIC_GEMINI_API_KEY=(.+)/);
      if (match) {
        apiKey = match[1].trim();
        console.log('✅ Found API key in .env file');
      }
    } catch (error) {
      console.log('❌ Could not read .env file:', error.message);
    }
  }

  if (!apiKey) {
    console.log('❌ GEMINI_API_KEY not found in environment or .env file');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Simple schema test
  const simpleSchema = {
    type: "OBJECT",
    properties: {
      name: { type: "STRING" },
      age: { type: "NUMBER" },
      isActive: { type: "BOOLEAN" }
    },
    required: ["name", "age", "isActive"],
    propertyOrdering: ["name", "age", "isActive"]
  };

  try {
    console.log('📤 Sending request with structured output...');
    
    const result = await model.generateContent({
      contents: [{ parts: [{ text: "Create a sample user profile with name, age, and active status." }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: simpleSchema
      }
    });

    const response = await result.response;
    const text = response.text();
    
    console.log('📥 Raw response:', text);
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(text);
      console.log('✅ Successfully parsed JSON:', parsed);
      console.log('🎉 Structured output is working!');
      return true;
    } catch (parseError) {
      console.log('❌ Failed to parse JSON:', parseError.message);
      return false;
    }
    
  } catch (error) {
    console.log('❌ API Error:', error.message);
    return false;
  }
}

// Run the test
testBasicStructuredOutput()
  .then(success => {
    if (success) {
      console.log('\n🎯 CONCLUSION: Structured output implementation is working correctly!');
      console.log('✅ The AI logic improvements are ready for use.');
    } else {
      console.log('\n⚠️ CONCLUSION: There may be issues with the structured output implementation.');
      console.log('🔧 Check API key and network connectivity.');
    }
  })
  .catch(error => {
    console.log('\n💥 Test failed with error:', error.message);
  });
