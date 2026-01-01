// Smart Cooking Flow Generator
// Generate logical cooking steps based on meal type and ingredients

import { DayMeal } from '../ai';

export interface CookingStep {
  step: number;
  instruction: string;
  timeRequired?: number;
  tips?: string;
  icon?: string;
}

export interface CookingFlow {
  steps: CookingStep[];
  totalTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  equipmentNeeded: string[];
  proTips: string[];
}

class CookingFlowGenerator {
  // Detect cooking method from meal name
  private detectCookingMethod(mealName: string): string {
    const name = mealName.toLowerCase();
    
    if (name.includes('scrambled') || name.includes('scramble')) return 'scrambled';
    if (name.includes('grilled') || name.includes('grill')) return 'grilled';
    if (name.includes('stir-fry') || name.includes('stir fry')) return 'stir-fry';
    if (name.includes('curry')) return 'curry';
    if (name.includes('salad')) return 'salad';
    if (name.includes('smoothie') || name.includes('shake')) return 'smoothie';
    if (name.includes('soup')) return 'soup';
    if (name.includes('roasted') || name.includes('roast')) return 'roasted';
    if (name.includes('steamed')) return 'steamed';
    if (name.includes('boiled')) return 'boiled';
    if (name.includes('baked') || name.includes('bake')) return 'baked';
    if (name.includes('fried') || name.includes('fry')) return 'fried';
    if (name.includes('sautéed') || name.includes('saute')) return 'sauteed';
    
    // Default based on main ingredients
    return 'general';
  }

  // Get equipment needed based on cooking method
  private getEquipment(method: string, ingredients: string[]): string[] {
    const baseEquipment = ['Knife', 'Cutting board'];
    
    switch (method) {
      case 'scrambled':
        return [...baseEquipment, 'Non-stick pan', 'Spatula', 'Whisk'];
      case 'grilled':
        return [...baseEquipment, 'Grill pan', 'Tongs'];
      case 'stir-fry':
        return [...baseEquipment, 'Wok or large pan', 'Wooden spoon'];
      case 'curry':
        return [...baseEquipment, 'Heavy-bottomed pot', 'Wooden spoon'];
      case 'salad':
        return [...baseEquipment, 'Large bowl', 'Salad tongs'];
      case 'smoothie':
        return ['Blender', 'Measuring cups'];
      case 'soup':
        return [...baseEquipment, 'Large pot', 'Ladle', 'Immersion blender'];
      case 'roasted':
        return [...baseEquipment, 'Oven', 'Roasting pan', 'Meat thermometer'];
      case 'steamed':
        return [...baseEquipment, 'Steamer basket', 'Large pot with lid'];
      case 'baked':
        return [...baseEquipment, 'Oven', 'Baking dish'];
      default:
        return [...baseEquipment, 'Medium pan'];
    }
  }

  // Generate cooking steps based on method
  private generateStepsByMethod(method: string, meal: DayMeal): CookingStep[] {
    const ingredients = meal.items?.map(item => item.name) || [];
    const hasProtein = ingredients.some(ing => 
      ['paneer', 'chicken', 'tofu', 'eggs'].some(protein => 
        ing.toLowerCase().includes(protein)
      )
    );
    const hasVegetables = ingredients.some(ing => 
      ['spinach', 'onion', 'tomato', 'broccoli'].some(veg => 
        ing.toLowerCase().includes(veg)
      )
    );

    switch (method) {
      case 'scrambled':
        return [
          {
            step: 1,
            instruction: 'Prepare and gather all ingredients',
            timeRequired: 3,
            icon: '📋',
            tips: 'Mise en place - having everything ready makes cooking smoother'
          },
          {
            step: 2,
            instruction: 'Heat pan over medium heat with a little oil',
            timeRequired: 2,
            icon: '🔥',
            tips: 'Medium heat prevents burning and ensures even cooking'
          },
          {
            step: 3,
            instruction: hasVegetables 
              ? 'Add vegetables and cook until softened' 
              : 'Add main ingredients to the pan',
            timeRequired: hasVegetables ? 4 : 3,
            icon: '🥬',
            tips: 'Cook vegetables first to release their flavors'
          },
          {
            step: 4,
            instruction: hasProtein 
              ? 'Add protein and scramble gently' 
              : 'Scramble ingredients gently with spatula',
            timeRequired: 4,
            icon: '🥚',
            tips: 'Gentle scrambling creates fluffy, not rubbery texture'
          },
          {
            step: 5,
            instruction: 'Season to taste and serve hot',
            timeRequired: 1,
            icon: '🧂',
            tips: 'Taste before serving and adjust seasoning if needed'
          }
        ];

      case 'stir-fry':
        return [
          {
            step: 1,
            instruction: 'Prep all ingredients - cut into uniform pieces',
            timeRequired: 5,
            icon: '🔪',
            tips: 'Uniform pieces ensure even cooking'
          },
          {
            step: 2,
            instruction: 'Heat wok or large pan over high heat',
            timeRequired: 2,
            icon: '🔥',
            tips: 'High heat is key for proper stir-frying'
          },
          {
            step: 3,
            instruction: 'Add oil and swirl to coat the pan',
            timeRequired: 1,
            icon: '🫒',
            tips: 'Use oil with high smoke point like avocado or peanut oil'
          },
          {
            step: 4,
            instruction: hasProtein 
              ? 'Add protein first, cook until almost done' 
              : 'Add harder vegetables first',
            timeRequired: 3,
            icon: '🥩',
            tips: 'Cook ingredients in order of cooking time needed'
          },
          {
            step: 5,
            instruction: 'Add remaining vegetables, stir constantly',
            timeRequired: 4,
            icon: '🥕',
            tips: 'Keep ingredients moving to prevent burning'
          },
          {
            step: 6,
            instruction: 'Season and serve immediately',
            timeRequired: 1,
            icon: '🍽️',
            tips: 'Serve immediately to maintain crispness'
          }
        ];

      case 'curry':
        return [
          {
            step: 1,
            instruction: 'Prepare spice mix and chop all ingredients',
            timeRequired: 8,
            icon: '🌶️',
            tips: 'Fresh spices make a huge difference in flavor'
          },
          {
            step: 2,
            instruction: 'Heat oil in heavy-bottomed pot',
            timeRequired: 2,
            icon: '🍲',
            tips: 'Heavy bottom prevents burning and ensures even heat'
          },
          {
            step: 3,
            instruction: 'Add aromatics (onion, garlic, ginger) and cook',
            timeRequired: 5,
            icon: '🧅',
            tips: 'Cook until fragrant but not brown for best flavor'
          },
          {
            step: 4,
            instruction: 'Add spices and cook for 30 seconds',
            timeRequired: 1,
            icon: '🌿',
            tips: 'Blooming spices releases their essential oils'
          },
          {
            step: 5,
            instruction: hasProtein 
              ? 'Add protein and cook until browned' 
              : 'Add main vegetables',
            timeRequired: 6,
            icon: '🥩',
            tips: 'Browning adds depth of flavor'
          },
          {
            step: 6,
            instruction: 'Add liquid and simmer until tender',
            timeRequired: 15,
            icon: '🥥',
            tips: 'Low simmer prevents breaking apart ingredients'
          },
          {
            step: 7,
            instruction: 'Taste, adjust seasoning, and serve',
            timeRequired: 2,
            icon: '✨',
            tips: 'Let curry rest 5 minutes before serving for flavors to meld'
          }
        ];

      case 'salad':
        return [
          {
            step: 1,
            instruction: 'Wash and thoroughly dry all vegetables',
            timeRequired: 5,
            icon: '💧',
            tips: 'Dry vegetables ensure dressing adheres properly'
          },
          {
            step: 2,
            instruction: 'Chop vegetables into bite-sized pieces',
            timeRequired: 4,
            icon: '🔪',
            tips: 'Uniform pieces make eating easier and look more appealing'
          },
          {
            step: 3,
            instruction: 'Prepare dressing in a small bowl',
            timeRequired: 2,
            icon: '🥄',
            tips: 'Whisk dressing well to emulsify ingredients'
          },
          {
            step: 4,
            instruction: 'Combine vegetables in large bowl',
            timeRequired: 1,
            icon: '🥗',
            tips: 'Start with heartier vegetables at the bottom'
          },
          {
            step: 5,
            instruction: 'Add dressing and toss gently',
            timeRequired: 1,
            icon: '🥄',
            tips: 'Start with less dressing - you can always add more'
          },
          {
            step: 6,
            instruction: 'Add any proteins or nuts and serve',
            timeRequired: 1,
            icon: '🥜',
            tips: 'Add delicate ingredients last to prevent wilting'
          }
        ];

      case 'smoothie':
        return [
          {
            step: 1,
            instruction: 'Gather all ingredients and wash fruits',
            timeRequired: 2,
            icon: '🍓',
            tips: 'Frozen fruits create a thicker, colder smoothie'
          },
          {
            step: 2,
            instruction: 'Add liquid ingredients to blender first',
            timeRequired: 1,
            icon: '🥛',
            tips: 'Liquids help the blender work more efficiently'
          },
          {
            step: 3,
            instruction: 'Add soft ingredients (banana, yogurt)',
            timeRequired: 1,
            icon: '🍌',
            tips: 'Layer ingredients by density for best blending'
          },
          {
            step: 4,
            instruction: 'Add harder ingredients (frozen fruits)',
            timeRequired: 1,
            icon: '🧊',
            tips: 'Frozen ingredients go on top for easier blending'
          },
          {
            step: 5,
            instruction: 'Blend until smooth, add liquid if needed',
            timeRequired: 2,
            icon: '🌪️',
            tips: 'Stop and scrape sides if needed for even blending'
          },
          {
            step: 6,
            instruction: 'Taste, adjust sweetness, and serve',
            timeRequired: 1,
            icon: '🥤',
            tips: 'Serve immediately for best texture and nutrition'
          }
        ];

      default:
        return [
          {
            step: 1,
            instruction: 'Prepare and organize all ingredients',
            timeRequired: 5,
            icon: '📋',
            tips: 'Having everything ready makes cooking much smoother'
          },
          {
            step: 2,
            instruction: 'Heat cooking vessel to appropriate temperature',
            timeRequired: 3,
            icon: '🔥',
            tips: 'Proper temperature is key to good cooking'
          },
          {
            step: 3,
            instruction: 'Cook ingredients according to their needs',
            timeRequired: 8,
            icon: '👨‍🍳',
            tips: 'Cook harder ingredients first, softer ones last'
          },
          {
            step: 4,
            instruction: 'Season and combine all components',
            timeRequired: 2,
            icon: '🧂',
            tips: 'Taste as you go and adjust seasoning'
          },
          {
            step: 5,
            instruction: 'Plate beautifully and serve',
            timeRequired: 2,
            icon: '🍽️',
            tips: 'We eat with our eyes first - make it look good!'
          }
        ];
    }
  }

  // Generate pro tips based on ingredients and method
  private generateProTips(meal: DayMeal, method: string): string[] {
    const tips: string[] = [];
    const ingredients = meal.items?.map(item => item.name.toLowerCase()) || [];

    // Method-specific tips
    switch (method) {
      case 'scrambled':
        tips.push('Remove from heat while slightly underdone - residual heat will finish cooking');
        break;
      case 'stir-fry':
        tips.push('Have all ingredients prepped before you start - stir-frying is fast!');
        break;
      case 'curry':
        tips.push('Let curry rest off heat for 5-10 minutes before serving for flavors to meld');
        break;
      case 'salad':
        tips.push('Dress salad just before serving to prevent wilting');
        break;
    }

    // Ingredient-specific tips based on AI-generated ingredients
    ingredients.forEach(ingredient => {
      // Generate smart tips based on common ingredient types
      if (ingredient.includes('protein') || ingredient.includes('chicken') || ingredient.includes('paneer')) {
        tips.push('Cook protein thoroughly but avoid overcooking to maintain tenderness');
      }
      if (ingredient.includes('vegetable') || ingredient.includes('spinach') || ingredient.includes('broccoli')) {
        tips.push('Cook vegetables until tender-crisp to retain nutrients and texture');
      }
      if (ingredient.includes('spice') || ingredient.includes('garlic') || ingredient.includes('onion')) {
        tips.push('Sauté aromatics until fragrant to develop deep flavors');
      }
    });

    // General tips based on meal properties
    if (meal.difficulty === 'easy') {
      tips.push('Take your time - simple dishes rely on good technique');
    } else if (meal.difficulty === 'hard') {
      tips.push('Read through all steps before starting');
    }

    if (meal.preparationTime && meal.preparationTime < 15) {
      tips.push('Quick meals benefit from having everything prepped first');
    }

    return tips.slice(0, 3); // Limit to 3 most relevant tips
  }

  // Main method to generate cooking flow
  public generateCookingFlow(meal: DayMeal): CookingFlow {
    const method = this.detectCookingMethod(meal.name);
    const steps = this.generateStepsByMethod(method, meal);
    const equipment = this.getEquipment(method, meal.items?.map(item => item.name) || []);
    const proTips = this.generateProTips(meal, method);
    
    const totalTime = steps.reduce((sum, step) => sum + (step.timeRequired || 0), 0);

    // Determine difficulty based on number of steps and time
    let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
    if (steps.length > 6 || totalTime > 30) {
      difficulty = 'hard';
    } else if (steps.length > 4 || totalTime > 15) {
      difficulty = 'medium';
    }

    return {
      steps,
      totalTime,
      difficulty,
      equipmentNeeded: equipment,
      proTips
    };
  }

  // Get cooking tips based on current step
  public getStepSpecificTips(step: CookingStep, meal: DayMeal): string[] {
    const tips: string[] = [];
    
    if (step.tips) {
      tips.push(step.tips);
    }

    // Add time-sensitive tips
    if (step.timeRequired && step.timeRequired > 5) {
      tips.push(`⏰ This step takes ${step.timeRequired} minutes - perfect time to prep the next step`);
    }

    // Add safety tips for high-heat cooking
    if (step.instruction.toLowerCase().includes('high heat')) {
      tips.push('🔥 Stay attentive with high heat - things can go from perfect to burnt quickly');
    }

    return tips.filter(Boolean);
  }

  // Get appropriate cooking encouragement based on progress
  public getCookingEncouragement(currentStep: number, totalSteps: number): string {
    const progress = (currentStep / totalSteps) * 100;
    
    if (progress <= 20) {
      return "🚀 Great start! You're building the foundation of something delicious!";
    } else if (progress <= 40) {
      return "👏 Looking good! The aromas should start developing soon!";
    } else if (progress <= 60) {
      return "🔥 Fantastic progress! You're really hitting your stride now!";
    } else if (progress <= 80) {
      return "⚡ Almost there! The final touches make all the difference!";
    } else {
      return "🎉 You're a cooking champion! Time to enjoy your masterpiece!";
    }
  }
}

export const cookingFlowGenerator = new CookingFlowGenerator();