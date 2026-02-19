import { EventEmitter } from "./event-emitter";
import { completeWorkout } from "./workout-completion";
import { completeMeal } from "./meal-completion";
import { updateWorkoutProgress, updateMealProgress } from "./progress-tracking";
import {
  getCompletionStats,
  getTodaysCompletions,
  completeAllToday,
} from "./stats-calculator";
import {
  CompletionEvent,
  CompletionListener,
  CompletionStats,
  TodaysCompletions,
} from "./types";

class CompletionTrackingService {
  private emitter = new EventEmitter();

  subscribe(listener: CompletionListener): () => void {
    return this.emitter.subscribe(listener);
  }

  async completeWorkout(
    workoutId: string,
    sessionData?: any,
    userId?: string,
  ): Promise<boolean> {
    return completeWorkout(this.emitter, workoutId, sessionData, userId);
  }

  async completeMeal(
    mealId: string,
    logData?: any,
    userId?: string,
  ): Promise<boolean> {
    return completeMeal(this.emitter, mealId, logData, userId);
  }

  async updateWorkoutProgress(
    workoutId: string,
    progress: number,
    exerciseData?: any,
    userId?: string,
  ): Promise<boolean> {
    return updateWorkoutProgress(
      this.emitter,
      workoutId,
      progress,
      exerciseData,
      userId,
    );
  }

  async updateMealProgress(
    mealId: string,
    progress: number,
    ingredientData?: any,
  ): Promise<boolean> {
    return updateMealProgress(this.emitter, mealId, progress, ingredientData);
  }

  getCompletionStats(): CompletionStats {
    return getCompletionStats();
  }

  getTodaysCompletions(): TodaysCompletions {
    return getTodaysCompletions();
  }

  async completeAllToday(): Promise<void> {
    return completeAllToday(this.emitter);
  }
}

export const completionTrackingService = new CompletionTrackingService();
export default completionTrackingService;

export type {
  CompletionEvent,
  CompletionListener,
  CompletionStats,
  TodaysCompletions,
};
