/**
 * Debug Constraint System
 * 
 * Check if the exercise constraint system is working properly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DEBUGGING CONSTRAINT SYSTEM');
console.log('=' .repeat(50));

// 1. Check if exerciseFilterService has proper exports
const filterServicePath = path.join(__dirname, 'src/services/exerciseFilterService.ts');
if (fs.existsSync(filterServicePath)) {
  const serviceContent = fs.readFileSync(filterServicePath, 'utf8');
  
  console.log('📋 ExerciseFilterService Status:');
  console.log('- File exists: ✅');
  console.log('- Has filterExercises method:', serviceContent.includes('filterExercises') ? '✅' : '❌');
  console.log('- Has getExerciseById method:', serviceContent.includes('getExerciseById') ? '✅' : '❌');
  console.log('- Has getAllExerciseIds method:', serviceContent.includes('getAllExerciseIds') ? '✅' : '❌');
  
  // Check if it's properly loading the database
  const loadsDatabase = serviceContent.includes('exerciseDatabase.min.json') || 
                       serviceContent.includes('require(') && serviceContent.includes('database');
  console.log('- Loads exercise database:', loadsDatabase ? '✅' : '❌');
} else {
  console.log('❌ ExerciseFilterService file not found');
}

// 2. Check if database has sufficient exercises
const dbPath = path.join(__dirname, 'src/data/exerciseDatabase.min.json');
if (fs.existsSync(dbPath)) {
  const database = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  console.log('\n📊 Exercise Database Status:');
  console.log('- Database file exists: ✅');
  console.log('- Total exercises:', database.exercises?.length || 0);
  console.log('- Has exerciseId field:', database.exercises?.[0]?.exerciseId ? '✅' : '❌');
  
  // Sample some exercise IDs
  if (database.exercises?.length > 0) {
    console.log('- Sample exercise IDs:');
    database.exercises.slice(0, 5).forEach((ex, i) => {
      console.log(`  ${i + 1}. ${ex.exerciseId} - ${ex.name}`);
    });
  }
} else {
  console.log('❌ Exercise database file not found');
}

// 3. Check if AI prompt construction is using constraint system
const generatorPath = path.join(__dirname, 'src/ai/weeklyContentGenerator.ts');
if (fs.existsSync(generatorPath)) {
  const generatorContent = fs.readFileSync(generatorPath, 'utf8');
  
  console.log('\n🤖 AI Constraint System Status:');
  console.log('- Uses exerciseFilterService:', generatorContent.includes('exerciseFilterService') ? '✅' : '❌');
  console.log('- Has CRITICAL constraint prompt:', generatorContent.includes('CRITICAL: EXERCISE SELECTION') ? '✅' : '❌');
  console.log('- Lists exercise IDs in prompt:', generatorContent.includes('ID: ${ex.exerciseId}') ? '✅' : '❌');
  console.log('- Warns against creating new exercises:', generatorContent.includes('DO NOT create new exercises') ? '✅' : '❌');
} else {
  console.log('❌ WeeklyContentGenerator file not found');
}

// 4. Check specific exercise that failed
console.log('\n🚨 Specific Issue Analysis:');
console.log('- Failed exercise: "dynamic_elevators"');
console.log('- This is clearly a descriptive name, not a database ID');
console.log('- Database IDs are like: VPPtusI, 8d8qJQI, JGKowMS');
console.log('- AI is ignoring the constraint system');

console.log('\n🎯 DIAGNOSIS:');
console.log('The AI is receiving the constraint prompts but ignoring them.');
console.log('It\'s creating custom exercise names instead of using provided IDs.');
console.log('This suggests the constraint prompts need to be stronger or the AI model configuration needs adjustment.');

console.log('\n💡 SOLUTION NEEDED:');
console.log('1. Strengthen the constraint prompts with more explicit instructions');
console.log('2. Add validation to reject AI responses that don\'t use database IDs');
console.log('3. Implement retry logic with stricter prompts if validation fails');