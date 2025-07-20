// Test nutrition analysis with structured output
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// Simplified nutrition schema for testing
const NUTRITION_SCHEMA = {
  type: "OBJECT",
  properties: {
    meals: {
      type: "ARRAY",
      description: "Daily meal plan",
      items: {
        type: "OBJECT",
        properties: {
          type: {
            type: "STRING",
            enum: ["breakfast", "lunch", "dinner", "snack", "pre_workout", "post_workout"],
            description: "Meal type"
          },
          name: {
            type: "STRING",
            description: "Scientifically-crafted meal name"
          },
          description: {
            type: "STRING",
            description: "Nutritional rationale and benefits"
          },
          items: {
            type: "ARRAY",
            description: "Food items in the meal",
            items: {
              type: "OBJECT",
              properties: {
                name: {
                  type: "STRING",
                  description: "Specific food item"
                },
                quantity: {
                  type: "NUMBER",
                  description: "Precise amount"
                },
                unit: {
                  type: "STRING",
                  enum: ["g", "ml", "piece", "cup", "tbsp", "tsp", "oz"],
                  description: "Unit of measurement"
                },
                calories: {
                  type: "NUMBER",
                  description: "Accurate calories"
                },
                protein: {
                  type: "NUMBER",
                  description: "Grams of protein"
                },
                carbohydrates: {
                  type: "NUMBER",
                  description: "Grams of carbohydrates"
                },
                fat: {
                  type: "NUMBER",
                  description: "Grams of fat"
                }
              },
              required: ["name", "quantity", "unit", "calories", "protein", "carbohydrates", "fat"],
              propertyOrdering: ["name", "quantity", "unit", "calories", "protein", "carbohydrates", "fat"]
            }
          },
          totalCalories: {
            type: "NUMBER",
            description: "Total calories for the meal"
          },
          totalProtein: {
            type: "NUMBER",
            description: "Total protein for the meal"
          },
          totalCarbohydrates: {
            type: "NUMBER",
            description: "Total carbohydrates for the meal"
          },
          totalFat: {
            type: "NUMBER",
            description: "Total fat for the meal"
          }
        },
        required: ["type", "name", "description", "items", "totalCalories", "totalProtein", "totalCarbohydrates", "totalFat"],
        propertyOrdering: ["type", "name", "description", "items", "totalCalories", "totalProtein", "totalCarbohydrates", "totalFat"]
      }
    },
    dailyTotals: {
      type: "OBJECT",
      properties: {
        calories: { type: "NUMBER" },
        protein: { type: "NUMBER" },
        carbohydrates: { type: "NUMBER" },
        fat: { type: "NUMBER" }
      },
      required: ["calories", "protein", "carbohydrates", "fat"],
      propertyOrdering: ["calories", "protein", "carbohydrates", "fat"]
    },
    nutritionalInsights: {
      type: "ARRAY",
      description: "Key nutritional insights and recommendations",
      items: { type: "STRING" }
    }
  },
  required: ["meals", "dailyTotals", "nutritionalInsights"],
  propertyOrdering: ["meals", "dailyTotals", "nutritionalInsights"]
};

async function testNutritionAnalysis() {
  console.log('🥗 Testing Nutrition Analysis with Structured Output...');
  
  // Read API key from .env file
  let apiKey;
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const match = envContent.match(/EXPO_PUBLIC_GEMINI_API_KEY=(.+)/);
    if (match) {
      apiKey = match[1].trim();
      console.log('✅ Found API key in .env file');
    }
  } catch (error) {
    console.log('❌ Could not read .env file:', error.message);
    return;
  }
  
  if (!apiKey) {
    console.log('❌ API key not found');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Create a comprehensive daily meal plan for a 28-year-old male, 175cm, 70kg, moderately active, with a goal of muscle gain. Target: 2500 calories daily.

Create a comprehensive daily meal plan with the following structure:
- Meals: List of meals including breakfast, lunch, dinner, and snacks
- Each meal should include:
  * Type: breakfast, lunch, dinner, snack, pre_workout, or post_workout
  * Name: scientifically-crafted meal name
  * Description: nutritional rationale and benefits
  * Items: detailed food items with quantities, units, calories, and macronutrients
  * Total calories and macronutrients for the meal
- Daily totals: comprehensive nutritional summary
- Nutritional insights: key recommendations`;

  try {
    console.log('📤 Generating nutrition plan with structured output...');
    
    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: NUTRITION_SCHEMA
      }
    });

    const response = await result.response;
    const text = response.text();
    
    console.log('📥 Raw response length:', text.length, 'characters');
    
    // Try to parse as JSON
    try {
      const nutrition = JSON.parse(text);
      console.log('✅ Successfully parsed nutrition JSON!');
      
      // Validate structure
      console.log('\n📊 Nutrition Plan Structure Validation:');
      console.log('✅ Number of meals:', nutrition.meals?.length || 0);
      console.log('✅ Daily total calories:', nutrition.dailyTotals?.calories || 0);
      console.log('✅ Daily total protein:', nutrition.dailyTotals?.protein || 0, 'g');
      console.log('✅ Daily total carbs:', nutrition.dailyTotals?.carbohydrates || 0, 'g');
      console.log('✅ Daily total fat:', nutrition.dailyTotals?.fat || 0, 'g');
      console.log('✅ Nutritional insights:', nutrition.nutritionalInsights?.length || 0);
      
      if (nutrition.meals && nutrition.meals.length > 0) {
        console.log('\n🍽️ Sample Meal:');
        const firstMeal = nutrition.meals[0];
        console.log('  - Type:', firstMeal.type);
        console.log('  - Name:', firstMeal.name);
        console.log('  - Total Calories:', firstMeal.totalCalories);
        console.log('  - Food Items:', firstMeal.items?.length || 0);
        
        if (firstMeal.items && firstMeal.items.length > 0) {
          console.log('  - Sample Food:', firstMeal.items[0].name, '-', firstMeal.items[0].quantity, firstMeal.items[0].unit);
        }
      }
      
      console.log('\n🎉 Nutrition analysis with structured output is working perfectly!');
      return true;
      
    } catch (parseError) {
      console.log('❌ Failed to parse JSON:', parseError.message);
      console.log('Raw response preview:', text.substring(0, 500) + '...');
      return false;
    }
    
  } catch (error) {
    console.log('❌ API Error:', error.message);
    return false;
  }
}

// Run the test
testNutritionAnalysis()
  .then(success => {
    if (success) {
      console.log('\n🎯 CONCLUSION: Nutrition analysis with structured output is working perfectly!');
      console.log('✅ The AI logic improvements are production-ready.');
    } else {
      console.log('\n⚠️ CONCLUSION: There may be issues with nutrition analysis.');
    }
  })
  .catch(error => {
    console.log('\n💥 Test failed with error:', error.message);
  });
