import AsyncStorage from '@react-native-async-storage/async-storage';
import exerciseVisualService, { ExerciseData, ExerciseMatchResult } from './exerciseVisualService';
import { geminiService } from '../ai/gemini';

// Enhanced matching types
export interface AdvancedMatchResult extends ExerciseMatchResult {
  tier: 'exact' | 'fuzzy' | 'semantic' | 'classification' | 'generated';
  processingTime: number;
  fallbackData?: GeneratedExerciseData;
}

export interface GeneratedExerciseData {
  name: string;
  description: string;
  instructions: string[];
  equipment: string[];
  targetMuscles: string[];
  safetyTips: string[];
  alternatives: string[];
  classification: ExerciseClassification;
}

export interface ExerciseClassification {
  primaryMovement: 'push' | 'pull' | 'squat' | 'hinge' | 'carry' | 'rotation' | 'isolation';
  muscleGroup: 'upper' | 'lower' | 'core' | 'full-body';
  equipment: 'bodyweight' | 'weights' | 'cardio' | 'flexibility';
  intensity: 'low' | 'moderate' | 'high' | 'explosive';
}

interface ExercisePattern {
  keywords: string[];
  classification: ExerciseClassification;
  fallbackExercise: string;
  genericGifUrl?: string;
}

// Exercise classification patterns for instant matching
const EXERCISE_PATTERNS: ExercisePattern[] = [
  // Push movements
  {
    keywords: ['push', 'press', 'chest', 'shoulder', 'tricep'],
    classification: {
      primaryMovement: 'push',
      muscleGroup: 'upper',
      equipment: 'weights',
      intensity: 'moderate'
    },
    fallbackExercise: 'push up'
  },
  
  // Pull movements
  {
    keywords: ['pull', 'row', 'lat', 'back', 'bicep', 'chin'],
    classification: {
      primaryMovement: 'pull',
      muscleGroup: 'upper',
      equipment: 'weights',
      intensity: 'moderate'
    },
    fallbackExercise: 'pull up'
  },
  
  // Squat patterns
  {
    keywords: ['squat', 'quad', 'glute', 'leg', 'thigh'],
    classification: {
      primaryMovement: 'squat',
      muscleGroup: 'lower',
      equipment: 'weights',
      intensity: 'moderate'
    },
    fallbackExercise: 'squat'
  },
  
  // Hinge patterns
  {
    keywords: ['deadlift', 'hinge', 'hamstring', 'hip', 'posterior'],
    classification: {
      primaryMovement: 'hinge',
      muscleGroup: 'lower',
      equipment: 'weights',
      intensity: 'moderate'
    },
    fallbackExercise: 'deadlift'
  },
  
  // Core/Rotation
  {
    keywords: ['plank', 'core', 'abs', 'rotation', 'twist', 'crunch'],
    classification: {
      primaryMovement: 'rotation',
      muscleGroup: 'core',
      equipment: 'bodyweight',
      intensity: 'moderate'
    },
    fallbackExercise: 'plank'
  },
  
  // Cardio movements
  {
    keywords: ['jump', 'cardio', 'hiit', 'explosive', 'plyometric', 'burpee'],
    classification: {
      primaryMovement: 'carry',
      muscleGroup: 'full-body',
      equipment: 'cardio',
      intensity: 'explosive'
    },
    fallbackExercise: 'jumping jacks'
  }
];

class AdvancedExerciseMatchingService {
  private semanticCache = new Map<string, GeneratedExerciseData>();
  private performanceMetrics = {
    totalRequests: 0,
    tierUsage: {
      exact: 0,
      fuzzy: 0,
      semantic: 0,
      classification: 0,
      generated: 0
    },
    averageResponseTime: 0
  };

  constructor() {
    this.loadSemanticCache();
  }

  /**
   * Main matching function with multi-tier system
   * Target: 100% coverage with <100ms average response
   */
  async findExerciseWithFullCoverage(exerciseName: string): Promise<AdvancedMatchResult> {
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;

    try {
      // TIER 1: Exact Match (0-10ms)
      const exactMatch = await this.tryExactMatch(exerciseName);
      if (exactMatch) {
        return this.createResult(exactMatch, 'exact', startTime);
      }

      // TIER 2: Fuzzy Matching (50-200ms)
      const fuzzyMatch = await this.tryFuzzyMatch(exerciseName);
      if (fuzzyMatch && fuzzyMatch.confidence >= 0.75) {
        return this.createResult(fuzzyMatch, 'fuzzy', startTime);
      }

      // TIER 3: AI-Powered Semantic Matching (200-500ms)
      const semanticMatch = await this.trySemanticMatch(exerciseName);
      if (semanticMatch) {
        return this.createResult(semanticMatch, 'semantic', startTime);
      }

      // TIER 4: Exercise Classification (10-50ms)
      const classificationMatch = await this.tryClassificationMatch(exerciseName);
      if (classificationMatch) {
        return this.createResult(classificationMatch, 'classification', startTime);
      }

      // TIER 5: AI-Generated Exercise Data (500-1000ms)
      const generatedMatch = await this.generateExerciseData(exerciseName);
      return this.createResult(generatedMatch, 'generated', startTime);

    } catch (error) {
      console.error(`Advanced matching failed for ${exerciseName}:`, error);
      
      // Ultimate fallback - return basic classification
      const fallback = await this.tryClassificationMatch(exerciseName);
      return this.createResult(fallback, 'classification', startTime);
    }
  }

  /**
   * TIER 1: Exact Match - Instant cache lookup
   */
  private async tryExactMatch(exerciseName: string): Promise<ExerciseMatchResult | null> {
    const cleanName = exerciseName.toLowerCase().trim();
    
    // Check existing cache first
    const exactMatch = await exerciseVisualService.findExercise(cleanName, false, true);
    
    if (exactMatch && exactMatch.matchType === 'exact') {
      this.performanceMetrics.tierUsage.exact++;
      return exactMatch;
    }
    
    return null;
  }

  /**
   * TIER 2: Fuzzy Matching - Enhanced with better threshold
   */
  private async tryFuzzyMatch(exerciseName: string): Promise<ExerciseMatchResult | null> {
    try {
      const fuzzyMatch = await exerciseVisualService.findExercise(exerciseName, false, true);
      
      if (fuzzyMatch && fuzzyMatch.confidence >= 0.75) {
        this.performanceMetrics.tierUsage.fuzzy++;
        return fuzzyMatch;
      }
      
      return null;
    } catch (error) {
      console.warn(`Fuzzy matching failed for ${exerciseName}:`, error);
      return null;
    }
  }

  /**
   * TIER 3: AI-Powered Semantic Matching
   */
  private async trySemanticMatch(exerciseName: string): Promise<ExerciseMatchResult | null> {
    try {
      // Check semantic cache first
      const cached = this.semanticCache.get(exerciseName.toLowerCase());
      if (cached) {
        const standardMatch = await exerciseVisualService.findExercise(cached.alternatives[0], false, true);
        if (standardMatch) {
          this.performanceMetrics.tierUsage.semantic++;
          return {
            ...standardMatch,
            confidence: 0.85,
            matchType: 'fuzzy'
          };
        }
      }

      // Use Gemini for semantic matching
      const semanticData = await this.generateSemanticMapping(exerciseName);
      if (semanticData && semanticData.alternatives.length > 0) {
        // Try to find match for the best alternative
        for (const alternative of semanticData.alternatives) {
          const match = await exerciseVisualService.findExercise(alternative, false, true);
          if (match && match.confidence >= 0.7) {
            // Cache the semantic mapping
            this.semanticCache.set(exerciseName.toLowerCase(), semanticData);
            this.saveSemanticCache();
            
            this.performanceMetrics.tierUsage.semantic++;
            return {
              ...match,
              confidence: Math.min(match.confidence + 0.1, 1.0), // Boost confidence
              matchType: 'fuzzy'
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.warn(`Semantic matching failed for ${exerciseName}:`, error);
      return null;
    }
  }

  /**
   * TIER 4: Exercise Classification - Fast pattern matching
   */
  private async tryClassificationMatch(exerciseName: string): Promise<ExerciseMatchResult | null> {
    try {
      const classification = this.classifyExercise(exerciseName);
      if (!classification) return null;

      // Find best fallback exercise for this classification
      const fallbackMatch = await exerciseVisualService.findExercise(classification.fallbackExercise, false, true);
      
      if (fallbackMatch) {
        this.performanceMetrics.tierUsage.classification++;
        
        return {
          exercise: {
            ...fallbackMatch.exercise,
            name: `${exerciseName} (Similar to ${fallbackMatch.exercise.name})`,
            instructions: [
              `This is a variation of ${fallbackMatch.exercise.name}.`,
              `Follow the demonstration while adapting for "${exerciseName}".`,
              ...fallbackMatch.exercise.instructions
            ]
          },
          confidence: 0.6,
          matchType: 'partial'
        };
      }

      return null;
    } catch (error) {
      console.warn(`Classification matching failed for ${exerciseName}:`, error);
      return null;
    }
  }

  /**
   * TIER 5: AI-Generated Exercise Data - Last resort but comprehensive
   */
  private async generateExerciseData(exerciseName: string): Promise<ExerciseMatchResult> {
    try {
      const generatedData = await this.generateComprehensiveExerciseData(exerciseName);
      const classification = this.classifyExercise(exerciseName);
      
      // Try to find a similar exercise for visual
      let visualExercise = null;
      if (generatedData.alternatives.length > 0) {
        for (const alt of generatedData.alternatives) {
          const match = await exerciseVisualService.findExercise(alt, false, true);
          if (match) {
            visualExercise = match.exercise;
            break;
          }
        }
      }

      // Fallback to classification-based visual
      if (!visualExercise && classification) {
        const fallbackMatch = await exerciseVisualService.findExercise(classification.fallbackExercise, false, true);
        if (fallbackMatch) {
          visualExercise = fallbackMatch.exercise;
        }
      }

      this.performanceMetrics.tierUsage.generated++;

      return {
        exercise: visualExercise || {
          exerciseId: exerciseName.toLowerCase().replace(/\s+/g, '_'),
          name: generatedData.name,
          gifUrl: '', // No visual available
          targetMuscles: generatedData.targetMuscles,
          bodyParts: this.mapMuscleGroupsToBodyParts(generatedData.targetMuscles),
          equipments: generatedData.equipment,
          secondaryMuscles: [],
          instructions: generatedData.instructions
        },
        confidence: 0.8, // High confidence in AI-generated data
        matchType: 'fuzzy'
      };
    } catch (error) {
      console.error(`Exercise generation failed for ${exerciseName}:`, error);
      
      // Ultimate fallback
      return {
        exercise: {
          exerciseId: exerciseName.toLowerCase().replace(/\s+/g, '_'),
          name: exerciseName,
          gifUrl: '',
          targetMuscles: ['full body'],
          bodyParts: ['full body'],
          equipments: ['body weight'],
          secondaryMuscles: [],
          instructions: [
            'This is a custom exercise generated by AI.',
            'Follow proper form and technique.',
            'Start with light weight or bodyweight.',
            'Focus on controlled movements.',
            'Stop if you feel any pain or discomfort.'
          ]
        },
        confidence: 0.4,
        matchType: 'partial'
      };
    }
  }

  /**
   * Generate semantic mapping using Gemini
   */
  private async generateSemanticMapping(exerciseName: string): Promise<GeneratedExerciseData | null> {
    try {
      const prompt = `
        Exercise: "${exerciseName}"
        
        Find 3 similar standard exercises that would be found in a typical exercise database.
        Focus on exercises with common names like "push up", "squat", "deadlift", etc.
        
        Return JSON format:
        {
          "alternatives": ["exercise1", "exercise2", "exercise3"],
          "primaryMovement": "push|pull|squat|hinge|carry|rotation|isolation",
          "equipment": ["equipment1", "equipment2"]
        }
      `;

      const response = await geminiService.generateResponse(prompt, {}, {
        type: "OBJECT",
        properties: {
          alternatives: {
            type: "ARRAY",
            items: {
              type: "OBJECT", 
              properties: {
                name: { type: "STRING" },
                confidence: { type: "NUMBER" },
                reason: { type: "STRING" }
              },
              required: ["name", "confidence", "reason"]
            }
          }
        },
        required: ["alternatives"]
      });
      
      if (!response.success || !response.data) {
        throw new Error('Failed to generate semantic mapping');
      }
      
      const data = response.data;
      
      if (data.alternatives && Array.isArray(data.alternatives)) {
        return {
          name: exerciseName,
          description: `AI-matched variation of ${data.alternatives[0]}`,
          instructions: [],
          equipment: data.alternatives?.[0]?.equipment || [],
          targetMuscles: [],
          safetyTips: [],
          alternatives: data.alternatives,
          classification: {
            primaryMovement: data.primaryMovement || 'isolation',
            muscleGroup: 'full-body',
            equipment: 'weights',
            intensity: 'moderate'
          }
        };
      }

      return null;
    } catch (error) {
      console.warn(`Semantic mapping generation failed:`, error);
      return null;
    }
  }

  /**
   * Generate comprehensive exercise data using Gemini
   */
  private async generateComprehensiveExerciseData(exerciseName: string): Promise<GeneratedExerciseData> {
    const prompt = `
      Exercise: "${exerciseName}"
      
      Generate comprehensive exercise information in JSON format:
      {
        "name": "formatted exercise name",
        "description": "brief description",
        "instructions": ["step1", "step2", "step3", "step4", "step5", "step6"],
        "equipment": ["equipment needed"],
        "targetMuscles": ["primary muscles"],
        "safetyTips": ["safety tip1", "safety tip2", "safety tip3"],
        "alternatives": ["similar exercise1", "similar exercise2", "similar exercise3"]
      }
      
      Make alternatives use common exercise names found in standard databases.
    `;

    try {
      const response = await geminiService.generateResponse(prompt, {}, {
        type: "OBJECT",
        properties: {
          exerciseDetails: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              description: { type: "STRING" },
              muscleGroups: {
                type: "ARRAY",
                items: { type: "STRING" }
              },
              equipment: {
                type: "ARRAY", 
                items: { type: "STRING" }
              },
              difficulty: { type: "STRING" },
              instructions: {
                type: "ARRAY",
                items: { type: "STRING" }
              }
            },
            required: ["name", "description", "muscleGroups", "equipment", "difficulty", "instructions"]
          }
        },
        required: ["exerciseDetails"]
      });
      
      if (!response.success || !response.data) {
        throw new Error('Failed to generate exercise details');
      }
      
      const data = response.data;
      
      return {
        name: data.exerciseDetails?.name || exerciseName,
        description: data.exerciseDetails?.description || `Custom variation: ${exerciseName}`,
        instructions: data.exerciseDetails?.instructions || [
          'Follow proper form and technique',
          'Start with appropriate weight or resistance',
          'Control the movement throughout the range of motion',
          'Breathe properly during the exercise',
          'Stop if you experience pain or discomfort',
          'Focus on quality over quantity'
        ],
        equipment: data.exerciseDetails?.equipment || ['body weight'],
        targetMuscles: data.exerciseDetails?.muscleGroups || ['full body'],
        safetyTips: data.exerciseDetails?.safetyTips || [
          'Warm up properly before exercising',
          'Use proper form to prevent injury',
          'Start with lighter weight and progress gradually'
        ],
        alternatives: data.alternatives || [],
        classification: this.classifyExercise(exerciseName) || {
          primaryMovement: 'isolation',
          muscleGroup: 'full-body',
          equipment: 'bodyweight',
          intensity: 'moderate'
        }
      };
    } catch (error) {
      console.error('Comprehensive data generation failed:', error);
      
      // Return basic generated data
      return {
        name: exerciseName,
        description: `AI-generated exercise: ${exerciseName}`,
        instructions: [
          'This is a custom exercise variation',
          'Follow proper form and technique',
          'Start with appropriate resistance',
          'Control the movement',
          'Breathe properly',
          'Stop if you feel pain'
        ],
        equipment: ['body weight'],
        targetMuscles: ['full body'],
        safetyTips: [
          'Warm up before exercising',
          'Use proper form',
          'Progress gradually'
        ],
        alternatives: [],
        classification: {
          primaryMovement: 'isolation',
          muscleGroup: 'full-body',
          equipment: 'bodyweight',
          intensity: 'moderate'
        }
      };
    }
  }

  /**
   * Classify exercise by movement patterns
   */
  private classifyExercise(exerciseName: string): ExercisePattern | null {
    const name = exerciseName.toLowerCase();
    
    for (const pattern of EXERCISE_PATTERNS) {
      if (pattern.keywords.some(keyword => name.includes(keyword))) {
        return pattern;
      }
    }
    
    return null;
  }

  /**
   * Helper methods
   */
  private createResult(
    baseResult: ExerciseMatchResult | null, 
    tier: AdvancedMatchResult['tier'], 
    startTime: number
  ): AdvancedMatchResult {
    const processingTime = Date.now() - startTime;
    this.updatePerformanceMetrics(processingTime);

    if (!baseResult) {
      // Should not happen, but provide fallback
      return {
        exercise: {
          exerciseId: 'unknown',
          name: 'Unknown Exercise',
          gifUrl: '',
          targetMuscles: ['full body'],
          bodyParts: ['full body'],
          equipments: ['body weight'],
          secondaryMuscles: [],
          instructions: ['Custom exercise - use proper form']
        },
        confidence: 0.1,
        matchType: 'partial',
        tier,
        processingTime
      };
    }

    return {
      ...baseResult,
      tier,
      processingTime
    };
  }

  private updatePerformanceMetrics(processingTime: number): void {
    const total = this.performanceMetrics.totalRequests;
    const current = this.performanceMetrics.averageResponseTime;
    this.performanceMetrics.averageResponseTime = 
      (current * (total - 1) + processingTime) / total;
  }

  private mapMuscleGroupsToBodyParts(muscles: string[]): string[] {
    const mapping: Record<string, string> = {
      'chest': 'chest',
      'back': 'back',
      'shoulders': 'shoulders',
      'biceps': 'upper arms',
      'triceps': 'upper arms',
      'legs': 'lower body',
      'glutes': 'lower body',
      'core': 'waist',
      'abs': 'waist'
    };

    return muscles.map(muscle => mapping[muscle.toLowerCase()] || 'full body');
  }

  /**
   * Cache management
   */
  private async loadSemanticCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem('semantic_exercise_cache');
      if (cached) {
        const data = JSON.parse(cached);
        this.semanticCache = new Map(Object.entries(data));
        console.log(`📚 Loaded ${this.semanticCache.size} semantic mappings from cache`);
      }
    } catch (error) {
      console.warn('Failed to load semantic cache:', error);
    }
  }

  private async saveSemanticCache(): Promise<void> {
    try {
      const data = Object.fromEntries(this.semanticCache);
      await AsyncStorage.setItem('semantic_exercise_cache', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save semantic cache:', error);
    }
  }

  /**
   * Performance monitoring
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.semanticCache.size,
      coverageRate: (
        (this.performanceMetrics.tierUsage.exact + 
         this.performanceMetrics.tierUsage.fuzzy + 
         this.performanceMetrics.tierUsage.semantic) / 
        Math.max(this.performanceMetrics.totalRequests, 1)
      ) * 100
    };
  }

  /**
   * Clear caches for testing
   */
  async clearCaches(): Promise<void> {
    this.semanticCache.clear();
    await AsyncStorage.removeItem('semantic_exercise_cache');
    console.log('🧹 Advanced matching caches cleared');
  }
}

// Export singleton
export const advancedExerciseMatching = new AdvancedExerciseMatchingService();
export default advancedExerciseMatching;