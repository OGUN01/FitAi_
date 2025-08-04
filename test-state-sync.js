/**
 * State Synchronization Debugging Test
 * 
 * This test identifies the disconnect between:
 * 1. Bulletproof system success (console logs show 100% success)
 * 2. UI showing "THIS CONTENT IS NOT AVAILABLE"
 * 
 * The issue is likely in the React state management between:
 * - exerciseVisualService.findExercise() results
 * - WorkoutSessionScreen exerciseVisuals state
 * - ExerciseGifPlayer component props
 */

const fs = require('fs');
const path = require('path');

class StateSyncDebugger {
  constructor() {
    this.issues = [];
    this.findings = [];
  }

  async debugStateSynchronization() {
    console.log('🔍 STATE SYNCHRONIZATION DEBUGGING');
    console.log('='.repeat(60));
    console.log('Analyzing the disconnect between bulletproof system success and UI errors');
    console.log('');

    // Step 1: Analyze WorkoutSessionScreen state management
    await this.analyzeWorkoutSessionScreen();
    
    // Step 2: Analyze ExerciseGifPlayer component logic
    await this.analyzeExerciseGifPlayer();
    
    // Step 3: Analyze preloading process
    await this.analyzePreloadingProcess();
    
    // Step 4: Analyze prop passing
    await this.analyzePropPassing();
    
    // Step 5: Generate fix recommendations
    this.generateFixRecommendations();
  }

  async analyzeWorkoutSessionScreen() {
    console.log('📱 ANALYZING: WorkoutSessionScreen.tsx');
    console.log('-'.repeat(40));
    
    const filePath = path.join(__dirname, 'src/screens/workout/WorkoutSessionScreen.tsx');
    
    if (!fs.existsSync(filePath)) {
      this.issues.push('WorkoutSessionScreen.tsx not found');
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check state initialization
    const stateInit = content.includes('const [exerciseVisuals, setExerciseVisuals] = useState<ExerciseVisualData>({});');
    console.log(`✅ State initialization: ${stateInit ? 'Found' : 'Missing'}`);
    if (!stateInit) {
      this.issues.push('exerciseVisuals state initialization not found');
    }
    
    // Check preloading logic
    const preloadingExists = content.includes('exerciseVisualService.preloadWorkoutVisuals');
    console.log(`✅ Preloading logic: ${preloadingExists ? 'Found' : 'Missing'}`);
    if (!preloadingExists) {
      this.issues.push('Preloading logic not found');
    }
    
    // Check state update after preloading
    const stateUpdatePattern = /setExerciseVisuals\\(.*\\)/g;
    const stateUpdates = content.match(stateUpdatePattern);
    console.log(`✅ State updates found: ${stateUpdates ? stateUpdates.length : 0}`);
    
    if (stateUpdates) {
      stateUpdates.forEach((update, index) => {
        console.log(`   ${index + 1}. ${update.substring(0, 50)}...`);
      });
    }
    
    // Check prop passing to ExerciseGifPlayer
    const propPassingPattern = /matchResult={exerciseVisuals\\[.*\\]}/g;
    const propPassing = content.match(propPassingPattern);
    console.log(`✅ Prop passing to ExerciseGifPlayer: ${propPassing ? 'Found' : 'Missing'}`);
    
    if (propPassing) {
      propPassing.forEach((prop, index) => {
        console.log(`   ${index + 1}. ${prop}`);
      });
    }
    
    // CRITICAL FINDING: Check if preloaded results are properly stored
    const preloadStoragePattern = /preloadedVisuals\.forEach.*setExerciseVisuals/s;
    const properStorage = preloadStoragePattern.test(content);
    console.log(`🔍 CRITICAL: Preloaded results properly stored: ${properStorage ? 'Yes' : 'No'}`);
    
    if (!properStorage) {
      this.issues.push('CRITICAL: Preloaded results may not be properly stored in state');
      this.findings.push({
        type: 'critical',
        component: 'WorkoutSessionScreen',
        issue: 'Preloaded exercise visuals may not be stored in exerciseVisuals state',
        description: 'The bulletproof system finds exercises successfully, but the results may not be saved to React state'
      });
    }
    
    console.log('');
  }

  async analyzeExerciseGifPlayer() {
    console.log('🎬 ANALYZING: ExerciseGifPlayer.tsx');
    console.log('-'.repeat(40));
    
    const filePath = path.join(__dirname, 'src/components/fitness/ExerciseGifPlayer.tsx');
    
    if (!fs.existsSync(filePath)) {
      this.issues.push('ExerciseGifPlayer.tsx not found');
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check props interface
    const propsInterface = content.includes('matchResult?: ExerciseMatchResult | AdvancedMatchResult;');
    console.log(`✅ Props interface: ${propsInterface ? 'Correct' : 'Missing/Incorrect'}`);
    
    // Check exercise data extraction
    const dataExtraction = content.includes('const exercise = exerciseData || matchResult?.exercise;');
    console.log(`✅ Exercise data extraction: ${dataExtraction ? 'Found' : 'Missing'}`);
    
    // CRITICAL: Check null handling
    const nullHandling = content.includes('if (!exercise?.gifUrl)');
    console.log(`🔍 CRITICAL: Null exercise handling: ${nullHandling ? 'Found' : 'Missing'}`);
    
    if (nullHandling) {
      // Find what happens when exercise is null
      const placeholderPattern = /No visual found for|No exercise data|THIS CONTENT IS NOT AVAILABLE/;
      const placeholderMessages = content.match(placeholderPattern);
      
      if (placeholderMessages) {
        console.log(`   📝 Placeholder messages found: ${placeholderMessages.length}`);
        placeholderMessages.forEach((msg, index) => {
          console.log(`      ${index + 1}. "${msg}"`);
        });
      }
      
      // Check if it shows the specific error message
      const specificError = content.includes('THIS CONTENT IS NOT AVAILABLE');
      if (!specificError) {
        // Look for the actual placeholder text
        const actualPlaceholderPattern = /placeholderText[^}]*}/s;
        const actualPlaceholder = content.match(actualPlaceholderPattern);
        if (actualPlaceholder) {
          console.log(`   📝 Actual placeholder logic: ${actualPlaceholder[0].substring(0, 100)}...`);
        }
      }
    }
    
    // Check if component tries to fetch data when matchResult is null
    const fallbackFetchPattern = /findExercise|bulletproof/i;
    const hasFallbackFetch = fallbackFetchPattern.test(content);
    console.log(`🔄 Fallback fetch capability: ${hasFallbackFetch ? 'Present' : 'Missing'}`);
    
    if (!hasFallbackFetch) {
      this.findings.push({
        type: 'improvement',
        component: 'ExerciseGifPlayer',
        issue: 'No fallback fetch when matchResult is null',
        description: 'Component should attempt to fetch exercise data if not provided via props'
      });
    }
    
    // CRITICAL FINDING: Check useEffect dependency on matchResult
    const hasMatchResultEffect = content.includes('useEffect') && content.includes('matchResult');
    console.log(`🔍 CRITICAL: useEffect watches matchResult: ${hasMatchResultEffect ? 'Yes' : 'No'}`);
    
    if (!hasMatchResultEffect) {
      this.findings.push({
        type: 'critical',
        component: 'ExerciseGifPlayer',
        issue: 'Component may not react to matchResult prop changes',
        description: 'useEffect should watch matchResult to update when state changes'
      });
    }
    
    console.log('');
  }

  async analyzePreloadingProcess() {
    console.log('⚡ ANALYZING: Preloading Process');
    console.log('-'.repeat(40));
    
    const serviceFile = path.join(__dirname, 'src/services/exerciseVisualService.ts');
    
    if (!fs.existsSync(serviceFile)) {
      this.issues.push('exerciseVisualService.ts not found');
      return;
    }
    
    const content = fs.readFileSync(serviceFile, 'utf8');
    
    // Check preloadWorkoutVisuals method
    const preloadMethod = content.includes('async preloadWorkoutVisuals');
    console.log(`✅ preloadWorkoutVisuals method: ${preloadMethod ? 'Found' : 'Missing'}`);
    
    // Check return type of preloading
    const returnPattern = /preloadWorkoutVisuals.*Promise.*Map.*ExerciseMatchResult/s;
    const correctReturnType = returnPattern.test(content);
    console.log(`✅ Correct return type: ${correctReturnType ? 'Yes' : 'No'}`);
    
    // Check if getWorkingGifUrl is applied during preloading
    const gifUrlFixPattern = /getWorkingGifUrl.*preload/s;
    const hasGifUrlFix = gifUrlFixPattern.test(content) || content.includes('getWorkingGifUrl');
    console.log(`🔧 GIF URL fix in preloading: ${hasGifUrlFix ? 'Present' : 'Missing'}`);
    
    // CRITICAL: Check if preloaded results include the fixed GIF URLs
    const storeFixedUrls = content.includes('getWorkingGifUrl');
    console.log(`🔍 CRITICAL: Fixed URLs stored in results: ${storeFixedUrls ? 'Yes' : 'No'}`);
    
    if (!storeFixedUrls) {
      this.findings.push({
        type: 'critical',
        component: 'exerciseVisualService',
        issue: 'Fixed GIF URLs may not be stored in preloaded results',
        description: 'The getWorkingGifUrl fix may not be applied to preloaded exercise data'
      });
    }
    
    console.log('');
  }

  async analyzePropPassing() {
    console.log('🔗 ANALYZING: Prop Passing Chain');
    console.log('-'.repeat(40));
    
    console.log('Data flow analysis:');
    console.log('1. exerciseVisualService.preloadWorkoutVisuals() → Map<string, ExerciseMatchResult | null>');
    console.log('2. WorkoutSessionScreen: setExerciseVisuals(converted map to object)');
    console.log('3. ExerciseGifPlayer: matchResult={exerciseVisuals[currentExercise.exerciseId]}');
    console.log('4. ExerciseGifPlayer: const exercise = exerciseData || matchResult?.exercise');
    console.log('5. ExerciseGifPlayer: if (!exercise?.gifUrl) → Show placeholder');
    
    console.log('\\n🔍 POTENTIAL ISSUES:');
    
    // Issue 1: Map to Object conversion
    console.log('1. Map to Object conversion in WorkoutSessionScreen:');
    console.log('   - preloadWorkoutVisuals returns Map<string, ExerciseMatchResult | null>');
    console.log('   - exerciseVisuals state expects Record<string, ExerciseMatchResult | null>');
    console.log('   - Conversion may lose data or create timing issues');
    
    this.findings.push({
      type: 'potential',
      component: 'Data Flow',
      issue: 'Map to Object conversion may cause data loss',
      description: 'Converting Map to Object in state update may not preserve all data'
    });
    
    // Issue 2: Async timing
    console.log('\\n2. Async timing issues:');
    console.log('   - Preloading is async but component renders immediately');
    console.log('   - State update may happen after component has already rendered with null data');
    console.log('   - Component may not re-render when state updates');
    
    this.findings.push({
      type: 'potential',
      component: 'Timing',
      issue: 'Async state updates may not trigger re-renders',
      description: 'Component renders before preloading completes, may not update when data arrives'
    });
    
    // Issue 3: Key mismatch
    console.log('\\n3. Exercise ID key mismatch:');
    console.log('   - currentExercise.exerciseId used as key');
    console.log('   - Preloading may use different key format');
    console.log('   - exerciseVisuals[currentExercise.exerciseId] may return undefined');
    
    this.findings.push({
      type: 'potential',
      component: 'Key Matching',
      issue: 'Exercise ID keys may not match between preloading and lookup',
      description: 'exerciseVisuals[exerciseId] may return undefined due to key mismatch'
    });
    
    console.log('');
  }

  generateFixRecommendations() {
    console.log('🔧 FIX RECOMMENDATIONS');
    console.log('='.repeat(60));
    
    console.log('Based on analysis, here are the likely causes and fixes:\\n');
    
    // Priority 1: Critical Issues
    const criticalIssues = this.findings.filter(f => f.type === 'critical');
    if (criticalIssues.length > 0) {
      console.log('🚨 CRITICAL ISSUES (Fix these first):');
      criticalIssues.forEach((issue, index) => {
        console.log(`\\n${index + 1}. ${issue.component}: ${issue.issue}`);
        console.log(`   Description: ${issue.description}`);
        console.log(`   Fix: ${this.getFixForIssue(issue)}`);
      });
    }
    
    // Priority 2: Potential Issues
    const potentialIssues = this.findings.filter(f => f.type === 'potential');
    if (potentialIssues.length > 0) {
      console.log('\\n⚠️  POTENTIAL ISSUES (Check these):');
      potentialIssues.forEach((issue, index) => {
        console.log(`\\n${index + 1}. ${issue.component}: ${issue.issue}`);
        console.log(`   Description: ${issue.description}`);
        console.log(`   Fix: ${this.getFixForIssue(issue)}`);
      });
    }
    
    console.log('\\n🎯 RECOMMENDED DEBUGGING STEPS:');
    console.log('1. Add console.log in WorkoutSessionScreen to verify exerciseVisuals state');
    console.log('2. Add console.log in ExerciseGifPlayer to verify matchResult prop');
    console.log('3. Check if exercise IDs match between preloading and component lookup');
    console.log('4. Verify timing of state updates vs component rendering');
    console.log('5. Test with specific exercise (burpees) that shows error in screenshot');
    
    console.log('\\n🚀 IMPLEMENTATION PLAN:');
    console.log('1. Add comprehensive debugging logs');
    console.log('2. Fix state synchronization issues');
    console.log('3. Add fallback logic to ExerciseGifPlayer');
    console.log('4. Test with real workout scenario');
    console.log('5. Verify fix resolves "THIS CONTENT IS NOT AVAILABLE" error');
  }

  getFixForIssue(issue) {
    const fixes = {
      'Preloaded results may not be stored in exerciseVisuals state': 
        'Ensure preloadedVisuals.forEach() properly updates state with fixed GIF URLs',
      
      'Component may not react to matchResult prop changes': 
        'Add useEffect with [matchResult] dependency to handle prop changes',
        
      'No fallback fetch when matchResult is null': 
        'Add fallback logic to fetch exercise data if matchResult is null/undefined',
        
      'Fixed GIF URLs may not be stored in preloaded results': 
        'Apply getWorkingGifUrl() fix during preloading process',
        
      'Map to Object conversion may cause data loss': 
        'Verify Map.forEach conversion preserves all exercise data',
        
      'Async state updates may not trigger re-renders': 
        'Use proper React state updates and loading states',
        
      'Exercise ID keys may not match between preloading and lookup': 
        'Ensure consistent exercise ID format throughout the chain'
    };
    
    return fixes[issue.issue] || 'Requires investigation';
  }
}

// Main execution
async function main() {
  const syncDebugger = new StateSyncDebugger();
  await syncDebugger.debugStateSynchronization();
  
  console.log('\\n💾 Analysis complete. Ready to implement fixes based on findings.');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { StateSyncDebugger };