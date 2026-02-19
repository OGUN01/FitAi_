export * from "./types";
export * from "./exercises.service";
export * from "./workouts.service";
export * from "./preferences.service";
export * from "./stats.service";

import { ExercisesService } from "./exercises.service";
import { WorkoutsService } from "./workouts.service";
import { PreferencesService } from "./preferences.service";
import { StatsService } from "./stats.service";

class FitnessDataService {
  private static instance: FitnessDataService;
  private exercisesService: ExercisesService;
  private workoutsService: WorkoutsService;
  private preferencesService: PreferencesService;
  private statsService: StatsService;

  private constructor() {
    this.exercisesService = ExercisesService.getInstance();
    this.workoutsService = WorkoutsService.getInstance();
    this.preferencesService = PreferencesService.getInstance();
    this.statsService = StatsService.getInstance();
  }

  static getInstance(): FitnessDataService {
    if (!FitnessDataService.instance) {
      FitnessDataService.instance = new FitnessDataService();
    }
    return FitnessDataService.instance;
  }

  getExercises(...args: Parameters<ExercisesService["getExercises"]>) {
    return this.exercisesService.getExercises(...args);
  }

  getUserWorkouts(...args: Parameters<WorkoutsService["getUserWorkouts"]>) {
    return this.workoutsService.getUserWorkouts(...args);
  }

  createWorkout(...args: Parameters<WorkoutsService["createWorkout"]>) {
    return this.workoutsService.createWorkout(...args);
  }

  completeWorkout(...args: Parameters<WorkoutsService["completeWorkout"]>) {
    return this.workoutsService.completeWorkout(...args);
  }

  addExercisesToWorkout(
    ...args: Parameters<WorkoutsService["addExercisesToWorkout"]>
  ) {
    return this.workoutsService.addExercisesToWorkout(...args);
  }

  startWorkoutSession(
    ...args: Parameters<WorkoutsService["startWorkoutSession"]>
  ) {
    return this.workoutsService.startWorkoutSession(...args);
  }

  getUserWorkoutPreferences(
    ...args: Parameters<PreferencesService["getUserWorkoutPreferences"]>
  ) {
    return this.preferencesService.getUserWorkoutPreferences(...args);
  }

  getUserFitnessGoals(
    ...args: Parameters<PreferencesService["getUserFitnessGoals"]>
  ) {
    return this.preferencesService.getUserFitnessGoals(...args);
  }

  getWorkoutStats(...args: Parameters<StatsService["getWorkoutStats"]>) {
    return this.statsService.getWorkoutStats(...args);
  }

  async getRecommendedExercises(
    userId: string,
    workoutType?: string,
    limit: number = 5,
  ) {
    return this.exercisesService.getRecommendedExercises(
      userId,
      workoutType,
      limit,
      this.getUserWorkoutPreferences.bind(this),
      this.getUserFitnessGoals.bind(this),
    );
  }
}

export const fitnessDataService = FitnessDataService.getInstance();
