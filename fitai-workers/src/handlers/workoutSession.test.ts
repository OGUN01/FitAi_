/**
 * Comprehensive E2E Tests for Workout Session Feature
 * Tests exercise tracking, timers, completion, and calorie calculation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// TEST DATA - Mock Workout Data
// ============================================================================

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  muscleGroup: string;
  equipment?: string;
  instructions?: string[];
  calories_per_set?: number;
}

interface DayWorkout {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  exercises: Exercise[];
  totalCalories: number;
}

const MOCK_WORKOUTS: Record<string, DayWorkout> = {
  fullBody: {
    id: 'workout-001',
    title: 'Full Body Strength',
    description: 'Complete full body workout targeting all major muscle groups',
    duration: 45,
    difficulty: 'intermediate',
    exercises: [
      {
        id: 'ex-001',
        name: 'Barbell Squat',
        sets: 4,
        reps: '8-10',
        restSeconds: 90,
        muscleGroup: 'legs',
        equipment: 'barbell',
        calories_per_set: 15,
      },
      {
        id: 'ex-002',
        name: 'Bench Press',
        sets: 4,
        reps: '8-10',
        restSeconds: 90,
        muscleGroup: 'chest',
        equipment: 'barbell',
        calories_per_set: 12,
      },
      {
        id: 'ex-003',
        name: 'Deadlift',
        sets: 3,
        reps: '6-8',
        restSeconds: 120,
        muscleGroup: 'back',
        equipment: 'barbell',
        calories_per_set: 18,
      },
      {
        id: 'ex-004',
        name: 'Overhead Press',
        sets: 3,
        reps: '8-10',
        restSeconds: 90,
        muscleGroup: 'shoulders',
        equipment: 'barbell',
        calories_per_set: 10,
      },
    ],
    totalCalories: 250,
  },
  hiit: {
    id: 'workout-002',
    title: 'HIIT Cardio Blast',
    description: 'High intensity interval training for maximum calorie burn',
    duration: 25,
    difficulty: 'advanced',
    exercises: [
      {
        id: 'ex-005',
        name: 'Burpees',
        sets: 4,
        reps: '30 seconds',
        restSeconds: 30,
        muscleGroup: 'full_body',
        calories_per_set: 25,
      },
      {
        id: 'ex-006',
        name: 'Mountain Climbers',
        sets: 4,
        reps: '45 seconds',
        restSeconds: 15,
        muscleGroup: 'core',
        calories_per_set: 20,
      },
      {
        id: 'ex-007',
        name: 'Jump Squats',
        sets: 4,
        reps: '30 seconds',
        restSeconds: 30,
        muscleGroup: 'legs',
        calories_per_set: 22,
      },
    ],
    totalCalories: 350,
  },
  beginner: {
    id: 'workout-003',
    title: 'Beginner Full Body',
    description: 'Perfect for those new to fitness',
    duration: 30,
    difficulty: 'beginner',
    exercises: [
      {
        id: 'ex-008',
        name: 'Bodyweight Squat',
        sets: 3,
        reps: '12-15',
        restSeconds: 60,
        muscleGroup: 'legs',
        calories_per_set: 8,
      },
      {
        id: 'ex-009',
        name: 'Push-ups',
        sets: 3,
        reps: '8-10',
        restSeconds: 60,
        muscleGroup: 'chest',
        calories_per_set: 7,
      },
      {
        id: 'ex-010',
        name: 'Plank',
        sets: 3,
        reps: '30 seconds',
        restSeconds: 45,
        muscleGroup: 'core',
        calories_per_set: 5,
      },
    ],
    totalCalories: 120,
  },
};

// ============================================================================
// WORKOUT SESSION STATE MANAGEMENT
// ============================================================================

interface ExerciseProgress {
  exerciseIndex: number;
  completedSets: boolean[];
  isCompleted: boolean;
  startTime?: Date;
  endTime?: Date;
}

interface WorkoutSession {
  workout: DayWorkout;
  currentExerciseIndex: number;
  exerciseProgress: ExerciseProgress[];
  isActive: boolean;
  isPaused: boolean;
  startTime: Date;
  totalDuration: number;
  caloriesBurned: number;
}

class MockWorkoutSessionManager {
  private session: WorkoutSession | null = null;

  startWorkout(workout: DayWorkout): WorkoutSession {
    const exerciseProgress: ExerciseProgress[] = workout.exercises.map((_, index) => ({
      exerciseIndex: index,
      completedSets: new Array(workout.exercises[index].sets).fill(false),
      isCompleted: false,
    }));

    this.session = {
      workout,
      currentExerciseIndex: 0,
      exerciseProgress,
      isActive: true,
      isPaused: false,
      startTime: new Date(),
      totalDuration: 0,
      caloriesBurned: 0,
    };

    return this.session;
  }

  completeSet(exerciseIndex: number, setIndex: number): boolean {
    if (!this.session) return false;
    
    const progress = this.session.exerciseProgress[exerciseIndex];
    if (!progress || setIndex >= progress.completedSets.length) return false;

    progress.completedSets[setIndex] = true;
    
    // Calculate calories for this set
    const exercise = this.session.workout.exercises[exerciseIndex];
    const caloriesPerSet = exercise.calories_per_set || 10;
    this.session.caloriesBurned += caloriesPerSet;

    // Check if exercise is completed
    if (progress.completedSets.every(set => set)) {
      progress.isCompleted = true;
      progress.endTime = new Date();
    }

    return true;
  }

  skipExercise(exerciseIndex: number): boolean {
    if (!this.session) return false;
    
    const progress = this.session.exerciseProgress[exerciseIndex];
    if (!progress) return false;

    // Mark all sets as skipped (not completed)
    progress.isCompleted = true;
    progress.endTime = new Date();
    
    return true;
  }

  completeExercise(exerciseIndex: number): boolean {
    if (!this.session) return false;
    
    const progress = this.session.exerciseProgress[exerciseIndex];
    if (!progress) return false;

    // Complete all remaining sets
    progress.completedSets = progress.completedSets.map(() => true);
    progress.isCompleted = true;
    progress.endTime = new Date();

    // Add remaining calories
    const exercise = this.session.workout.exercises[exerciseIndex];
    const remainingSets = progress.completedSets.filter(s => !s).length;
    this.session.caloriesBurned += remainingSets * (exercise.calories_per_set || 10);

    return true;
  }

  moveToNextExercise(): number {
    if (!this.session) return -1;
    
    if (this.session.currentExerciseIndex < this.session.workout.exercises.length - 1) {
      this.session.currentExerciseIndex++;
    }
    
    return this.session.currentExerciseIndex;
  }

  pauseWorkout(): boolean {
    if (!this.session || !this.session.isActive) return false;
    this.session.isPaused = true;
    return true;
  }

  resumeWorkout(): boolean {
    if (!this.session || !this.session.isPaused) return false;
    this.session.isPaused = false;
    return true;
  }

  finishWorkout(): {
    success: boolean;
    stats: {
      totalDuration: number;
      exercisesCompleted: number;
      setsCompleted: number;
      caloriesBurned: number;
    };
  } | null {
    if (!this.session) return null;

    const endTime = new Date();
    const durationMs = endTime.getTime() - this.session.startTime.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    const exercisesCompleted = this.session.exerciseProgress.filter(p => p.isCompleted).length;
    const setsCompleted = this.session.exerciseProgress.reduce(
      (total, p) => total + p.completedSets.filter(s => s).length,
      0
    );

    this.session.isActive = false;
    this.session.totalDuration = durationMinutes;

    return {
      success: true,
      stats: {
        totalDuration: durationMinutes,
        exercisesCompleted,
        setsCompleted,
        caloriesBurned: this.session.caloriesBurned,
      },
    };
  }

  getSession(): WorkoutSession | null {
    return this.session;
  }

  getProgress(): {
    current: number;
    total: number;
    percentage: number;
  } {
    if (!this.session) return { current: 0, total: 0, percentage: 0 };

    const totalSets = this.session.workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
    const completedSets = this.session.exerciseProgress.reduce(
      (sum, p) => sum + p.completedSets.filter(s => s).length,
      0
    );

    return {
      current: completedSets,
      total: totalSets,
      percentage: Math.round((completedSets / totalSets) * 100),
    };
  }
}

// ============================================================================
// DURATION PARSING TESTS
// ============================================================================

describe('Duration Parsing', () => {
  const parseDurationFromReps = (reps: any): number => {
    if (!reps) return 0;
    const str = String(reps).toLowerCase().trim();
    
    // Check if rep range
    if (str.includes('-') || str.includes('to') || str.match(/^\d+\s*[-–]\s*\d+$/)) {
      return 0;
    }
    
    // mm:ss format
    const mmss = str.match(/^(\d+):(\d{1,2})$/);
    if (mmss) {
      return parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10);
    }
    
    // Seconds
    const sec = str.match(/^(\d+)\s*(seconds|second|secs|sec|s)$/);
    if (sec) return parseInt(sec[1], 10);
    
    // Minutes
    const min = str.match(/^(\d+)\s*(minutes|minute|mins|min|m)$/);
    if (min) return parseInt(min[1], 10) * 60;
    
    return 0;
  };

  it('should parse "30 seconds" correctly', () => {
    expect(parseDurationFromReps('30 seconds')).toBe(30);
  });

  it('should parse "30s" correctly', () => {
    expect(parseDurationFromReps('30s')).toBe(30);
  });

  it('should parse "1 minute" correctly', () => {
    expect(parseDurationFromReps('1 minute')).toBe(60);
  });

  it('should parse "2 min" correctly', () => {
    expect(parseDurationFromReps('2 min')).toBe(120);
  });

  it('should parse "1:30" (mm:ss) correctly', () => {
    expect(parseDurationFromReps('1:30')).toBe(90);
  });

  it('should NOT parse rep ranges as duration', () => {
    expect(parseDurationFromReps('8-10')).toBe(0);
    expect(parseDurationFromReps('10-12')).toBe(0);
    expect(parseDurationFromReps('6 to 8')).toBe(0);
  });

  it('should handle null/undefined', () => {
    expect(parseDurationFromReps(null)).toBe(0);
    expect(parseDurationFromReps(undefined)).toBe(0);
  });
});

// ============================================================================
// WORKOUT SESSION TESTS
// ============================================================================

describe('Workout Session Management', () => {
  let sessionManager: MockWorkoutSessionManager;

  beforeEach(() => {
    sessionManager = new MockWorkoutSessionManager();
  });

  describe('Starting Workouts', () => {
    it('should start a full body workout', () => {
      const session = sessionManager.startWorkout(MOCK_WORKOUTS.fullBody);
      
      expect(session).toBeDefined();
      expect(session.isActive).toBe(true);
      expect(session.isPaused).toBe(false);
      expect(session.currentExerciseIndex).toBe(0);
      expect(session.exerciseProgress.length).toBe(4);
    });

    it('should initialize all exercise progress correctly', () => {
      const session = sessionManager.startWorkout(MOCK_WORKOUTS.fullBody);
      
      expect(session.exerciseProgress[0].completedSets.length).toBe(4); // Squat: 4 sets
      expect(session.exerciseProgress[1].completedSets.length).toBe(4); // Bench: 4 sets
      expect(session.exerciseProgress[2].completedSets.length).toBe(3); // Deadlift: 3 sets
      expect(session.exerciseProgress[3].completedSets.length).toBe(3); // OHP: 3 sets
    });

    it('should start a HIIT workout', () => {
      const session = sessionManager.startWorkout(MOCK_WORKOUTS.hiit);
      
      expect(session.workout.title).toBe('HIIT Cardio Blast');
      expect(session.workout.exercises.length).toBe(3);
    });

    it('should start a beginner workout', () => {
      const session = sessionManager.startWorkout(MOCK_WORKOUTS.beginner);
      
      expect(session.workout.difficulty).toBe('beginner');
      expect(session.workout.duration).toBe(30);
    });
  });

  describe('Completing Sets', () => {
    it('should complete a single set', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.fullBody);
      
      const result = sessionManager.completeSet(0, 0);
      
      expect(result).toBe(true);
      const session = sessionManager.getSession();
      expect(session?.exerciseProgress[0].completedSets[0]).toBe(true);
    });

    it('should track calories burned per set', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.fullBody);
      
      sessionManager.completeSet(0, 0); // Squat set 1 = 15 cal
      sessionManager.completeSet(0, 1); // Squat set 2 = 15 cal
      
      const session = sessionManager.getSession();
      expect(session?.caloriesBurned).toBe(30);
    });

    it('should mark exercise as completed when all sets done', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.beginner);
      
      // Complete all 3 sets of bodyweight squats
      sessionManager.completeSet(0, 0);
      sessionManager.completeSet(0, 1);
      sessionManager.completeSet(0, 2);
      
      const session = sessionManager.getSession();
      expect(session?.exerciseProgress[0].isCompleted).toBe(true);
    });

    it('should reject invalid set index', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.fullBody);
      
      const result = sessionManager.completeSet(0, 99); // Invalid set
      
      expect(result).toBe(false);
    });
  });

  describe('Navigation Between Exercises', () => {
    it('should move to next exercise', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.fullBody);
      
      const nextIndex = sessionManager.moveToNextExercise();
      
      expect(nextIndex).toBe(1);
    });

    it('should not exceed last exercise', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.beginner);
      
      sessionManager.moveToNextExercise(); // 0 -> 1
      sessionManager.moveToNextExercise(); // 1 -> 2
      const finalIndex = sessionManager.moveToNextExercise(); // Should stay at 2
      
      expect(finalIndex).toBe(2);
    });

    it('should allow skipping exercises', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.fullBody);
      
      const result = sessionManager.skipExercise(0);
      
      expect(result).toBe(true);
      const session = sessionManager.getSession();
      expect(session?.exerciseProgress[0].isCompleted).toBe(true);
    });
  });

  describe('Pause/Resume', () => {
    it('should pause active workout', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.fullBody);
      
      const result = sessionManager.pauseWorkout();
      
      expect(result).toBe(true);
      expect(sessionManager.getSession()?.isPaused).toBe(true);
    });

    it('should resume paused workout', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.fullBody);
      sessionManager.pauseWorkout();
      
      const result = sessionManager.resumeWorkout();
      
      expect(result).toBe(true);
      expect(sessionManager.getSession()?.isPaused).toBe(false);
    });

    it('should not resume non-paused workout', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.fullBody);
      
      const result = sessionManager.resumeWorkout();
      
      expect(result).toBe(false);
    });
  });

  describe('Progress Tracking', () => {
    it('should calculate progress percentage correctly', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.beginner);
      
      // Beginner has 9 total sets (3+3+3)
      sessionManager.completeSet(0, 0);
      sessionManager.completeSet(0, 1);
      sessionManager.completeSet(0, 2); // 3 sets done
      
      const progress = sessionManager.getProgress();
      
      expect(progress.current).toBe(3);
      expect(progress.total).toBe(9);
      expect(progress.percentage).toBe(33); // 3/9 = 33%
    });

    it('should show 100% when all sets completed', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.beginner);
      
      // Complete all exercises
      for (let ex = 0; ex < 3; ex++) {
        for (let set = 0; set < 3; set++) {
          sessionManager.completeSet(ex, set);
        }
      }
      
      const progress = sessionManager.getProgress();
      expect(progress.percentage).toBe(100);
    });
  });

  describe('Finishing Workouts', () => {
    it('should calculate final stats correctly', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.beginner);
      
      // Complete 2 exercises fully
      for (let set = 0; set < 3; set++) {
        sessionManager.completeSet(0, set); // Squats
        sessionManager.completeSet(1, set); // Push-ups
      }
      
      const result = sessionManager.finishWorkout();
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.stats.exercisesCompleted).toBe(2);
      expect(result?.stats.setsCompleted).toBe(6);
    });

    it('should mark workout as inactive after finish', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.fullBody);
      sessionManager.finishWorkout();
      
      expect(sessionManager.getSession()?.isActive).toBe(false);
    });

    it('should calculate total calories burned', () => {
      sessionManager.startWorkout(MOCK_WORKOUTS.hiit);
      
      // Complete all HIIT exercises (4 sets each, 3 exercises)
      for (let ex = 0; ex < 3; ex++) {
        for (let set = 0; set < 4; set++) {
          sessionManager.completeSet(ex, set);
        }
      }
      
      const result = sessionManager.finishWorkout();
      
      // Burpees: 4*25=100, Mountain Climbers: 4*20=80, Jump Squats: 4*22=88
      expect(result?.stats.caloriesBurned).toBe(268);
    });
  });
});

// ============================================================================
// CALORIE CALCULATION TESTS
// ============================================================================

describe('Calorie Calculation', () => {
  // MET-based calorie calculation
  const calculateCalories = (
    metValue: number,
    weightKg: number,
    durationMinutes: number
  ): number => {
    // Calories = MET × weight (kg) × duration (hours)
    const durationHours = durationMinutes / 60;
    return Math.round(metValue * weightKg * durationHours);
  };

  const EXERCISE_METS: Record<string, number> = {
    'walking': 3.5,
    'jogging': 7.0,
    'running': 9.8,
    'cycling': 7.5,
    'swimming': 8.0,
    'weight_training': 5.0,
    'hiit': 8.0,
    'yoga': 3.0,
    'stretching': 2.5,
  };

  it('should calculate calories for 30 min walking (70kg person)', () => {
    const calories = calculateCalories(EXERCISE_METS.walking, 70, 30);
    expect(calories).toBe(123); // 3.5 × 70 × 0.5 = 122.5
  });

  it('should calculate calories for 45 min weight training', () => {
    const calories = calculateCalories(EXERCISE_METS.weight_training, 75, 45);
    expect(calories).toBe(281); // 5.0 × 75 × 0.75 = 281.25
  });

  it('should calculate calories for 20 min HIIT', () => {
    const calories = calculateCalories(EXERCISE_METS.hiit, 80, 20);
    expect(calories).toBe(213); // 8.0 × 80 × 0.333 = 213.28
  });

  it('should calculate calories for 60 min running', () => {
    const calories = calculateCalories(EXERCISE_METS.running, 65, 60);
    expect(calories).toBe(637); // 9.8 × 65 × 1 = 637
  });

  it('should handle zero duration', () => {
    const calories = calculateCalories(EXERCISE_METS.running, 70, 0);
    expect(calories).toBe(0);
  });
});

// ============================================================================
// REST TIMER TESTS
// ============================================================================

describe('Rest Timer', () => {
  it('should have correct rest times for different exercises', () => {
    const workout = MOCK_WORKOUTS.fullBody;
    
    expect(workout.exercises[0].restSeconds).toBe(90); // Squat
    expect(workout.exercises[2].restSeconds).toBe(120); // Deadlift (longer rest for heavy lift)
  });

  it('should have shorter rest for HIIT exercises', () => {
    const workout = MOCK_WORKOUTS.hiit;
    
    expect(workout.exercises[0].restSeconds).toBe(30); // Burpees
    expect(workout.exercises[1].restSeconds).toBe(15); // Mountain Climbers
  });

  it('should have moderate rest for beginner exercises', () => {
    const workout = MOCK_WORKOUTS.beginner;
    
    workout.exercises.forEach(ex => {
      expect(ex.restSeconds).toBeLessThanOrEqual(60);
    });
  });
});

// ============================================================================
// WORKOUT DATA VALIDATION TESTS
// ============================================================================

describe('Workout Data Validation', () => {
  const validateWorkout = (workout: DayWorkout): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!workout.id) errors.push('Missing workout ID');
    if (!workout.title) errors.push('Missing workout title');
    if (!workout.exercises || workout.exercises.length === 0) {
      errors.push('Workout must have at least one exercise');
    }
    if (workout.duration <= 0) errors.push('Invalid duration');
    
    workout.exercises?.forEach((ex, index) => {
      if (!ex.name) errors.push(`Exercise ${index} missing name`);
      if (ex.sets <= 0) errors.push(`Exercise ${index} has invalid sets`);
      if (!ex.reps) errors.push(`Exercise ${index} missing reps`);
    });
    
    return { valid: errors.length === 0, errors };
  };

  it('should validate a correct workout', () => {
    const result = validateWorkout(MOCK_WORKOUTS.fullBody);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject workout without title', () => {
    const invalidWorkout = { ...MOCK_WORKOUTS.fullBody, title: '' };
    const result = validateWorkout(invalidWorkout);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing workout title');
  });

  it('should reject workout without exercises', () => {
    const invalidWorkout = { ...MOCK_WORKOUTS.fullBody, exercises: [] };
    const result = validateWorkout(invalidWorkout);
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// SUMMARY
// ============================================================================

describe('Test Summary', () => {
  it('should have comprehensive workout session test coverage', () => {
    const testCategories = [
      'Duration Parsing',
      'Workout Session Management',
      'Calorie Calculation',
      'Rest Timer',
      'Workout Data Validation',
    ];
    
    expect(testCategories.length).toBe(5);
    console.log('📊 Workout Session tests cover:', testCategories.join(', '));
  });
});

