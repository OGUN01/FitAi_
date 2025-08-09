/**
 * Exercise Validation Service - Final safety layer for 100% visual coverage
 * Provides comprehensive validation and fallback mechanisms
 */

import { VERIFIED_EXERCISE_NAMES } from './constants/exerciseDatabase';
import { Workout } from '../types/ai';
import { WorkoutSet } from '../types/workout';

/**
 * Comprehensive exercise validation with multiple safety layers
 */
export class ExerciseValidationService {
  
  /**
   * Validate entire workout for exercise name compliance
   */
  static validateWorkout(workout: Workout): {
    isValid: boolean;
    issues: string[];
    fixedWorkout: Workout;
  } {
    const issues: string[] = [];
    const fixedExercises: WorkoutSet[] = [];
    
    workout.exercises.forEach((workoutSet, index) => {
      // Extract exercise name from exerciseId (assuming it's formatted properly)
      const exerciseName = workoutSet.exerciseId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const validation = this.validateExerciseName(exerciseName);
      
      if (!validation.isValid) {
        issues.push(`Exercise ${index + 1}: "${exerciseName}" -> "${validation.suggestedName}"`);
        fixedExercises.push({
          ...workoutSet,
          exerciseId: validation.suggestedName.toLowerCase().replace(/\s+/g, '_')
        });
      } else {
        fixedExercises.push(workoutSet);
      }
    });
    
    return {
      isValid: issues.length === 0,
      issues,
      fixedWorkout: {
        ...workout,
        exercises: fixedExercises
      }
    };
  }
  
  /**
   * Validate individual exercise name with intelligent suggestions
   */
  static validateExerciseName(exerciseName: string): {
    isValid: boolean;
    suggestedName: string;
    confidence: number;
  } {
    const normalizedName = exerciseName.toLowerCase().trim();
    
    // Check exact match
    const exactMatch = VERIFIED_EXERCISE_NAMES.find(validName => 
      validName.toLowerCase() === normalizedName
    );
    
    if (exactMatch) {
      return {
        isValid: true,
        suggestedName: exactMatch,
        confidence: 100
      };
    }
    
    // Check fuzzy match
    let bestMatch = VERIFIED_EXERCISE_NAMES[0];
    let bestScore = 0;
    
    for (const validExercise of VERIFIED_EXERCISE_NAMES) {
      const score = this.calculateSimilarity(normalizedName, validExercise.toLowerCase());
      if (score > bestScore) {
        bestScore = score;
        bestMatch = validExercise;
      }
    }
    
    // Check for keyword-based intelligent mapping
    const intelligentSuggestion = this.getIntelligentSuggestion(exerciseName);
    if (intelligentSuggestion && bestScore < 0.8) {
      return {
        isValid: false,
        suggestedName: intelligentSuggestion,
        confidence: 90
      };
    }
    
    return {
      isValid: bestScore > 0.9,
      suggestedName: bestMatch,
      confidence: Math.round(bestScore * 100)
    };
  }
  
  /**
   * Intelligent exercise name suggestion based on keywords and patterns
   */
  private static getIntelligentSuggestion(exerciseName: string): string | null {
    const name = exerciseName.toLowerCase();
    
    // Keyword mapping for common variations
    const keywordMap: Record<string, string> = {
      // Push movements
      'push': 'Push-ups',
      'pushup': 'Push-ups',
      'press_up': 'Push-ups',
      
      // Squat movements
      'squat': 'Squats',
      'bodyweight_squat': 'Squats',
      
      // Cardio movements
      'cardio': 'Jumping Jacks',
      'jump': 'Jumping Jacks',
      'jumping': 'Jumping Jacks',
      'jog': 'Running',
      'run': 'Running',
      
      // Core movements
      'core': 'Plank',
      'ab': 'Sit-ups',
      'abdominal': 'Sit-ups',
      'stomach': 'Crunches',
      
      // Upper body
      'arm': 'Bicep Curls',
      'bicep': 'Bicep Curls',
      'tricep': 'Tricep Dips',
      'shoulder': 'Shoulder Press',
      
      // Lower body
      'leg': 'Lunges',
      'glute': 'Glute Bridges',
      'calf': 'Step-ups',
      
      // Equipment-based
      'dumbbell': 'Dumbbell Rows',
      'barbell': 'Barbell Squats',
      'cable': 'Cable Rows',
      'kettlebell': 'Kettlebell Swings',
      
      // Flexibility
      'stretch': 'Stretching',
      'yoga': 'Yoga',
      'flexibility': 'Stretching'
    };
    
    // Check for keyword matches
    for (const [keyword, suggestion] of Object.entries(keywordMap)) {
      if (name.includes(keyword)) {
        return suggestion;
      }
    }
    
    // Pattern-based suggestions
    if (name.includes('interval') || name.includes('circuit')) {
      return 'Jumping Jacks';
    }
    
    if (name.includes('strength') || name.includes('weight')) {
      return 'Push-ups';
    }
    
    if (name.includes('cardio') || name.includes('aerobic')) {
      return 'Running';
    }
    
    return null;
  }
  
  /**
   * Calculate string similarity using Jaro-Winkler distance
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0 || len2 === 0) return 0.0;
    
    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    if (matchWindow < 0) return 0.0;
    
    const str1Matches = new Array(len1).fill(false);
    const str2Matches = new Array(len2).fill(false);
    
    let matches = 0;
    let transpositions = 0;
    
    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);
      
      for (let j = start; j < end; j++) {
        if (str2Matches[j] || str1[i] !== str2[j]) continue;
        str1Matches[i] = true;
        str2Matches[j] = true;
        matches++;
        break;
      }
    }
    
    if (matches === 0) return 0.0;
    
    // Count transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!str1Matches[i]) continue;
      while (!str2Matches[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }
    
    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
    
    // Apply Winkler prefix bonus
    const prefix = Math.min(4, this.getCommonPrefixLength(str1, str2));
    return jaro + prefix * 0.1 * (1 - jaro);
  }
  
  /**
   * Get common prefix length for Jaro-Winkler
   */
  private static getCommonPrefixLength(str1: string, str2: string): number {
    let prefix = 0;
    const minLen = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < minLen; i++) {
      if (str1[i] === str2[i]) {
        prefix++;
      } else {
        break;
      }
    }
    
    return prefix;
  }
  
  /**
   * Generate comprehensive validation report
   */
  static generateValidationReport(workout: Workout): {
    summary: string;
    details: {
      totalExercises: number;
      validExercises: number;
      invalidExercises: number;
      replacements: Array<{ original: string; replacement: string; confidence: number }>;
    };
    recommendations: string[];
  } {
    const validation = this.validateWorkout(workout);
    const validCount = workout.exercises.length - validation.issues.length;
    
    const replacements = workout.exercises
      .map(workoutSet => {
        const exerciseName = workoutSet.exerciseId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return { workoutSet, validation: this.validateExerciseName(exerciseName) };
      })
      .filter(item => !item.validation.isValid)
      .map(item => ({
        original: item.workoutSet.exerciseId,
        replacement: item.validation.suggestedName,
        confidence: item.validation.confidence
      }));
    
    const validationRate = Math.round((validCount / workout.exercises.length) * 100);
    
    return {
      summary: `Validation: ${validCount}/${workout.exercises.length} exercises valid (${validationRate}%)`,
      details: {
        totalExercises: workout.exercises.length,
        validExercises: validCount,
        invalidExercises: validation.issues.length,
        replacements
      },
      recommendations: [
        validationRate === 100 ? '✅ All exercises have guaranteed visual coverage' : '⚠️ Some exercises were auto-corrected for visual coverage',
        '🎯 Use standard gym exercise names for best results',
        '🔍 Validation ensures 100% compatibility with exercise visual database'
      ]
    };
  }
}

// Export singleton instance
export const exerciseValidator = ExerciseValidationService;