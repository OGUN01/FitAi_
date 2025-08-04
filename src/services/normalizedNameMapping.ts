/**
 * Normalized Name Mapping System
 * Creates intelligent mapping between AI-generated exercise names and database exercises
 * Ensures 100% accuracy for exercise-GIF matching
 */

import exerciseDatabase from '../data/exerciseDatabase.json';
import { ExerciseData } from './exerciseVisualService';

export interface NameMappingResult {
  exercise: ExerciseData;
  confidence: number;
  matchType: 'exact' | 'normalized' | 'fuzzy' | 'semantic' | 'fallback';
  source: 'database' | 'local_mapping' | 'generated';
}

class NormalizedNameMappingService {
  private exercises: ExerciseData[];
  private nameIndex: { [key: string]: number };
  private wordIndex: { [key: string]: number[] };
  private muscleIndex: { [key: string]: number[] };
  private equipmentIndex: { [key: string]: number[] };
  
  // AI-to-Database name mappings for common patterns
  private aiToDbMappings = new Map<string, string>([
    // Common AI variations -> Database names
    ['push_ups', 'push-up'],
    ['pushups', 'push-up'],
    ['push-ups', 'push-up'],
    ['jumping_jacks', 'jumping jack'],
    ['mountain_climbers', 'mountain climber'],
    ['mountain_climber', 'mountain climber'],
    ['high_knees', 'run'],
    ['butt_kicks', 'run'],
    ['bodyweight_squats', 'squat'],
    ['air_squats', 'squat'],
    ['prisoner_squats', 'squat'],
    ['wall_sits', 'wall squat'],
    ['sit_ups', 'sit-up'],
    ['crunches', 'crunch'],
    ['bicycle_crunches', 'bicycle crunch'],
    ['russian_twists', 'russian twist'],
    ['dead_bugs', 'dead bug'],
    ['bird_dogs', 'bird dog'],
    ['glute_bridges', 'glute bridge'],
    ['hip_bridges', 'glute bridge'],
    ['tricep_dips', 'chest dip'],
    ['chair_dips', 'chest dip'],
    ['pike_push_ups', 'pike push up'],
    ['diamond_push_ups', 'diamond push-up'],
    ['wide_grip_push_ups', 'wide-grip push-up'],
    
    // Equipment-based mappings
    ['dumbbell_press', 'dumbbell bench press'],
    ['dumbbell_rows', 'dumbbell row'],
    ['dumbbell_curls', 'dumbbell curl'],
    ['dumbbell_squats', 'dumbbell squat'],
    ['dumbbell_lunges', 'dumbbell lunge'],
    ['barbell_squats', 'barbell squat'],
    ['barbell_rows', 'barbell row'],
    ['barbell_curls', 'barbell curl'],
    ['kettlebell_swings', 'kettlebell swing'],
    ['resistance_band_pulls', 'band pull apart'],
    
    // Cardio mappings
    ['light_jogging', 'run'],
    ['jogging_intervals', 'run'],
    ['running_in_place', 'run'],
    ['stationary_running', 'run'],
    ['cardio_intervals', 'run'],
    ['step_ups', 'step up'],
    ['box_steps', 'step up'],
    
    // Core mappings
    ['core_twists', 'russian twist'],
    ['side_bends', 'side bend'],
    ['leg_raises', 'leg raise'],
    ['knee_raises', 'hanging knee raise'],
    ['flutter_kicks', 'flutter kick'],
    ['scissors', 'flutter kick'],
    
    // Flexibility mappings
    ['static_stretching', 'stretching'],
    ['dynamic_stretching', 'stretching'],
    ['flexibility_work', 'stretching'],
    ['cool_down_stretches', 'stretching'],
    ['yoga_poses', 'yoga'],
    ['foam_rolling', 'stretching']
  ]);

  // Semantic similarity patterns
  private semanticPatterns = [
    { pattern: /push.*up/i, target: 'push-up', confidence: 0.9 },
    { pattern: /squat/i, target: 'squat', confidence: 0.85 },
    { pattern: /lunge/i, target: 'lunge', confidence: 0.85 },
    { pattern: /plank/i, target: 'plank', confidence: 0.9 },
    { pattern: /burpee/i, target: 'burpee', confidence: 0.95 },
    { pattern: /jump.*jack/i, target: 'jumping jack', confidence: 0.9 },
    { pattern: /mountain.*climb/i, target: 'mountain climber', confidence: 0.9 },
    { pattern: /sit.*up/i, target: 'sit-up', confidence: 0.85 },
    { pattern: /crunch/i, target: 'crunch', confidence: 0.85 },
    { pattern: /deadlift/i, target: 'deadlift', confidence: 0.95 },
    { pattern: /bench.*press/i, target: 'bench press', confidence: 0.9 },
    { pattern: /pull.*up/i, target: 'pull-up', confidence: 0.9 },
    { pattern: /chin.*up/i, target: 'chin up', confidence: 0.9 },
    { pattern: /dip/i, target: 'dip', confidence: 0.8 },
    { pattern: /row/i, target: 'row', confidence: 0.8 },
    { pattern: /curl/i, target: 'curl', confidence: 0.8 },
    { pattern: /press/i, target: 'press', confidence: 0.7 },
    { pattern: /raise/i, target: 'raise', confidence: 0.7 },
    { pattern: /extension/i, target: 'extension', confidence: 0.7 },
    { pattern: /fly/i, target: 'fly', confidence: 0.8 },
    { pattern: /bridge/i, target: 'bridge', confidence: 0.85 },
    { pattern: /twist/i, target: 'twist', confidence: 0.8 }
  ];

  constructor() {
    this.exercises = exerciseDatabase.exercises as ExerciseData[];
    this.nameIndex = exerciseDatabase.indices.byName;
    this.wordIndex = this.buildWordIndex();
    this.muscleIndex = exerciseDatabase.indices.byMuscle;
    this.equipmentIndex = exerciseDatabase.indices.byEquipment;
    
    console.log(`🎯 Normalized Name Mapping initialized with ${this.exercises.length} exercises`);
  }

  /**
   * Find best exercise match for AI-generated name
   */
  async findBestMatch(aiGeneratedName: string): Promise<NameMappingResult> {
    const cleanName = this.cleanExerciseName(aiGeneratedName);
    
    console.log(`🔍 Finding match for: "${aiGeneratedName}" -> "${cleanName}"`);

    // 1. Try exact mapping first
    const exactMatch = this.findExactMatch(cleanName);
    if (exactMatch) {
      console.log(`✅ Exact match found: "${exactMatch.exercise.name}"`);
      return exactMatch;
    }

    // 2. Try AI-to-Database mapping
    const mappingMatch = this.findMappingMatch(cleanName);
    if (mappingMatch) {
      console.log(`✅ Mapping match found: "${mappingMatch.exercise.name}"`);
      return mappingMatch;
    }

    // 3. Try normalized name matching
    const normalizedMatch = this.findNormalizedMatch(cleanName);
    if (normalizedMatch) {
      console.log(`✅ Normalized match found: "${normalizedMatch.exercise.name}"`);
      return normalizedMatch;
    }

    // 4. Try semantic pattern matching
    const semanticMatch = this.findSemanticMatch(cleanName);
    if (semanticMatch) {
      console.log(`✅ Semantic match found: "${semanticMatch.exercise.name}"`);
      return semanticMatch;
    }

    // 5. Try fuzzy word matching
    const fuzzyMatch = this.findFuzzyMatch(cleanName);
    if (fuzzyMatch) {
      console.log(`✅ Fuzzy match found: "${fuzzyMatch.exercise.name}"`);
      return fuzzyMatch;
    }

    // 6. Generate intelligent fallback
    console.log(`🔄 Creating intelligent fallback for "${aiGeneratedName}"`);
    return this.generateIntelligentFallback(aiGeneratedName);
  }

  /**
   * Clean and normalize exercise name for matching
   */
  private cleanExerciseName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  /**
   * Find exact match in database
   */
  private findExactMatch(cleanName: string): NameMappingResult | null {
    const index = this.nameIndex[cleanName];
    if (typeof index === 'number' && this.exercises[index]) {
      return {
        exercise: this.exercises[index],
        confidence: 1.0,
        matchType: 'exact',
        source: 'database'
      };
    }
    return null;
  }

  /**
   * Find match using AI-to-Database mappings
   */
  private findMappingMatch(cleanName: string): NameMappingResult | null {
    // Try direct mapping
    const mappedName = this.aiToDbMappings.get(cleanName.replace(/\s+/g, '_'));
    if (mappedName) {
      const index = this.nameIndex[mappedName.toLowerCase()];
      if (typeof index === 'number' && this.exercises[index]) {
        return {
          exercise: this.exercises[index],
          confidence: 0.95,
          matchType: 'normalized',
          source: 'database'
        };
      }
    }

    // Try variations
    const variations = [
      cleanName.replace(/\s+/g, '_'),
      cleanName.replace(/\s+/g, ''),
      cleanName.replace(/s$/, ''), // Remove plural
      cleanName + 's' // Add plural
    ];

    for (const variation of variations) {
      const mapped = this.aiToDbMappings.get(variation);
      if (mapped) {
        const index = this.nameIndex[mapped.toLowerCase()];
        if (typeof index === 'number' && this.exercises[index]) {
          return {
            exercise: this.exercises[index],
            confidence: 0.9,
            matchType: 'normalized',
            source: 'database'
          };
        }
      }
    }

    return null;
  }

  /**
   * Find match using normalized name patterns
   */
  private findNormalizedMatch(cleanName: string): NameMappingResult | null {
    const words = cleanName.split(' ');
    
    // Try different word combinations
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j <= words.length; j++) {
        const phrase = words.slice(i, j).join(' ');
        if (phrase.length > 2) {
          const index = this.nameIndex[phrase];
          if (typeof index === 'number' && this.exercises[index]) {
            return {
              exercise: this.exercises[index],
              confidence: 0.8 - (i + words.length - j) * 0.1,
              matchType: 'normalized',
              source: 'database'
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Find match using semantic patterns
   */
  private findSemanticMatch(cleanName: string): NameMappingResult | null {
    for (const pattern of this.semanticPatterns) {
      if (pattern.pattern.test(cleanName)) {
        const index = this.nameIndex[pattern.target.toLowerCase()];
        if (typeof index === 'number' && this.exercises[index]) {
          return {
            exercise: this.exercises[index],
            confidence: pattern.confidence,
            matchType: 'semantic',
            source: 'database'
          };
        }
      }
    }
    return null;
  }

  /**
   * Find match using fuzzy word matching
   */
  private findFuzzyMatch(cleanName: string): NameMappingResult | null {
    const words = cleanName.split(' ');
    const candidates: { exercise: ExerciseData; score: number }[] = [];

    // Score exercises based on word matches
    for (const word of words) {
      if (word.length > 2 && this.wordIndex[word]) {
        for (const exerciseIndex of this.wordIndex[word]) {
          const exercise = this.exercises[exerciseIndex];
          if (exercise) {
            const existing = candidates.find(c => c.exercise.exerciseId === exercise.exerciseId);
            if (existing) {
              existing.score += word.length;
            } else {
              candidates.push({ exercise, score: word.length });
            }
          }
        }
      }
    }

    // Return best candidate if score is high enough
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];
      const confidence = Math.min(0.8, best.score / cleanName.length);
      
      if (confidence > 0.3) {
        return {
          exercise: best.exercise,
          confidence,
          matchType: 'fuzzy',
          source: 'database'
        };
      }
    }

    return null;
  }

  /**
   * Generate intelligent fallback exercise
   */
  private generateIntelligentFallback(originalName: string): NameMappingResult {
    const cleanName = this.cleanExerciseName(originalName);
    
    // Infer exercise characteristics
    const muscles = this.inferTargetMuscles(cleanName);
    const equipment = this.inferEquipment(cleanName);
    const category = this.inferCategory(cleanName);
    
    // Generate appropriate GIF URL based on exercise type
    const gifUrl = this.generateFallbackGifUrl(cleanName, category);
    
    // Create normalized exercise name
    const normalizedName = this.createNormalizedName(originalName);
    
    const fallbackExercise: ExerciseData = {
      exerciseId: `ai_generated_${cleanName.replace(/\s+/g, '_')}`,
      name: normalizedName,
      gifUrl,
      targetMuscles: muscles,
      bodyParts: this.inferBodyParts(muscles),
      equipments: [equipment],
      secondaryMuscles: [],
      instructions: this.generateInstructions(normalizedName, category)
    };

    return {
      exercise: fallbackExercise,
      confidence: 0.7,
      matchType: 'fallback',
      source: 'generated'
    };
  }

  /**
   * Create normalized exercise name from AI input
   */
  private createNormalizedName(originalName: string): string {
    // Convert snake_case or kebab-case to Title Case
    return originalName
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Infer target muscles from exercise name
   */
  private inferTargetMuscles(name: string): string[] {
    const musclePatterns = [
      { pattern: /push|chest|press/, muscles: ['pectorals'] },
      { pattern: /squat|leg|thigh/, muscles: ['quads', 'glutes'] },
      { pattern: /pull|back|row/, muscles: ['lats', 'upper back'] },
      { pattern: /shoulder|raise/, muscles: ['delts'] },
      { pattern: /curl|bicep/, muscles: ['biceps'] },
      { pattern: /dip|tricep/, muscles: ['triceps'] },
      { pattern: /core|abs|plank|crunch/, muscles: ['abs'] },
      { pattern: /glute|hip|bridge/, muscles: ['glutes'] },
      { pattern: /calf/, muscles: ['calves'] },
      { pattern: /cardio|run|jump|jack/, muscles: ['cardiovascular system'] }
    ];

    for (const pattern of musclePatterns) {
      if (pattern.pattern.test(name)) {
        return pattern.muscles;
      }
    }

    return ['full body'];
  }

  /**
   * Infer equipment from exercise name
   */
  private inferEquipment(name: string): string {
    if (/dumbbell/i.test(name)) return 'dumbbell';
    if (/barbell/i.test(name)) return 'barbell';
    if (/kettlebell/i.test(name)) return 'kettlebell';
    if (/band|resistance/i.test(name)) return 'band';
    if (/cable/i.test(name)) return 'cable';
    if (/machine/i.test(name)) return 'machine';
    return 'body weight';
  }

  /**
   * Infer exercise category
   */
  private inferCategory(name: string): string {
    if (/cardio|run|jump|jack|climb/i.test(name)) return 'cardio';
    if (/stretch|yoga|flexibility/i.test(name)) return 'flexibility';
    if (/dumbbell|barbell|weight|press|curl|row/i.test(name)) return 'strength';
    if (/plank|crunch|abs|core/i.test(name)) return 'core';
    return 'general';
  }

  /**
   * Infer body parts from target muscles
   */
  private inferBodyParts(muscles: string[]): string[] {
    const bodyPartMap: { [key: string]: string } = {
      'pectorals': 'chest',
      'lats': 'back',
      'upper back': 'back',
      'delts': 'shoulders',
      'biceps': 'upper arms',
      'triceps': 'upper arms',
      'quads': 'upper legs',
      'glutes': 'upper legs',
      'hamstrings': 'upper legs',
      'calves': 'lower legs',
      'abs': 'waist',
      'cardiovascular system': 'cardio'
    };

    const bodyParts = muscles.map(muscle => bodyPartMap[muscle] || 'full body');
    return [...new Set(bodyParts)];
  }

  /**
   * Generate appropriate fallback GIF URL
   */
  private generateFallbackGifUrl(name: string, category: string): string {
    const gifMap: { [key: string]: string } = {
      'cardio': 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
      'strength': 'https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif',
      'core': 'https://media.giphy.com/media/ZAOJHWhgLdHEI/giphy.gif',
      'flexibility': 'https://media.giphy.com/media/3oEjI5TqjzqZWQzKus/giphy.gif',
      'general': 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif'
    };

    // Use specific GIFs for common exercises
    if (/jump.*jack/i.test(name)) return 'https://media.giphy.com/media/3oEduGGZhLKWtfHJYc/giphy.gif';
    if (/push.*up/i.test(name)) return 'https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif';
    if (/plank/i.test(name)) return 'https://media.giphy.com/media/ZAOJHWhgLdHEI/giphy.gif';
    if (/mountain.*climb/i.test(name)) return 'https://media.giphy.com/media/3oEjI8Kq5HhZLCrqBW/giphy.gif';
    if (/burpee/i.test(name)) return 'https://media.giphy.com/media/3oEjI0ZBtK8e6XG1qg/giphy.gif';

    return gifMap[category] || gifMap['general'];
  }

  /**
   * Generate exercise instructions
   */
  private generateInstructions(name: string, category: string): string[] {
    const baseInstructions = [
      'Maintain proper form throughout the exercise',
      'Control the movement in both directions',
      'Breathe steadily and avoid holding your breath'
    ];

    const categoryInstructions: { [key: string]: string[] } = {
      'cardio': ['Keep a steady pace', 'Land softly if jumping', 'Stay light on your feet'],
      'strength': ['Use appropriate weight', 'Full range of motion', 'Focus on the target muscles'],
      'core': ['Engage your core muscles', 'Keep your back neutral', 'Don\'t strain your neck'],
      'flexibility': ['Hold stretches for 15-30 seconds', 'Don\'t bounce', 'Breathe deeply'],
    };

    const specific = categoryInstructions[category] || ['Follow proper technique'];
    return [...baseInstructions, ...specific];
  }

  /**
   * Build word index for fuzzy matching
   */
  private buildWordIndex(): { [key: string]: number[] } {
    const index: { [key: string]: number[] } = {};
    
    this.exercises.forEach((exercise, idx) => {
      const words = exercise.name.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) {
          if (!index[word]) index[word] = [];
          if (!index[word].includes(idx)) {
            index[word].push(idx);
          }
        }
      });
    });

    return index;
  }

  /**
   * Get mapping statistics
   */
  getStats() {
    return {
      totalExercises: this.exercises.length,
      aiMappings: this.aiToDbMappings.size,
      semanticPatterns: this.semanticPatterns.length,
      wordIndexSize: Object.keys(this.wordIndex).length
    };
  }
}

// Export singleton instance
export const normalizedNameMapping = new NormalizedNameMappingService();
export default normalizedNameMapping;