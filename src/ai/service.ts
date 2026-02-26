import { PersonalInfo, FitnessGoals, BodyMetrics } from "../types/user";
import { MotivationalContent, AIResponse } from "../types/ai";
import { AIServiceMetadata } from "./types";
import { fitaiWorkersClient } from "../services/fitaiWorkersClient";
import * as workoutGen from "./workoutGeneration";
import * as mealGen from "./mealGeneration";
import * as asyncJob from "./asyncJobHandling";

class UnifiedAIService {
  private lastMetadata: AIServiceMetadata | null = null;

  async isRealAIAvailable(): Promise<boolean> {
    try {
      const status = await fitaiWorkersClient.testConnection();
      return status.connected && status.authenticated;
    } catch {
      return false;
    }
  }

  getLastMetadata(): AIServiceMetadata | null {
    return this.lastMetadata;
  }

  private updateMetadata = (metadata: AIServiceMetadata) => {
    this.lastMetadata = metadata;
  };

  async generateWorkout(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    preferences?: Parameters<typeof workoutGen.generateWorkout>[2],
  ) {
    return workoutGen.generateWorkout(
      personalInfo,
      fitnessGoals,
      preferences || {},
      this.updateMetadata,
    );
  }

  async generateWeeklyWorkoutPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    weekNumber: number = 1,
    options?: Parameters<typeof workoutGen.generateWeeklyWorkoutPlan>[3],
  ) {
    return workoutGen.generateWeeklyWorkoutPlan(
      personalInfo,
      fitnessGoals,
      weekNumber,
      options || {},
      this.updateMetadata,
    );
  }

  async generateMeal(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    mealType: "breakfast" | "lunch" | "dinner" | "snack",
    preferences?: Parameters<typeof mealGen.generateMeal>[3],
  ) {
    return mealGen.generateMeal(
      personalInfo,
      fitnessGoals,
      mealType,
      preferences || {},
      this.updateMetadata,
    );
  }

  async generateDailyMealPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    preferences?: Parameters<typeof mealGen.generateDailyMealPlan>[2],
  ) {
    return mealGen.generateDailyMealPlan(
      personalInfo,
      fitnessGoals,
      preferences || {},
      this.updateMetadata,
    );
  }

  async generateWeeklyMealPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    weekNumber: number = 1,
    options?: Parameters<typeof mealGen.generateWeeklyMealPlan>[3],
  ) {
    return mealGen.generateWeeklyMealPlan(
      personalInfo,
      fitnessGoals,
      weekNumber,
      options || {},
      this.updateMetadata,
    );
  }

  async generateWeeklyMealPlanAsync(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    weekNumber: number = 1,
    options?: Parameters<typeof asyncJob.generateWeeklyMealPlanAsync>[3],
  ) {
    return asyncJob.generateWeeklyMealPlanAsync(
      personalInfo,
      fitnessGoals,
      weekNumber,
      options || {},
      this.updateMetadata,
    );
  }

  async checkMealPlanJobStatus(jobId: string, weekNumber: number = 1) {
    return asyncJob.checkMealPlanJobStatus(jobId, weekNumber);
  }

  async generateMotivationalContent(
    personalInfo: PersonalInfo,
    currentStreak: number = 0,
  ): Promise<AIResponse<MotivationalContent>> {
    return {
      success: true,
      data: {
        dailyTip: {
          icon: "💡",
          title: "Daily Fitness Tip",
          content: "Stay hydrated and remember to warm up before your workout.",
          category: "exercise" as const,
        },
        encouragement: {
          message:
            currentStreak > 0
              ? `Amazing! You're on a ${currentStreak}-day streak!`
              : "Today is a great day to start your fitness journey!",
          emoji: "💪",
          tone: "energetic" as const,
        },
        challenge: {
          title: "Weekly Consistency Challenge",
          description: "Complete all planned workouts this week",
          reward: "Achievement unlocked!",
          duration: "7 days",
          difficulty: "medium" as const,
        },
        quote: {
          text: "Every rep counts! Keep pushing toward your goals.",
          author: "FitAI",
          context: "fitness motivation",
        },
        factOfTheDay: {
          fact: "Regular exercise can boost your mood and energy levels throughout the day.",
          source: "Health Research",
        },
        personalizedMessage: {
          content:
            currentStreak > 0
              ? `You're making great progress! Keep up the ${currentStreak}-day streak!`
              : "Start today and build momentum towards your fitness goals!",
          basedOn: "current_streak",
        },
      },
    };
  }

  async testConnection(): Promise<AIResponse<string>> {

    try {
      const status = await fitaiWorkersClient.testConnection();

      if (!status.connected) {
        return {
          success: false,
          error: status.error || "Backend not reachable",
          data: "Connection failed",
        };
      }

      if (!status.authenticated) {
        return {
          success: false,
          error: status.error || "User not authenticated",
          data: "Authentication required",
        };
      }

      return {
        success: true,
        data: `Connected to FitAI Workers ${status.backendVersion}`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Connection test failed",
        data: "Error during connection test",
      };
    }
  }

  getAIStatus(): {
    isAvailable: boolean;
    mode: "real" | "demo";
    message: string;
    modelVersion?: string;
  } {
    return {
      isAvailable: true,
      mode: "real",
      modelVersion: "google/gemini-2.0-flash-exp",
      message:
        "✅ Connected to FitAI Workers backend (https://fitai-workers.sharmaharsh9887.workers.dev)",
    };
  }
}

export const aiService = new UnifiedAIService();
export default aiService;
