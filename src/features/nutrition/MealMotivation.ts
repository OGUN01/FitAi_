// Premium Meal Motivation System
// Dynamic messaging without LLM calls - pure client-side logic

import { DayMeal } from '../../ai/weeklyMealGenerator';
import { PersonalInfo, FitnessGoals } from '../../types/user';

export interface MealMotivationConfig {
  personalInfo?: PersonalInfo;
  fitnessGoals?: FitnessGoals;
  currentStreak?: number;
  completedMealsToday?: number;
  lastMealTime?: Date;
}

class MealMotivationService {
  // Time-based greetings
  private getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    
    if (hour < 6) return "🌙 Late night fuel? ";
    if (hour < 12) return "☀️ Good morning, chef! ";
    if (hour < 17) return "🔋 Afternoon energy time! ";
    if (hour < 21) return "🌅 Evening nourishment! ";
    return "🌙 Night owl's nutrition! ";
  }

  // Goal-based motivation
  private getGoalBasedMessage(goals?: FitnessGoals, meal?: DayMeal): string {
    if (!goals) return "";

    const primaryGoal = goals.primaryGoals[0];
    const protein = Math.round(meal?.totalMacros?.protein || 0);
    const calories = meal?.totalCalories || 0;

    switch (primaryGoal) {
      case 'weight_loss':
        return `💪 Smart choice! ${calories} calories of pure nutrition`;
      case 'muscle_gain':
        return `🔥 Muscle fuel incoming! ${protein}g protein to feed those gains`;
      case 'maintain_weight':
        return `⚖️ Perfectly balanced! ${calories} calories of wholesome goodness`;
      case 'improve_fitness':
        return `🚀 Performance fuel! This meal powers your fitness journey`;
      default:
        return `🎯 Nourish your body, fuel your goals!`;
    }
  }

  // Meal type specific motivation
  private getMealTypeMessage(mealType: string, meal?: DayMeal): string {
    const prepTime = meal?.preparationTime || 15;
    
    switch (mealType) {
      case 'breakfast':
        return `Start strong! ${prepTime} minutes to breakfast greatness`;
      case 'lunch':
        return `Midday recharge! ${prepTime} minutes to sustained energy`;
      case 'dinner':
        return `Evening feast! ${prepTime} minutes to dinner perfection`;
      case 'snack':
        return `Quick boost! ${prepTime} minutes to healthy snacking`;
      default:
        return `Ready to cook? ${prepTime} minutes to deliciousness`;
    }
  }

  // Progress and streak motivation
  private getProgressMessage(config: MealMotivationConfig): string {
    const { currentStreak = 0, completedMealsToday = 0 } = config;
    
    if (currentStreak >= 7) {
      return "🔥 7-day streak! You're on fire!";
    }
    if (currentStreak >= 3) {
      return `🌟 ${currentStreak}-day streak! Keep it going!`;
    }
    if (completedMealsToday === 0) {
      return "🌅 First meal of the day! Make it count!";
    }
    if (completedMealsToday >= 2) {
      return "🎯 Crushing your nutrition goals today!";
    }
    
    return "💫 Every healthy meal is a victory!";
  }

  // Difficulty-based encouragement
  private getDifficultyMessage(difficulty?: string): string {
    switch (difficulty) {
      case 'easy':
        return "✨ Quick and simple! ";
      case 'medium':
        return "👨‍🍳 Perfect cooking challenge! ";
      case 'hard':
        return "🏆 Master chef mode activated! ";
      default:
        return "";
    }
  }

  // Main method to get meal start message
  public getMealStartMessage(meal: DayMeal, config: MealMotivationConfig = {}): string {
    const greeting = this.getTimeBasedGreeting();
    const goalMessage = this.getGoalBasedMessage(config.fitnessGoals, meal);
    const typeMessage = this.getMealTypeMessage(meal.type, meal);
    const progressMessage = this.getProgressMessage(config);
    const difficultyMessage = this.getDifficultyMessage(meal.difficulty);
    
    // Combine messages intelligently
    return `${greeting}${difficultyMessage}${typeMessage}\n\n${goalMessage}\n\n${progressMessage}`;
  }

  // Cooking progress encouragement
  public getCookingProgressMessage(progress: number, meal: DayMeal): string {
    if (progress <= 0) {
      return "🚀 Let's get cooking! Time to create something amazing!";
    }
    if (progress <= 25) {
      return "👏 Great start! You're building momentum!";
    }
    if (progress <= 50) {
      return "🔥 Halfway there! Keep that energy flowing!";
    }
    if (progress <= 75) {
      return "⚡ Final stretch! Almost ready to feast!";
    }
    if (progress < 100) {
      return "🎯 So close! The finish line is in sight!";
    }
    return "🎉 Perfect! Your masterpiece is complete! Enjoy every bite!";
  }

  // Ingredient-based tips
  public getIngredientTips(ingredients: string[]): string[] {
    const tips: string[] = [];
    
    ingredients.forEach(ingredient => {
      const lowerIngredient = ingredient.toLowerCase();
      
      if (lowerIngredient.includes('paneer')) {
        tips.push("💡 Press paneer gently to remove excess water for better texture");
      }
      if (lowerIngredient.includes('spinach')) {
        tips.push("🥬 Don't overcook spinach - 2-3 minutes keeps nutrients intact");
      }
      if (lowerIngredient.includes('rice')) {
        tips.push("🍚 Perfect rice: 2:1 water ratio, bring to boil, then simmer");
      }
      if (lowerIngredient.includes('chicken')) {
        tips.push("🐔 Cook chicken to 165°F internal temperature for safety");
      }
      if (lowerIngredient.includes('egg')) {
        tips.push("🥚 Room temperature eggs cook more evenly");
      }
      if (lowerIngredient.includes('onion')) {
        tips.push("🧅 Cold knife and onions = fewer tears while chopping");
      }
      if (lowerIngredient.includes('garlic')) {
        tips.push("🧄 Crush garlic with flat knife side to release maximum flavor");
      }
      if (lowerIngredient.includes('tomato')) {
        tips.push("🍅 Score an X on bottom, blanch 30 seconds for easy peeling");
      }
    });
    
    return tips.slice(0, 2); // Return max 2 tips to avoid overwhelming
  }

  // Celebration messages for meal completion
  public getCompletionMessage(meal: DayMeal, config: MealMotivationConfig = {}): string {
    const celebrations = [
      "🎉 Fantastic! You've nailed another healthy meal!",
      "👨‍🍳 Chef's kiss! Your commitment to nutrition is inspiring!",
      "🌟 Brilliant! Your body is thanking you for this nourishment!",
      "💪 Outstanding! Another step towards your fitness goals!",
      "🏆 Excellent work! You're building amazing healthy habits!"
    ];
    
    const randomCelebration = celebrations[Math.floor(Math.random() * celebrations.length)];
    const goalBonus = this.getGoalBasedMessage(config.fitnessGoals, meal);
    
    return `${randomCelebration}\n\n${goalBonus}`;
  }

  // Pre-meal preparation tips
  public getPreparationTips(meal: DayMeal): string[] {
    const tips: string[] = [];
    const prepTime = meal.preparationTime || 15;
    
    tips.push(`⏱️ Set aside ${prepTime} minutes for focused cooking`);
    tips.push("🧼 Wash hands and clean workspace for food safety");
    
    if (meal.items && meal.items.length > 3) {
      tips.push("📋 Prep all ingredients first (mise en place)");
    }
    
    if (meal.difficulty === 'hard') {
      tips.push("📖 Read through all steps before starting");
    }
    
    if (meal.totalCalories && meal.totalCalories > 600) {
      tips.push("🍽️ Consider sharing this generous portion");
    }
    
    return tips;
  }
}

export const mealMotivationService = new MealMotivationService();