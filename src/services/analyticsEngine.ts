// Advanced Analytics Engine for FitAI
// Comprehensive fitness analytics with predictive insights and trend analysis

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventEmitter } from '../utils/EventEmitter';

export interface FitnessMetrics {
  date: string;
  workoutCount: number;
  totalWorkoutTime: number; // minutes
  caloriesBurned: number;
  averageHeartRate?: number;
  steps: number;
  distance: number; // km
  activeMinutes: number;
  restingHeartRate?: number;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  sleepHours: number;
  sleepQuality?: number; // 1-10
  stressLevel?: number; // 1-10
  energyLevel?: number; // 1-10
  mood?: number; // 1-10
  waterIntake: number; // liters
  nutritionScore?: number; // 1-100
}

export interface WorkoutAnalytics {
  totalWorkouts: number;
  averageWorkoutsPerWeek: number;
  totalWorkoutTime: number;
  averageWorkoutDuration: number;
  favoriteWorkoutType: string;
  strongestMuscleGroup: string;
  improvementAreas: string[];
  consistencyScore: number; // 1-100
  progressTrend: 'improving' | 'maintaining' | 'declining';
  weeklyGoalCompletion: number; // percentage
  streakCurrent: number;
  streakLongest: number;
  caloriesBurnedTotal: number;
  caloriesBurnedAverage: number;
  workoutTypeDistribution: Record<string, number>;
}

export interface NutritionAnalytics {
  averageCaloriesPerDay: number;
  averageMacros: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  nutritionScore: number; // 1-100
  mealLoggingConsistency: number; // percentage
  waterIntakeAverage: number;
  deficiencies: string[];
  improvements: string[];
  mealTimingScore: number; // 1-100
  varietyScore: number; // 1-100
  processingScore: number; // 1-100 (lower = more whole foods)
}

export interface BodyCompositionAnalytics {
  weightTrend: 'losing' | 'gaining' | 'maintaining';
  weightChangeRate: number; // kg per week
  bodyFatTrend?: 'decreasing' | 'increasing' | 'stable';
  muscleMassTrend?: 'gaining' | 'losing' | 'stable';
  bmiCategory: string;
  progressTowardsGoal: number; // percentage
  predictedGoalDate?: string;
  recommendedWeightRange: { min: number; max: number };
}

export interface SleepWellnessAnalytics {
  averageSleepHours: number;
  sleepConsistency: number; // 1-100
  sleepQualityTrend: 'improving' | 'declining' | 'stable';
  optimalBedtime: string;
  sleepDebt: number; // hours
  recoveryScore: number; // 1-100
  stressLevelTrend: 'improving' | 'worsening' | 'stable';
  energyLevelTrend: 'improving' | 'declining' | 'stable';
}

export interface PredictiveInsights {
  goalAchievementProbability: number; // percentage
  estimatedGoalDate?: string;
  recommendedAdjustments: string[];
  riskFactors: string[];
  strengthAreas: string[];
  nextMilestone: {
    description: string;
    estimatedDate: string;
    confidence: number; // percentage
  };
  performancePrediction: {
    nextWeek: 'better' | 'similar' | 'worse';
    confidence: number;
    reasoning: string[];
  };
  // Additional property used in HomeScreen
  plateauRisk?: string;
}

export interface ComprehensiveAnalytics {
  period: 'week' | 'month' | 'quarter' | 'year';
  dateRange: { start: string; end: string };
  workout: WorkoutAnalytics;
  nutrition: NutritionAnalytics;
  bodyComposition: BodyCompositionAnalytics;
  sleepWellness: SleepWellnessAnalytics;
  predictiveInsights: PredictiveInsights;
  overallScore: number; // 1-100
  improvementSuggestions: string[];
  achievements: string[];
  trends: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
}

class AnalyticsEngine extends EventEmitter {
  private readonly STORAGE_KEY = 'fitai_analytics_data';
  private readonly METRICS_HISTORY_KEY = 'fitai_metrics_history';
  
  private metricsHistory: FitnessMetrics[] = [];
  private isInitialized = false;

  constructor() {
    super();
    this.initializeAnalytics();
  }

  /**
   * Initialize analytics engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.initializeAnalytics();
  }

  /**
   * Initialize the analytics system
   */
  private async initializeAnalytics(): Promise<void> {
    console.log('📊 Initializing FitAI Analytics Engine...');
    
    try {
      await this.loadMetricsHistory();
      this.isInitialized = true;
      console.log(`✅ Analytics Engine initialized with ${this.metricsHistory.length} data points`);
    } catch (error) {
      console.error('❌ Analytics initialization failed:', error);
    }
  }

  /**
   * Add daily metrics data
   */
  async addDailyMetrics(metrics: FitnessMetrics): Promise<void> {
    try {
      // Remove existing data for the same date
      this.metricsHistory = this.metricsHistory.filter(m => m.date !== metrics.date);
      
      // Add new metrics
      this.metricsHistory.push(metrics);
      
      // Sort by date (newest first)
      this.metricsHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Keep only last 365 days
      this.metricsHistory = this.metricsHistory.slice(0, 365);
      
      // Save to storage
      await this.saveMetricsHistory();
      
      // Emit analytics update event
      this.emit('metricsUpdated', metrics);
      
      console.log(`📈 Daily metrics added for ${metrics.date}`);
    } catch (error) {
      console.error('❌ Error adding daily metrics:', error);
    }
  }

  /**
   * Generate comprehensive analytics for a period
   */
  async generateAnalytics(
    period: 'week' | 'month' | 'quarter' | 'year' = 'month',
    endDate: Date = new Date()
  ): Promise<ComprehensiveAnalytics> {
    const dateRange = this.getDateRange(period, endDate);
    const relevantMetrics = this.getMetricsInRange(dateRange.start, dateRange.end);
    
    if (relevantMetrics.length === 0) {
      throw new Error('Insufficient data for analytics generation');
    }

    console.log(`📊 Generating ${period} analytics with ${relevantMetrics.length} data points...`);

    const analytics: ComprehensiveAnalytics = {
      period,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
      workout: this.analyzeWorkouts(relevantMetrics),
      nutrition: this.analyzeNutrition(relevantMetrics),
      bodyComposition: this.analyzeBodyComposition(relevantMetrics),
      sleepWellness: this.analyzeSleepWellness(relevantMetrics),
      predictiveInsights: await this.generatePredictiveInsights(relevantMetrics),
      overallScore: 0, // Will be calculated
      improvementSuggestions: [],
      achievements: [],
      trends: { positive: [], negative: [], neutral: [] },
    };

    // Calculate overall score and trends
    analytics.overallScore = this.calculateOverallScore(analytics);
    analytics.improvementSuggestions = this.generateImprovementSuggestions(analytics);
    analytics.achievements = this.identifyAchievements(relevantMetrics);
    analytics.trends = this.analyzeTrends(relevantMetrics);

    console.log(`✅ Analytics generated - Overall Score: ${analytics.overallScore}/100`);
    
    return analytics;
  }

  /**
   * Analyze workout patterns and performance
   */
  private analyzeWorkouts(metrics: FitnessMetrics[]): WorkoutAnalytics {
    const totalWorkouts = metrics.reduce((sum, m) => sum + m.workoutCount, 0);
    const totalWorkoutTime = metrics.reduce((sum, m) => sum + m.totalWorkoutTime, 0);
    const totalCalories = metrics.reduce((sum, m) => sum + m.caloriesBurned, 0);
    
    const daysWithWorkouts = metrics.filter(m => m.workoutCount > 0).length;
    const averageWorkoutsPerWeek = (totalWorkouts / metrics.length) * 7;
    const averageWorkoutDuration = totalWorkouts > 0 ? totalWorkoutTime / totalWorkouts : 0;
    
    // Calculate consistency score
    const workoutDays = metrics.map(m => m.workoutCount > 0 ? 1 : 0);
    const consistencyScore = this.calculateConsistencyScore(workoutDays);
    
    // Analyze trends
    const recentWorkouts = metrics.slice(0, Math.floor(metrics.length / 3));
    const olderWorkouts = metrics.slice(Math.floor(metrics.length * 2 / 3));
    const recentAvg = recentWorkouts.reduce((sum, m) => sum + m.workoutCount, 0) / recentWorkouts.length;
    const olderAvg = olderWorkouts.reduce((sum, m) => sum + m.workoutCount, 0) / olderWorkouts.length;
    
    let progressTrend: 'improving' | 'maintaining' | 'declining' = 'maintaining';
    if (recentAvg > olderAvg * 1.1) progressTrend = 'improving';
    else if (recentAvg < olderAvg * 0.9) progressTrend = 'declining';
    
    // Calculate streaks
    const { currentStreak, longestStreak } = this.calculateWorkoutStreaks(metrics);

    return {
      totalWorkouts,
      averageWorkoutsPerWeek,
      totalWorkoutTime,
      averageWorkoutDuration,
      favoriteWorkoutType: 'Strength Training', // Would be determined from workout data
      strongestMuscleGroup: 'Upper Body', // Would be determined from workout data
      improvementAreas: ['Flexibility', 'Cardio Endurance'],
      consistencyScore,
      progressTrend,
      weeklyGoalCompletion: Math.min(100, (averageWorkoutsPerWeek / 3) * 100), // Assuming goal of 3x/week
      streakCurrent: currentStreak,
      streakLongest: longestStreak,
      caloriesBurnedTotal: totalCalories,
      caloriesBurnedAverage: totalCalories / metrics.length,
      workoutTypeDistribution: {
        'Strength': 40,
        'Cardio': 35,
        'Flexibility': 15,
        'HIIT': 10,
      },
    };
  }

  /**
   * Analyze nutrition patterns and quality
   */
  private analyzeNutrition(metrics: FitnessMetrics[]): NutritionAnalytics {
    const nutritionScores = metrics.filter(m => m.nutritionScore).map(m => m.nutritionScore!);
    const waterIntakes = metrics.map(m => m.waterIntake);
    
    const avgNutritionScore = nutritionScores.length > 0 
      ? nutritionScores.reduce((sum, score) => sum + score, 0) / nutritionScores.length 
      : 75;
    
    const avgWaterIntake = waterIntakes.reduce((sum, water) => sum + water, 0) / waterIntakes.length;
    
    // Mock macro analysis (would come from detailed nutrition data)
    const averageMacros = {
      protein: 120, // grams
      carbs: 200,
      fat: 70,
      fiber: 25,
    };

    return {
      averageCaloriesPerDay: 2000, // Would be calculated from meal data
      averageMacros,
      nutritionScore: avgNutritionScore,
      mealLoggingConsistency: 85, // Percentage of days with logged meals
      waterIntakeAverage: avgWaterIntake,
      deficiencies: avgWaterIntake < 2.5 ? ['Hydration'] : [],
      improvements: avgNutritionScore > 80 ? ['Balanced Macros'] : [],
      mealTimingScore: 80,
      varietyScore: 85,
      processingScore: 75, // Lower = more whole foods
    };
  }

  /**
   * Analyze body composition changes
   */
  private analyzeBodyComposition(metrics: FitnessMetrics[]): BodyCompositionAnalytics {
    const weights = metrics.filter(m => m.weight).map(m => ({ date: m.date, weight: m.weight! }));
    
    if (weights.length === 0) {
      return {
        weightTrend: 'maintaining',
        weightChangeRate: 0,
        bmiCategory: 'Normal',
        progressTowardsGoal: 0,
        recommendedWeightRange: { min: 60, max: 80 },
      };
    }

    // Calculate weight trend
    const recentWeights = weights.slice(0, Math.min(7, weights.length));
    const olderWeights = weights.slice(-Math.min(7, weights.length));
    
    const recentAvg = recentWeights.reduce((sum, w) => sum + w.weight, 0) / recentWeights.length;
    const olderAvg = olderWeights.reduce((sum, w) => sum + w.weight, 0) / olderWeights.length;
    
    let weightTrend: 'losing' | 'gaining' | 'maintaining' = 'maintaining';
    if (recentAvg < olderAvg - 0.5) weightTrend = 'losing';
    else if (recentAvg > olderAvg + 0.5) weightTrend = 'gaining';
    
    const weightChangeRate = (recentAvg - olderAvg) / (weights.length / 7); // per week
    
    // BMI calculation (assuming height of 170cm for demo)
    const currentWeight = weights[0].weight;
    const height = 1.7; // meters
    const bmi = currentWeight / (height * height);
    
    let bmiCategory = 'Normal';
    if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi >= 25) bmiCategory = 'Overweight';
    else if (bmi >= 30) bmiCategory = 'Obese';

    return {
      weightTrend,
      weightChangeRate,
      bodyFatTrend: 'stable',
      muscleMassTrend: 'stable',
      bmiCategory,
      progressTowardsGoal: 75, // Mock progress
      predictedGoalDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
      recommendedWeightRange: { min: currentWeight - 5, max: currentWeight + 5 },
    };
  }

  /**
   * Analyze sleep and wellness patterns
   */
  private analyzeSleepWellness(metrics: FitnessMetrics[]): SleepWellnessAnalytics {
    const sleepHours = metrics.map(m => m.sleepHours);
    const sleepQualities = metrics.filter(m => m.sleepQuality).map(m => m.sleepQuality!);
    const stressLevels = metrics.filter(m => m.stressLevel).map(m => m.stressLevel!);
    const energyLevels = metrics.filter(m => m.energyLevel).map(m => m.energyLevel!);
    
    const avgSleepHours = sleepHours.reduce((sum, hours) => sum + hours, 0) / sleepHours.length;
    const avgSleepQuality = sleepQualities.length > 0 
      ? sleepQualities.reduce((sum, quality) => sum + quality, 0) / sleepQualities.length 
      : 7;
    
    // Calculate sleep consistency (how consistent sleep duration is)
    const sleepVariance = this.calculateVariance(sleepHours);
    const sleepConsistency = Math.max(0, 100 - (sleepVariance * 10));
    
    // Sleep debt calculation (assuming 8 hours optimal)
    const optimalSleep = 8;
    const sleepDebt = Math.max(0, (optimalSleep - avgSleepHours) * sleepHours.length);
    
    // Recovery score based on sleep, stress, and energy
    const avgStress = stressLevels.length > 0 
      ? stressLevels.reduce((sum, stress) => sum + stress, 0) / stressLevels.length 
      : 5;
    const avgEnergy = energyLevels.length > 0 
      ? energyLevels.reduce((sum, energy) => sum + energy, 0) / energyLevels.length 
      : 7;
    
    const recoveryScore = Math.round(
      (avgSleepQuality * 10 + (10 - avgStress) * 10 + avgEnergy * 10) / 3
    );

    return {
      averageSleepHours: avgSleepHours,
      sleepConsistency: Math.round(sleepConsistency),
      sleepQualityTrend: 'stable',
      optimalBedtime: '22:30',
      sleepDebt: Math.round(sleepDebt),
      recoveryScore,
      stressLevelTrend: 'stable',
      energyLevelTrend: 'stable',
    };
  }

  /**
   * Generate predictive insights using trend analysis
   */
  private async generatePredictiveInsights(metrics: FitnessMetrics[]): Promise<PredictiveInsights> {
    // Analyze current trends to predict future performance
    const workoutTrend = this.analyzeTrendDirection(metrics.map(m => m.workoutCount));
    const weightTrend = this.analyzeTrendDirection(
      metrics.filter(m => m.weight).map(m => m.weight!)
    );
    
    // Goal achievement probability based on current progress
    let goalAchievementProbability = 75; // Base probability
    
    if (workoutTrend > 0.1) goalAchievementProbability += 15;
    else if (workoutTrend < -0.1) goalAchievementProbability -= 15;
    
    // Estimate goal achievement date
    const estimatedDays = Math.max(30, 90 - (goalAchievementProbability - 50) * 2);
    const estimatedGoalDate = new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000);
    
    // Performance prediction for next week
    let nextWeekPrediction: 'better' | 'similar' | 'worse' = 'similar';
    let confidence = 70;
    
    if (workoutTrend > 0.2) {
      nextWeekPrediction = 'better';
      confidence = 85;
    } else if (workoutTrend < -0.2) {
      nextWeekPrediction = 'worse';
      confidence = 80;
    }

    return {
      goalAchievementProbability: Math.min(95, Math.max(5, goalAchievementProbability)),
      estimatedGoalDate: estimatedGoalDate.toISOString(),
      recommendedAdjustments: [
        'Increase workout frequency by 1 session per week',
        'Focus on protein intake post-workout',
        'Maintain consistent sleep schedule',
      ],
      riskFactors: workoutTrend < -0.1 ? ['Decreasing workout frequency'] : [],
      strengthAreas: ['Consistency in tracking', 'Balanced approach'],
      nextMilestone: {
        description: '10-workout milestone',
        estimatedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 80,
      },
      performancePrediction: {
        nextWeek: nextWeekPrediction,
        confidence,
        reasoning: [
          `Current workout trend: ${workoutTrend > 0 ? 'positive' : workoutTrend < 0 ? 'negative' : 'stable'}`,
          'Based on recent consistency patterns',
        ],
      },
    };
  }

  /**
   * Calculate overall fitness score
   */
  private calculateOverallScore(analytics: ComprehensiveAnalytics): number {
    const weights = {
      workout: 0.3,
      nutrition: 0.25,
      sleep: 0.2,
      bodyComposition: 0.15,
      consistency: 0.1,
    };

    const scores = {
      workout: analytics.workout.consistencyScore,
      nutrition: analytics.nutrition.nutritionScore,
      sleep: analytics.sleepWellness.recoveryScore,
      bodyComposition: analytics.bodyComposition.progressTowardsGoal,
      consistency: analytics.workout.consistencyScore,
    };

    const overallScore = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (scores[key as keyof typeof scores] * weight);
    }, 0);

    return Math.round(Math.min(100, Math.max(0, overallScore)));
  }

  /**
   * Generate personalized improvement suggestions
   */
  private generateImprovementSuggestions(analytics: ComprehensiveAnalytics): string[] {
    const suggestions: string[] = [];

    // Workout suggestions
    if (analytics.workout.consistencyScore < 70) {
      suggestions.push('🏋️ Try scheduling workouts at the same time each day for better consistency');
    }
    if (analytics.workout.averageWorkoutsPerWeek < 3) {
      suggestions.push('💪 Aim for at least 3 workouts per week to maintain fitness gains');
    }

    // Nutrition suggestions
    if (analytics.nutrition.nutritionScore < 75) {
      suggestions.push('🥗 Focus on adding more whole foods and vegetables to your meals');
    }
    if (analytics.nutrition.waterIntakeAverage < 2.5) {
      suggestions.push('💧 Increase water intake to at least 2.5 liters per day');
    }

    // Sleep suggestions
    if (analytics.sleepWellness.averageSleepHours < 7) {
      suggestions.push('😴 Prioritize getting 7-9 hours of sleep for optimal recovery');
    }
    if (analytics.sleepWellness.sleepConsistency < 70) {
      suggestions.push('🕒 Try to maintain a consistent sleep schedule, even on weekends');
    }

    // Body composition suggestions
    if (analytics.bodyComposition.progressTowardsGoal < 50) {
      suggestions.push('📊 Consider adjusting your calorie intake or exercise intensity');
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  /**
   * Identify recent achievements and milestones
   */
  private identifyAchievements(metrics: FitnessMetrics[]): string[] {
    const achievements: string[] = [];

    // Check for workout streaks
    const { currentStreak } = this.calculateWorkoutStreaks(metrics);
    if (currentStreak >= 7) {
      achievements.push(`🔥 ${currentStreak}-day workout streak!`);
    }

    // Check for weight progress
    const weights = metrics.filter(m => m.weight).map(m => m.weight!);
    if (weights.length >= 2) {
      const weightChange = weights[0] - weights[weights.length - 1];
      if (Math.abs(weightChange) >= 1) {
        achievements.push(`📉 ${Math.abs(weightChange).toFixed(1)}kg ${weightChange < 0 ? 'lost' : 'gained'}!`);
      }
    }

    // Check for consistency
    const workoutDays = metrics.map(m => m.workoutCount > 0 ? 1 : 0);
    const consistencyScore = this.calculateConsistencyScore(workoutDays);
    if (consistencyScore >= 90) {
      achievements.push('⭐ Exceptional workout consistency!');
    }

    return achievements;
  }

  /**
   * Analyze positive and negative trends
   */
  private analyzeTrends(metrics: FitnessMetrics[]): {
    positive: string[];
    negative: string[];
    neutral: string[];
  } {
    const trends = { positive: [] as string[], negative: [] as string[], neutral: [] as string[] };

    // Workout frequency trend
    const workoutTrend = this.analyzeTrendDirection(metrics.map(m => m.workoutCount));
    if (workoutTrend > 0.1) {
      trends.positive.push('📈 Increasing workout frequency');
    } else if (workoutTrend < -0.1) {
      trends.negative.push('📉 Decreasing workout frequency');
    } else {
      trends.neutral.push('➡️ Stable workout frequency');
    }

    // Sleep trend
    const sleepTrend = this.analyzeTrendDirection(metrics.map(m => m.sleepHours));
    if (sleepTrend > 0.1) {
      trends.positive.push('😴 Improving sleep duration');
    } else if (sleepTrend < -0.1) {
      trends.negative.push('😴 Declining sleep duration');
    }

    // Water intake trend
    const waterTrend = this.analyzeTrendDirection(metrics.map(m => m.waterIntake));
    if (waterTrend > 0.1) {
      trends.positive.push('💧 Increasing hydration');
    } else if (waterTrend < -0.1) {
      trends.negative.push('💧 Decreasing hydration');
    }

    return trends;
  }

  // Helper methods

  private getDateRange(period: string, endDate: Date): { start: Date; end: Date } {
    const end = new Date(endDate);
    const start = new Date(endDate);

    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return { start, end };
  }

  private getMetricsInRange(startDate: Date, endDate: Date): FitnessMetrics[] {
    return this.metricsHistory.filter(m => {
      const date = new Date(m.date);
      return date >= startDate && date <= endDate;
    });
  }

  private calculateConsistencyScore(binaryData: number[]): number {
    if (binaryData.length === 0) return 0;
    
    const totalDays = binaryData.length;
    const activeDays = binaryData.reduce((sum, day) => sum + day, 0);
    
    // Basic consistency: percentage of active days
    const basicScore = (activeDays / totalDays) * 100;
    
    // Bonus for streaks
    let currentStreak = 0;
    let maxStreak = 0;
    
    for (const day of binaryData) {
      if (day === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    const streakBonus = Math.min(20, maxStreak * 2); // Up to 20 bonus points
    
    return Math.min(100, basicScore + streakBonus);
  }

  private calculateWorkoutStreaks(metrics: FitnessMetrics[]): {
    currentStreak: number;
    longestStreak: number;
  } {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Sort by date (oldest first) for streak calculation
    const sortedMetrics = [...metrics].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (let i = sortedMetrics.length - 1; i >= 0; i--) {
      const metric = sortedMetrics[i];
      
      if (metric.workoutCount > 0) {
        tempStreak++;
        if (i === sortedMetrics.length - 1) {
          currentStreak = tempStreak; // This is the current streak
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
        if (i === sortedMetrics.length - 1) {
          currentStreak = 0; // No current streak
        }
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);
    
    return { currentStreak, longestStreak };
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    
    return Math.sqrt(variance); // Return standard deviation
  }

  private analyzeTrendDirection(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (val * index), 0);
    const sumX2 = values.reduce((sum, _, index) => sum + (index * index), 0);
    
    // Calculate slope using linear regression
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope;
  }

  private async loadMetricsHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.METRICS_HISTORY_KEY);
      if (stored) {
        this.metricsHistory = JSON.parse(stored);
        console.log(`✅ Loaded ${this.metricsHistory.length} historical metrics`);
      }
    } catch (error) {
      console.error('❌ Error loading metrics history:', error);
    }
  }

  private async saveMetricsHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.METRICS_HISTORY_KEY, JSON.stringify(this.metricsHistory));
    } catch (error) {
      console.error('❌ Error saving metrics history:', error);
    }
  }

  /**
   * Get raw metrics history for external use
   */
  getMetricsHistory(): FitnessMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get analytics summary for quick display
   */
  async getAnalyticsSummary(): Promise<{
    totalWorkouts: number;
    averageScore: number;
    currentStreak: number;
    recentTrend: string;
  }> {
    if (this.metricsHistory.length === 0) {
      return {
        totalWorkouts: 0,
        averageScore: 0,
        currentStreak: 0,
        recentTrend: 'No data',
      };
    }

    const recentMetrics = this.metricsHistory.slice(0, 30); // Last 30 days
    const totalWorkouts = recentMetrics.reduce((sum, m) => sum + m.workoutCount, 0);
    const workoutTrend = this.analyzeTrendDirection(recentMetrics.map(m => m.workoutCount));
    const { currentStreak } = this.calculateWorkoutStreaks(recentMetrics);
    
    // Mock average score calculation
    const averageScore = 75 + (workoutTrend * 10) + (currentStreak * 2);
    
    let recentTrend = 'Stable';
    if (workoutTrend > 0.1) recentTrend = 'Improving';
    else if (workoutTrend < -0.1) recentTrend = 'Declining';

    return {
      totalWorkouts,
      averageScore: Math.round(Math.min(100, Math.max(0, averageScore))),
      currentStreak,
      recentTrend,
    };
  }
}

export const analyticsEngine = new AnalyticsEngine();
export default analyticsEngine;