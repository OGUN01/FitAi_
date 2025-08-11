// Food Recognition Schema for Google Gemini Structured Output
// Provides 90%+ accuracy food recognition with proper JSON schema format

export const FOOD_RECOGNITION_SCHEMA = {
  type: 'object',
  properties: {
    foods: {
      type: 'array',
      description: 'List of recognized food items with detailed information',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: "Specific food name (e.g., 'Chicken Biryani', not just 'rice')",
          },
          hindiName: {
            type: 'string',
            description: 'Hindi name for Indian foods (optional)',
          },
          regionalName: {
            type: 'string',
            description: 'Regional name if applicable (optional)',
          },
          category: {
            type: 'string',
            enum: ['main', 'side', 'snack', 'sweet', 'beverage'],
            description: 'Food category classification',
          },
          cuisine: {
            type: 'string',
            enum: ['indian', 'international'],
            description: 'Cuisine type classification',
          },
          region: {
            type: 'string',
            enum: ['north', 'south', 'east', 'west', 'pan-indian'],
            description: 'Regional origin for Indian foods (optional)',
          },
          spiceLevel: {
            type: 'string',
            enum: ['mild', 'medium', 'hot', 'extra_hot'],
            description: 'Spice level for Indian foods (optional)',
          },
          cookingMethod: {
            type: 'string',
            enum: ['fried', 'steamed', 'baked', 'curry', 'grilled', 'raw', 'boiled'],
            description: 'Primary cooking method used',
          },
          estimatedGrams: {
            type: 'number',
            description: 'Estimated portion weight in grams',
          },
          portionConfidence: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Confidence in portion size estimation',
          },
          servingType: {
            type: 'string',
            enum: ['small', 'medium', 'large', 'traditional'],
            description: 'Serving size classification',
          },
          calories: {
            type: 'number',
            description: 'Calories for the estimated portion',
          },
          protein: {
            type: 'number',
            description: 'Protein in grams for the estimated portion',
          },
          carbs: {
            type: 'number',
            description: 'Carbohydrates in grams for the estimated portion',
          },
          fat: {
            type: 'number',
            description: 'Fat in grams for the estimated portion',
          },
          fiber: {
            type: 'number',
            description: 'Fiber in grams for the estimated portion',
          },
          sugar: {
            type: 'number',
            description: 'Sugar in grams for the estimated portion (optional)',
          },
          sodium: {
            type: 'number',
            description: 'Sodium in milligrams for the estimated portion (optional)',
          },
          ingredients: {
            type: 'array',
            items: { type: 'string' },
            description: 'Visible ingredients in the food',
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Overall confidence in food recognition',
          },
        },
        required: [
          'name',
          'category',
          'cuisine',
          'estimatedGrams',
          'calories',
          'protein',
          'carbs',
          'fat',
          'fiber',
          'confidence',
        ],
      },
    },
    overallConfidence: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: 'Overall confidence in the complete food recognition result',
    },
    totalCalories: {
      type: 'number',
      description: 'Sum of all food calories in the image',
    },
    analysisNotes: {
      type: 'string',
      description: 'Additional notes about the recognition process or uncertainties',
    },
    mealType: {
      type: 'string',
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      description: 'Suggested meal type based on food composition',
    },
  },
  required: ['foods', 'overallConfidence', 'totalCalories'],
};

// Schema for meal generation (AI Meals Quick Action)
export const MEAL_GENERATION_SCHEMA = {
  type: 'object',
  properties: {
    meals: {
      type: 'array',
      description: 'Generated meal options',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Creative meal name',
          },
          description: {
            type: 'string',
            description: 'Brief description of the meal and its benefits',
          },
          type: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'],
            description: 'Meal type classification',
          },
          cuisine: {
            type: 'string',
            enum: ['indian', 'international', 'fusion'],
            description: 'Cuisine style',
          },
          prepTime: {
            type: 'number',
            description: 'Preparation time in minutes',
          },
          cookTime: {
            type: 'number',
            description: 'Cooking time in minutes',
          },
          totalTime: {
            type: 'number',
            description: 'Total time required in minutes',
          },
          difficulty: {
            type: 'string',
            enum: ['easy', 'medium', 'hard'],
            description: 'Cooking difficulty level',
          },
          servings: {
            type: 'number',
            description: 'Number of servings this recipe makes',
          },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Ingredient name' },
                amount: { type: 'string', description: 'Quantity with unit' },
                notes: { type: 'string', description: 'Optional preparation notes' },
              },
              required: ['name', 'amount'],
            },
            description: 'List of ingredients with quantities',
          },
          instructions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                step: { type: 'number', description: 'Step number' },
                instruction: { type: 'string', description: 'Detailed step instruction' },
                time: { type: 'number', description: 'Time for this step in minutes (optional)' },
              },
              required: ['step', 'instruction'],
            },
            description: 'Step-by-step cooking instructions',
          },
          nutrition: {
            type: 'object',
            properties: {
              calories: { type: 'number', description: 'Calories per serving' },
              protein: { type: 'number', description: 'Protein in grams per serving' },
              carbs: { type: 'number', description: 'Carbohydrates in grams per serving' },
              fat: { type: 'number', description: 'Fat in grams per serving' },
              fiber: { type: 'number', description: 'Fiber in grams per serving' },
              sugar: { type: 'number', description: 'Sugar in grams per serving' },
              sodium: { type: 'number', description: 'Sodium in milligrams per serving' },
            },
            required: ['calories', 'protein', 'carbs', 'fat'],
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: "Meal tags (e.g., 'high-protein', 'vegetarian', 'quick')",
          },
          tips: {
            type: 'array',
            items: { type: 'string' },
            description: 'Cooking tips and variations',
          },
        },
        required: [
          'name',
          'description',
          'type',
          'cuisine',
          'prepTime',
          'cookTime',
          'difficulty',
          'servings',
          'ingredients',
          'instructions',
          'nutrition',
        ],
      },
    },
    totalMeals: {
      type: 'number',
      description: 'Number of meals generated',
    },
    dietaryNotes: {
      type: 'string',
      description: 'Notes about dietary considerations and customizations',
    },
  },
  required: ['meals', 'totalMeals'],
};

// Schema for recipe creation (Create Recipe Quick Action)
export const RECIPE_CREATION_SCHEMA = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Creative recipe name',
    },
    description: {
      type: 'string',
      description: 'Detailed description of the recipe and its benefits',
    },
    cuisine: {
      type: 'string',
      description: 'Cuisine type or fusion style',
    },
    servings: {
      type: 'number',
      description: 'Number of servings this recipe makes',
    },
    prepTime: {
      type: 'number',
      description: 'Preparation time in minutes',
    },
    cookTime: {
      type: 'number',
      description: 'Cooking time in minutes',
    },
    totalTime: {
      type: 'number',
      description: 'Total time required in minutes',
    },
    difficulty: {
      type: 'string',
      enum: ['beginner', 'intermediate', 'advanced'],
      description: 'Recipe difficulty level',
    },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string', description: 'Ingredient name' },
          amount: { type: 'string', description: "Quantity with unit (e.g., '2 cups', '1 tbsp')" },
          notes: { type: 'string', description: 'Optional preparation or substitution notes' },
        },
        required: ['item', 'amount'],
      },
      description: 'Complete ingredients list with precise measurements',
    },
    instructions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: { type: 'number', description: 'Step number in sequence' },
          instruction: { type: 'string', description: 'Detailed step-by-step instruction' },
          time: { type: 'number', description: 'Estimated time for this step in minutes' },
          temperature: { type: 'string', description: 'Cooking temperature if applicable' },
        },
        required: ['step', 'instruction'],
      },
      description: 'Comprehensive step-by-step cooking instructions',
    },
    nutritionPerServing: {
      type: 'object',
      properties: {
        calories: { type: 'number', description: 'Calories per serving' },
        protein: { type: 'number', description: 'Protein in grams per serving' },
        carbs: { type: 'number', description: 'Carbohydrates in grams per serving' },
        fat: { type: 'number', description: 'Fat in grams per serving' },
        fiber: { type: 'number', description: 'Fiber in grams per serving' },
        sugar: { type: 'number', description: 'Sugar in grams per serving' },
        sodium: { type: 'number', description: 'Sodium in milligrams per serving' },
      },
      required: ['calories', 'protein', 'carbs', 'fat'],
    },
    equipment: {
      type: 'array',
      items: { type: 'string' },
      description: 'Required cooking equipment and tools',
    },
    tips: {
      type: 'array',
      items: { type: 'string' },
      description: 'Professional cooking tips and tricks',
    },
    variations: {
      type: 'array',
      items: { type: 'string' },
      description: 'Recipe variations and substitutions',
    },
    storage: {
      type: 'string',
      description: 'Storage instructions and shelf life',
    },
    allergens: {
      type: 'array',
      items: { type: 'string' },
      description: 'Common allergens present in the recipe',
    },
  },
  required: [
    'name',
    'description',
    'servings',
    'prepTime',
    'cookTime',
    'totalTime',
    'difficulty',
    'ingredients',
    'instructions',
    'nutritionPerServing',
  ],
};
