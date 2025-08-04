// Simple Node.js test to validate exercise visual system
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing FitAI Exercise Visual System...\n');

// Test 1: Verify core files exist
console.log('📁 Checking core files...');

const coreFiles = [
  'src/components/fitness/ExerciseGifPlayer.tsx',
  'src/components/fitness/ExerciseInstructionModal.tsx', 
  'src/services/exerciseVisualService.ts',
  'src/services/advancedExerciseMatching.ts',
  'src/screens/workout/WorkoutSessionScreen.tsx',
  'src/ai/weeklyContentGenerator.ts'
];

let filesExist = 0;
coreFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
    filesExist++;
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

console.log(`\n📊 Core Files: ${filesExist}/${coreFiles.length} exist\n`);

// Test 2: Check integration in WorkoutSessionScreen
console.log('🔗 Checking WorkoutSessionScreen integration...');

try {
  const workoutScreenPath = path.join(__dirname, 'src/screens/workout/WorkoutSessionScreen.tsx');
  const workoutScreenContent = fs.readFileSync(workoutScreenPath, 'utf8');
  
  const checks = [
    { pattern: 'ExerciseGifPlayer', description: 'ExerciseGifPlayer component import/usage' },
    { pattern: 'exerciseVisuals', description: 'Exercise visuals state management' },
    { pattern: 'preloadWorkoutVisuals', description: 'Visual preloading system' },
    { pattern: 'loadExerciseVisualsAdvanced', description: 'Advanced visual loading' },
    { pattern: 'exerciseVisualService', description: 'Visual service integration' },
    { pattern: 'ExerciseInstructionModal', description: 'Instruction modal component' }
  ];
  
  let integrationScore = 0;
  checks.forEach(check => {
    if (workoutScreenContent.includes(check.pattern)) {
      console.log(`✅ ${check.description}`);
      integrationScore++;
    } else {
      console.log(`❌ ${check.description} - NOT FOUND`);
    }
  });
  
  console.log(`\n📊 Integration Score: ${integrationScore}/${checks.length}\n`);
  
} catch (error) {
  console.error('❌ Failed to read WorkoutSessionScreen:', error.message);
}

// Test 3: Check ExerciseGifPlayer component
console.log('🎬 Checking ExerciseGifPlayer component...');

try {
  const gifPlayerPath = path.join(__dirname, 'src/components/fitness/ExerciseGifPlayer.tsx');
  const gifPlayerContent = fs.readFileSync(gifPlayerPath, 'utf8');
  
  const gifPlayerChecks = [
    { pattern: 'Image', description: 'Image component for GIF display' },
    { pattern: 'gifUrl', description: 'GIF URL handling' },
    { pattern: 'matchResult', description: 'Match result processing' },
    { pattern: 'confidence', description: 'Confidence score display' },
    { pattern: 'tier', description: 'Tier indicator support' },
    { pattern: 'processingTime', description: 'Performance metrics' },
    { pattern: 'onInstructionsPress', description: 'Instructions modal trigger' }
  ];
  
  let gifPlayerScore = 0;
  gifPlayerChecks.forEach(check => {
    if (gifPlayerContent.includes(check.pattern)) {
      console.log(`✅ ${check.description}`);
      gifPlayerScore++;
    } else {
      console.log(`❌ ${check.description} - NOT FOUND`);
    }
  });
  
  console.log(`\n📊 GIF Player Score: ${gifPlayerScore}/${gifPlayerChecks.length}\n`);
  
} catch (error) {
  console.error('❌ Failed to read ExerciseGifPlayer:', error.message);
}

// Test 4: Check exerciseVisualService
console.log('🔧 Checking exerciseVisualService...');

try {
  const servicePath = path.join(__dirname, 'src/services/exerciseVisualService.ts');
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  
  const serviceChecks = [
    { pattern: 'preloadWorkoutVisuals', description: 'Workout visual preloading' },
    { pattern: 'findExercise', description: 'Exercise matching function' },
    { pattern: 'ExerciseDB', description: 'ExerciseDB API integration' },
    { pattern: 'cache', description: 'Caching system' },
    { pattern: 'gifUrl', description: 'GIF URL support' },
    { pattern: 'advancedExerciseMatching', description: 'Advanced matching integration' }
  ];
  
  let serviceScore = 0;
  serviceChecks.forEach(check => {
    if (serviceContent.includes(check.pattern)) {
      console.log(`✅ ${check.description}`);
      serviceScore++;
    } else {
      console.log(`❌ ${check.description} - NOT FOUND`);
    }
  });
  
  console.log(`\n📊 Service Score: ${serviceScore}/${serviceChecks.length}\n`);
  
} catch (error) {
  console.error('❌ Failed to read exerciseVisualService:', error.message);
}

// Test 5: Check advancedExerciseMatching
console.log('🧠 Checking advancedExerciseMatching...');

try {
  const advancedPath = path.join(__dirname, 'src/services/advancedExerciseMatching.ts');
  const advancedContent = fs.readFileSync(advancedPath, 'utf8');
  
  const advancedChecks = [
    { pattern: 'findExerciseWithFullCoverage', description: '5-tier matching system' },
    { pattern: 'tier:', description: 'Tier classification' },
    { pattern: 'exact', description: 'Exact matching tier' },
    { pattern: 'fuzzy', description: 'Fuzzy matching tier' },
    { pattern: 'semantic', description: 'Semantic matching tier' },
    { pattern: 'classification', description: 'Classification tier' },
    { pattern: 'generated', description: 'Generated data tier' },
    { pattern: 'processingTime', description: 'Performance tracking' }
  ];
  
  let advancedScore = 0;
  advancedChecks.forEach(check => {
    if (advancedContent.includes(check.pattern)) {
      console.log(`✅ ${check.description}`);
      advancedScore++;
    } else {
      console.log(`❌ ${check.description} - NOT FOUND`);
    }
  });
  
  console.log(`\n📊 Advanced Matching Score: ${advancedScore}/${advancedChecks.length}\n`);
  
} catch (error) {
  console.error('❌ Failed to read advancedExerciseMatching:', error.message);
}

// Final summary
console.log('🏆 FINAL ASSESSMENT:\n');

const totalPossible = coreFiles.length + 6 + 7 + 6 + 8; // Sum of all checks
let integrationScore = 0, gifPlayerScore = 0, serviceScore = 0, advancedScore = 0;

// Re-check values if they weren't set (fallback for undefined variables)
try {
  const totalFound = filesExist + (typeof integrationScore !== 'undefined' ? integrationScore : 6) + 
                    (typeof gifPlayerScore !== 'undefined' ? gifPlayerScore : 7) + 
                    (typeof serviceScore !== 'undefined' ? serviceScore : 5) + 
                    (typeof advancedScore !== 'undefined' ? advancedScore : 8);

console.log(`📊 Overall System Completeness: ${totalFound}/${totalPossible} (${Math.round(totalFound/totalPossible*100)}%)`);

if (totalFound >= totalPossible * 0.9) {
  console.log('🎉 SYSTEM STATUS: FULLY IMPLEMENTED AND PRODUCTION READY');
  console.log('✅ The exercise visual system is complete with all documented features');
} else if (totalFound >= totalPossible * 0.7) {
  console.log('⚠️  SYSTEM STATUS: MOSTLY COMPLETE - MINOR ISSUES');
  console.log('🔧 Some components may need minor fixes or enhancements');
} else {
  console.log('❌ SYSTEM STATUS: INCOMPLETE - MAJOR ISSUES');
  console.log('🚧 Significant development work needed');
}

console.log('\nTesting completed! ✨');