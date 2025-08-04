/**
 * Real Workout Scenarios Test
 * 
 * This test replicates the exact scenario from your screenshot:
 * - "Metabolic HIIT Burn" workout
 * - "Burpees" exercise showing "THIS CONTENT IS NOT AVAILABLE"
 * - Console logs showing bulletproof system success but UI failure
 */

const fs = require('fs');
const path = require('path');

class RealWorkoutTester {
  constructor() {
    this.testResults = [];
    this.debugInfo = [];
  }

  async testRealWorkoutScenarios() {
    console.log('🏋️‍♂️ REAL WORKOUT SCENARIOS TEST');
    console.log('='.repeat(60));
    console.log('Replicating the exact issue from your screenshot');
    console.log('');

    // Test 1: Analyze the exact workout from screenshot
    await this.testMetabolicHIITBurn();
    
    // Test 2: Test common HIIT exercises
    await this.testCommonHIITExercises();
    
    // Test 3: Analyze WorkoutSessionScreen data flow
    await this.analyzeWorkoutSessionDataFlow();
    
    // Test 4: Test exercise ID matching
    await this.testExerciseIdMatching();
    
    // Generate findings and fixes
    this.generateWorkoutTestReport();
  }

  async testMetabolicHIITBurn() {
    console.log('🔥 TEST 1: Metabolic HIIT Burn Workout');
    console.log('-'.repeat(40));
    
    // From your screenshot, this appears to be the workout structure
    const workoutFromScreenshot = {
      name: "Metabolic HIIT Burn",
      exercises: [
        {
          exerciseId: "burpees", // This is showing "THIS CONTENT IS NOT AVAILABLE"
          name: "Burpees",
          sets: 4,
          reps: "max reps"
        },
        // Other exercises would be here but we'll focus on the failing one
      ]
    };
    
    console.log('📋 Analyzing failing exercise:');
    console.log(`   Exercise ID: "${workoutFromScreenshot.exercises[0].exerciseId}"`);
    console.log(`   Exercise Name: "${workoutFromScreenshot.exercises[0].name}"`);
    
    // Test what our bulletproof system would do with this exercise
    await this.simulateBulletproofSystemForExercise("burpees");
    
    // Test what the UI component would receive
    this.simulateUIComponentFlow("burpees");
    
    console.log('');
  }

  async simulateBulletproofSystemForExercise(exerciseId) {
    console.log(`🛡️  Simulating bulletproof system for "${exerciseId}":`)
    
    // Simulate the 5-tier system (based on your console logs)
    console.log('   🎯 Tier 1: Local mappings with working GIFs...');
    
    // Check if burpees would match in local mappings
    const localMappings = {
      'burpees': {
        name: 'Burpees',
        gifUrl: 'https://media.giphy.com/media/3oEjI0ZBtK8e6XG1qg/giphy.gif'
      },
      'burpee': {
        name: 'Burpee',
        gifUrl: 'https://media.giphy.com/media/3oEjI0ZBtK8e6XG1qg/giphy.gif'
      }
    };
    
    if (localMappings[exerciseId]) {
      console.log(`   ✅ TIER 1 SUCCESS: "${localMappings[exerciseId].name}" (Local mapping)`);
      console.log(`   📄 GIF URL: ${localMappings[exerciseId].gifUrl}`);
      
      // Test if this URL is actually working
      const urlWorking = await this.testGifUrl(localMappings[exerciseId].gifUrl);
      console.log(`   🌐 URL Accessibility: ${urlWorking ? 'Working ✅' : 'Broken ❌'}`);
      
      this.testResults.push({
        exerciseId,
        tier: 1,
        success: true,
        gifUrl: localMappings[exerciseId].gifUrl,
        urlWorking
      });
    } else {
      console.log(`   ❌ Not found in Tier 1, would continue to Tier 2...`);
      // In real system, this would continue through tiers 2-5
      
      this.testResults.push({
        exerciseId,
        tier: 1,
        success: false,
        reason: 'Not in local mappings'
      });
    }
  }

  simulateUIComponentFlow(exerciseId) {
    console.log(`🎬 Simulating UI component flow for "${exerciseId}":`)
    
    // Simulate what happens in WorkoutSessionScreen
    console.log('   1. WorkoutSessionScreen renders with currentExercise.exerciseId = "burpees"');
    console.log('   2. exerciseVisuals state lookup: exerciseVisuals["burpees"]');
    
    // Check if the key format matches
    const possibleKeyFormats = [
      'burpees',
      'Burpees',
      'burpee',
      'Burpee'
    ];
    
    console.log('   🔍 Possible key format variations:');
    possibleKeyFormats.forEach((key, index) => {
      console.log(`      ${index + 1}. "${key}"`);
    });
    
    // Simulate the critical decision point
    console.log('   3. ExerciseGifPlayer receives props:');
    console.log('      - exerciseName: "burpees"');
    console.log('      - matchResult: exerciseVisuals["burpees"] (could be undefined!)');
    
    // This is where the problem likely occurs
    console.log('   4. Component logic:');
    console.log('      - const exercise = exerciseData || matchResult?.exercise');
    console.log('      - if (!exercise?.gifUrl) → Shows "THIS CONTENT IS NOT AVAILABLE"');
    
    // The critical issue
    this.debugInfo.push({
      issue: 'State Lookup Mismatch',
      description: 'exerciseVisuals[exerciseId] returns undefined despite bulletproof system success',
      likelyCause: 'Key mismatch between preloading and component lookup'
    });
    
    console.log('   ⚠️  LIKELY ISSUE: exerciseVisuals["burpees"] returns undefined');
    console.log('       Even though bulletproof system found the exercise successfully!');
  }

  async testCommonHIITExercises() {
    console.log('⚡ TEST 2: Common HIIT Exercises');
    console.log('-'.repeat(40));
    
    const commonHIITExercises = [
      'burpees',
      'jump_squats', // From your console logs
      'high_knees',  // From your console logs
      'push-up_jacks', // From your console logs (note the hyphen!)
      'mountain_climbers',
      'jumping_jacks'
    ];
    
    console.log('Testing exercises that commonly appear in HIIT workouts:');
    
    for (const exerciseId of commonHIITExercises) {
      console.log(`\\n🔍 Testing: "${exerciseId}"`);
      
      // Check local mapping availability
      const hasLocalMapping = this.checkLocalMapping(exerciseId);
      console.log(`   Local mapping: ${hasLocalMapping ? '✅ Available' : '❌ Missing'}`);
      
      // Check for format variations that might cause key mismatches
      const variations = this.generateExerciseIdVariations(exerciseId);
      console.log(`   ID variations: ${variations.join(', ')}`);
      
      // Check if this exercise appeared in your console logs as successful
      const appearsInLogs = ['jump_squats', 'high_knees', 'push-up_jacks'].includes(exerciseId);
      console.log(`   Appeared in console logs: ${appearsInLogs ? '✅ Yes' : '❌ No'}`);
      
      if (appearsInLogs && !hasLocalMapping) {
        this.debugInfo.push({
          issue: 'Console Success but No Local Mapping',
          exerciseId,
          description: 'Exercise succeeded in console logs but has no local mapping'
        });
      }
    }
    
    console.log('');
  }

  checkLocalMapping(exercise) {
    // Based on the working GIFs we know about
    const knownMappings = [
      'burpees', 'burpee',
      'mountain_climbers', 'mountain_climber',
      'jumping_jacks', 'jumping_jack',
      'push_ups', 'push_up',
      'plank'
    ];
    
    return knownMappings.some(mapping => 
      mapping === exercise || 
      mapping === exercise.replace(/_/g, '') ||
      mapping === exercise.replace(/-/g, '_')
    );
  }

  generateExerciseIdVariations(exerciseId) {
    return [
      exerciseId,
      exerciseId.replace(/_/g, '-'),
      exerciseId.replace(/-/g, '_'),
      exerciseId.replace(/s$/, ''),
      exerciseId + 's'
    ].filter((v, i, arr) => arr.indexOf(v) === i); // Remove duplicates
  }

  async analyzeWorkoutSessionDataFlow() {
    console.log('🔄 TEST 3: WorkoutSessionScreen Data Flow Analysis');
    console.log('-'.repeat(40));
    
    const workoutScreenFile = path.join(__dirname, 'src/screens/workout/WorkoutSessionScreen.tsx');
    
    if (!fs.existsSync(workoutScreenFile)) {
      console.log('❌ WorkoutSessionScreen.tsx not found for analysis');
      return;
    }
    
    const content = fs.readFileSync(workoutScreenFile, 'utf8');
    
    // Analyze the critical state update section
    console.log('🔍 Analyzing state update logic:');
    
    // Look for the preloading useEffect
    const preloadingUseEffect = content.includes('useEffect') && content.includes('preloadWorkoutVisuals');
    console.log(`   Preloading useEffect: ${preloadingUseEffect ? '✅ Found' : '❌ Missing'}`);
    
    // Look for the Map to Object conversion
    if (content.includes('preloadedVisuals.forEach')) {
      console.log('   ✅ Found Map to Object conversion logic');
      
      // Extract the conversion logic
      const lines = content.split('\\n');
      const forEachLine = lines.find(line => line.includes('preloadedVisuals.forEach'));
      if (forEachLine) {
        console.log(`   📄 Conversion logic: ${forEachLine.trim()}`);
      }
      
      // Check if setExerciseVisuals is called after the conversion
      const hasStateUpdate = content.includes('setExerciseVisuals(visuals)');
      console.log(`   State update call: ${hasStateUpdate ? '✅ Found' : '❌ Missing'}`);
      
      if (!hasStateUpdate) {
        this.debugInfo.push({
          issue: 'Missing State Update',
          description: 'preloadedVisuals.forEach exists but setExerciseVisuals might not be called'
        });
      }
    } else {
      console.log('   ❌ Map to Object conversion logic not found');
      this.debugInfo.push({
        issue: 'Missing Map Conversion',
        description: 'preloadedVisuals.forEach conversion logic not found'
      });
    }
    
    // Check the prop passing
    console.log('\\n🔗 Analyzing prop passing:');
    if (content.includes('matchResult={exerciseVisuals[')) {
      console.log('   ✅ Found prop passing to ExerciseGifPlayer');
      
      // Extract the exact prop passing line
      const lines = content.split('\\n');
      const propLine = lines.find(line => line.includes('matchResult={exerciseVisuals['));
      if (propLine) {
        console.log(`   📄 Prop passing: ${propLine.trim()}`);
        
        // Check if the key format is consistent
        if (propLine.includes('currentExercise.exerciseId')) {
          console.log('   🔍 Uses currentExercise.exerciseId as key');
          this.debugInfo.push({
            issue: 'Key Format Check Needed',
            description: 'Verify currentExercise.exerciseId matches preloaded exercise keys'
          });
        }
      }
    } else {
      console.log('   ❌ Prop passing to ExerciseGifPlayer not found');
      this.debugInfo.push({
        issue: 'Missing Prop Passing',
        description: 'matchResult prop not passed to ExerciseGifPlayer'
      });
    }
    
    console.log('');
  }

  async testExerciseIdMatching() {
    console.log('🎯 TEST 4: Exercise ID Matching');
    console.log('-'.repeat(40));
    
    // Based on your console logs, let's see what keys are being used
    const consoleLogExercises = [
      'jump_squats',   // "🎯 BULLETPROOF SEARCH: "jump_squats" -> "jump_squats""
      'high_knees',    // "✅ TIER 1 SUCCESS: "High Knees" (Local mapping)"
      'push-up_jacks'  // "🔍 Fuzzy matched "push-up_jacks" to "push_ups""
    ];
    
    console.log('Exercise IDs from console logs:');
    consoleLogExercises.forEach((id, index) => {
      console.log(`   ${index + 1}. "${id}"`);
      
      // Check potential key variations
      const variations = this.generateExerciseIdVariations(id);
      console.log(`      Variations: ${variations.join(', ')}`);
      
      // Check if any variation would work in local mappings
      const workingVariation = variations.find(v => this.checkLocalMapping(v));
      console.log(`      Working variation: ${workingVariation || 'None'}`);
    });
    
    // Test the specific case from your screenshot
    console.log('\\n🎯 Specific test for "burpees":');
    const burpeeVariations = this.generateExerciseIdVariations('burpees');
    console.log(`   Possible keys: ${burpeeVariations.join(', ')}`);
    
    // What would happen if the key is different?
    console.log('\\n⚠️  Key mismatch simulation:');
    console.log('   Preloading stores: "burpee" → ExerciseMatchResult');
    console.log('   Component looks up: exerciseVisuals["burpees"] → undefined');
    console.log('   Result: "THIS CONTENT IS NOT AVAILABLE"');
    
    this.debugInfo.push({
      issue: 'Exercise ID Key Mismatch',
      description: 'Preloading and component lookup may use different key formats',
      example: 'Preloading stores as "burpee", component looks up "burpees"'
    });
    
    console.log('');
  }

  async testGifUrl(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  generateWorkoutTestReport() {
    console.log('📋 REAL WORKOUT TEST REPORT');
    console.log('='.repeat(60));
    
    console.log('🔍 KEY FINDINGS:');
    this.debugInfo.forEach((info, index) => {
      console.log(`\\n${index + 1}. ${info.issue}`);
      console.log(`   Description: ${info.description}`);
      if (info.exerciseId) {
        console.log(`   Exercise: ${info.exerciseId}`);
      }
      if (info.example) {
        console.log(`   Example: ${info.example}`);
      }
    });
    
    console.log('\\n🎯 MOST LIKELY ROOT CAUSE:');
    console.log('The bulletproof system works perfectly (100% success in console),');
    console.log('but there\'s a KEY MISMATCH between:');
    console.log('  • How exercises are stored during preloading');
    console.log('  • How they\'re looked up in the component');
    console.log('');
    console.log('Example:');
    console.log('  ✅ Bulletproof system finds "burpees" → stores as "burpee"');
    console.log('  ❌ Component looks up exerciseVisuals["burpees"] → undefined');
    console.log('  Result: Shows "THIS CONTENT IS NOT AVAILABLE"');
    
    console.log('\\n🔧 RECOMMENDED FIXES:');
    console.log('1. Add debugging logs to verify exact keys used in preloading vs lookup');
    console.log('2. Ensure consistent key format throughout the chain');
    console.log('3. Add fallback logic to try key variations if exact match fails');
    console.log('4. Add error handling in ExerciseGifPlayer for missing matchResult');
    
    console.log('\\n🧪 NEXT TESTING STEPS:');
    console.log('1. Add console.log in WorkoutSessionScreen to log exerciseVisuals keys');
    console.log('2. Add console.log in ExerciseGifPlayer to log received matchResult');
    console.log('3. Test with "burpees" exercise specifically');
    console.log('4. Verify the fix resolves the UI error');
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      debugInfo: this.debugInfo,
      conclusion: 'Key mismatch between preloading and component lookup'
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'workout-test-report.json'),
      JSON.stringify(reportData, null, 2)
    );
    
    console.log('\\n💾 Detailed report saved to: workout-test-report.json');
  }
}

// Main execution
async function main() {
  const tester = new RealWorkoutTester();
  await tester.testRealWorkoutScenarios();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { RealWorkoutTester };