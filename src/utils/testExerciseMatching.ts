import exerciseVisualService from '../services/exerciseVisualService';
import { advancedExerciseMatching } from '../services/advancedExerciseMatching';

// Common AI-generated exercise names to test
const testExerciseNames = [
  // Basic exercises that should match well
  'dumbbell_goblet_squat',
  'push_up',
  'plank',
  'jumping_jacks',
  'burpees',
  'mountain_climbers',
  
  // Compound exercises
  'barbell_deadlift',
  'overhead_press',
  'bench_press',
  'pull_ups',
  'chin_ups',
  
  // Variation names (might be challenging)
  'incline_dumbbell_press',
  'reverse_grip_barbell_row',
  'bulgarian_split_squats',
  'single_arm_dumbbell_row',
  
  // Creative AI names (more challenging)
  'weighted_bodyweight_squat',
  'alternating_arm_chest_press',
  'explosive_jump_squat',
  'controlled_negative_pushup',
  
  // Equipment specific
  'cable_chest_fly',
  'smith_machine_squat',
  'kettlebell_swing',
  'resistance_band_row',
];

export interface MatchTestResult {
  exerciseName: string;
  found: boolean;
  confidence: number;
  matchType: string;
  matchedName?: string;
  gifUrl?: string;
  tier?: string;
  processingTime?: number;
  error?: string;
}

/**
 * Test exercise matching with common AI-generated names
 */
export const testExerciseMatching = async (): Promise<MatchTestResult[]> => {
  console.log('🧪 Starting exercise matching tests...');
  
  const results: MatchTestResult[] = [];
  
  for (const exerciseName of testExerciseNames) {
    try {
      console.log(`🔍 Testing: ${exerciseName}`);
      
      const matchResult = await exerciseVisualService.findExercise(exerciseName);
      
      if (matchResult) {
        const advancedResult = matchResult as any;
        results.push({
          exerciseName,
          found: true,
          confidence: matchResult.confidence,
          matchType: matchResult.matchType,
          matchedName: matchResult.exercise.name,
          gifUrl: matchResult.exercise.gifUrl,
          tier: advancedResult.tier,
          processingTime: advancedResult.processingTime,
        });
        
        const tierInfo = advancedResult.tier ? ` [${advancedResult.tier}]` : '';
        const timeInfo = advancedResult.processingTime ? ` (${advancedResult.processingTime}ms)` : '';
        console.log(`✅ ${exerciseName} → ${matchResult.exercise.name} (${Math.round(matchResult.confidence * 100)}%)${tierInfo}${timeInfo}`);
      } else {
        results.push({
          exerciseName,
          found: false,
          confidence: 0,
          matchType: 'none',
        });
        
        console.log(`❌ ${exerciseName} → No match found`);
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      results.push({
        exerciseName,
        found: false,
        confidence: 0,
        matchType: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      console.error(`💥 ${exerciseName} → Error: ${error}`);
    }
  }
  
  // Print summary
  const successful = results.filter(r => r.found).length;
  const highConfidence = results.filter(r => r.confidence >= 0.8).length;
  const exactMatches = results.filter(r => r.matchType === 'exact').length;
  
  console.log(`\n📊 Exercise Matching Test Results:`);
  console.log(`Total exercises tested: ${results.length}`);
  console.log(`Successful matches: ${successful} (${Math.round(successful / results.length * 100)}%)`);
  console.log(`High confidence matches (≥80%): ${highConfidence} (${Math.round(highConfidence / results.length * 100)}%)`);
  console.log(`Exact matches: ${exactMatches} (${Math.round(exactMatches / results.length * 100)}%)`);
  
  return results;
};

/**
 * Test specific exercise names manually
 */
export const testSpecificExercises = async (exerciseNames: string[]): Promise<void> => {
  console.log('🎯 Testing specific exercises...');
  
  for (const exerciseName of exerciseNames) {
    try {
      const matchResult = await exerciseVisualService.findExercise(exerciseName);
      
      if (matchResult) {
        console.log(`\n✅ ${exerciseName}:`);
        console.log(`   → Matched: ${matchResult.exercise.name}`);
        console.log(`   → Confidence: ${Math.round(matchResult.confidence * 100)}%`);
        console.log(`   → Match Type: ${matchResult.matchType}`);
        console.log(`   → Equipment: ${matchResult.exercise.equipments.join(', ')}`);
        console.log(`   → Muscles: ${matchResult.exercise.targetMuscles.join(', ')}`);
        console.log(`   → GIF: ${matchResult.exercise.gifUrl}`);
      } else {
        console.log(`\n❌ ${exerciseName}: No match found`);
      }
    } catch (error) {
      console.error(`💥 ${exerciseName}: Error - ${error}`);
    }
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = (): void => {
  const stats = exerciseVisualService.getCacheStats();
  console.log(`\n💾 Cache Statistics:`);
  console.log(`Total entries: ${stats.size}`);
  console.log(`Unique exercises: ${stats.exercises}`);
};

/**
 * Test advanced matching system specifically
 */
export const testAdvancedMatching = async (): Promise<MatchTestResult[]> => {
  console.log('🧠 Testing Advanced Multi-Tier Matching System...\n');
  
  const challengingExercises = [
    'explosive_single_arm_dumbbell_clean',
    'controlled_negative_bulgarian_split_squat',
    'alternating_dynamic_pushup_to_t_rotation',
    'isometric_wall_sit_with_heel_raises',
    'weighted_single_leg_romanian_deadlift',
    'reverse_grip_bent_over_barbell_row',
    'incline_dumbbell_hammer_curl',
    'lateral_raise_to_front_raise_combo'
  ];

  const results: MatchTestResult[] = [];
  const startTime = Date.now();
  
  console.log(`🎯 Testing ${challengingExercises.length} challenging AI-generated exercises...\n`);

  for (const exerciseName of challengingExercises) {
    try {
      console.log(`🔍 Advanced matching: ${exerciseName}`);
      
      const advancedResult = await advancedExerciseMatching.findExerciseWithFullCoverage(exerciseName);
      
      results.push({
        exerciseName,
        found: true,
        confidence: advancedResult.confidence,
        matchType: advancedResult.matchType,
        matchedName: advancedResult.exercise.name,
        gifUrl: advancedResult.exercise.gifUrl,
        tier: advancedResult.tier,
        processingTime: advancedResult.processingTime,
      });
      
      console.log(`✅ ${exerciseName}`);
      console.log(`   → ${advancedResult.exercise.name} (${Math.round(advancedResult.confidence * 100)}%)`);
      console.log(`   → Tier: ${advancedResult.tier} | Time: ${advancedResult.processingTime}ms\n`);
      
    } catch (error) {
      results.push({
        exerciseName,
        found: false,
        confidence: 0,
        matchType: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      console.error(`💥 ${exerciseName} → Error: ${error}\n`);
    }
  }
  
  const totalTime = Date.now() - startTime;
  const successful = results.filter(r => r.found).length;
  const averageTime = results.reduce((sum, r) => sum + (r.processingTime || 0), 0) / results.length;
  
  console.log(`\n🏆 Advanced Matching Results:`);
  console.log(`Total exercises tested: ${results.length}`);
  console.log(`Success rate: ${successful}/${results.length} (${Math.round(successful / results.length * 100)}%)`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Average processing time: ${Math.round(averageTime)}ms`);
  
  // Show tier distribution
  const tierCounts = results.reduce((acc, r) => {
    if (r.tier) {
      acc[r.tier] = (acc[r.tier] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`\n📊 Tier Distribution:`);
  Object.entries(tierCounts).forEach(([tier, count]) => {
    console.log(`   ${tier}: ${count}`);
  });
  
  // Get performance metrics
  const metrics = advancedExerciseMatching.getPerformanceMetrics();
  console.log(`\n🔥 Advanced Matching Performance Metrics:`);
  console.log(JSON.stringify(metrics, null, 2));
  
  return results;
};

/**
 * Run all tests
 */
export const runAllTests = async (): Promise<MatchTestResult[]> => {
  console.log('🚀 Running comprehensive exercise matching tests...\n');
  
  // Get cache stats first
  getCacheStats();
  
  // Run main test suite
  const results = await testExerciseMatching();
  
  // Test some specific challenging names
  console.log('\n🎯 Testing challenging exercise names:');
  await testSpecificExercises([
    'Dumbbell Goblet Squat',
    'Bulgarian Split Squat',
    'Single Arm Dumbbell Row',
    'Diamond Push Up',
    'Pike Push Up',
  ]);
  
  // Test advanced matching system
  console.log('\n🧠 Testing Advanced Matching System:');
  await testAdvancedMatching();
  
  console.log('\n✨ All tests completed!');
  
  return results;
};