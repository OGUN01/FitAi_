/**
 * Build Complete Exercise Database
 * Fetches all 1500 exercises from Vercel API to create comprehensive database
 */

const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'https://exercisedata.vercel.app/api/v1';
const OUTPUT_FILE = './src/data/exerciseDatabase.json';
const BATCH_SIZE = 50; // Fetch 50 exercises per request
const DELAY_MS = 200; // 200ms delay between requests to avoid rate limiting

class ExerciseDatabaseBuilder {
  constructor() {
    this.exercises = [];
    this.totalExercises = 1500;
    this.processedCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }

  async buildDatabase() {
    console.log('🏗️  Building Complete Exercise Database');
    console.log('=' .repeat(60));
    console.log(`📊 Target: ${this.totalExercises} exercises from Vercel API`);
    console.log(`⚡ Batch size: ${BATCH_SIZE} exercises per request`);
    console.log(`⏱️  Delay: ${DELAY_MS}ms between requests`);
    console.log('');

    // Calculate number of batches needed
    const totalBatches = Math.ceil(this.totalExercises / BATCH_SIZE);
    console.log(`🚀 Starting ${totalBatches} batch requests...`);

    for (let batch = 0; batch < totalBatches; batch++) {
      const offset = batch * BATCH_SIZE;
      const currentBatch = batch + 1;
      
      console.log(`\n📦 Batch ${currentBatch}/${totalBatches} (offset: ${offset})`);
      
      try {
        const batchData = await this.fetchBatch(offset, BATCH_SIZE);
        
        if (batchData && batchData.length > 0) {
          this.exercises.push(...batchData);
          this.processedCount += batchData.length;
          
          console.log(`   ✅ Fetched ${batchData.length} exercises`);
          console.log(`   📊 Progress: ${this.processedCount}/${this.totalExercises} (${Math.round(this.processedCount/this.totalExercises*100)}%)`);
          
          // Show sample exercise
          const sample = batchData[0];
          console.log(`   📋 Sample: "${sample.name}" (${sample.exerciseId})`);
          console.log(`   🎬 GIF: ${sample.gifUrl ? '✅' : '❌'}`);
        } else {
          console.log(`   ⚠️  No data in batch ${currentBatch}`);
          this.errorCount++;
        }
        
      } catch (error) {
        console.error(`   ❌ Batch ${currentBatch} failed:`, error.message);
        this.errorCount++;
        
        // Continue with next batch instead of stopping
      }
      
      // Add delay between requests to be respectful
      if (currentBatch < totalBatches) {
        await this.delay(DELAY_MS);
      }
    }

    // Process and save the database
    await this.processAndSaveDatabase();
  }

  async fetchBatch(offset, limit) {
    try {
      const url = `${BASE_URL}/exercises?offset=${offset}&limit=${limit}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data && Array.isArray(result.data)) {
        return result.data;
      } else {
        throw new Error('Invalid response format');
      }
      
    } catch (error) {
      throw new Error(`Fetch failed: ${error.message}`);
    }
  }

  async processAndSaveDatabase() {
    console.log('\n🔧 Processing Exercise Database');
    console.log('=' .repeat(60));
    
    // Remove duplicates based on exerciseId
    const uniqueExercises = this.exercises.filter((exercise, index, array) => 
      array.findIndex(e => e.exerciseId === exercise.exerciseId) === index
    );
    
    console.log(`📊 Total exercises fetched: ${this.exercises.length}`);
    console.log(`📊 Unique exercises: ${uniqueExercises.length}`);
    console.log(`📊 Duplicates removed: ${this.exercises.length - uniqueExercises.length}`);
    
    // Analyze the data
    const withGifs = uniqueExercises.filter(ex => ex.gifUrl && ex.gifUrl.trim() !== '').length;
    const muscleGroups = [...new Set(uniqueExercises.flatMap(ex => ex.targetMuscles || []))];
    const bodyParts = [...new Set(uniqueExercises.flatMap(ex => ex.bodyParts || []))];
    const equipments = [...new Set(uniqueExercises.flatMap(ex => ex.equipments || []))];
    
    console.log(`\n📈 Database Analysis:`);
    console.log(`   🎬 Exercises with GIFs: ${withGifs}/${uniqueExercises.length} (${Math.round(withGifs/uniqueExercises.length*100)}%)`);
    console.log(`   💪 Muscle groups: ${muscleGroups.length}`);
    console.log(`   🫀 Body parts: ${bodyParts.length}`);
    console.log(`   🏋️ Equipment types: ${equipments.length}`);
    
    // Create comprehensive database structure
    const database = {
      metadata: {
        totalExercises: uniqueExercises.length,
        exercisesWithGifs: withGifs,
        gifCoveragePercent: Math.round(withGifs/uniqueExercises.length*100),
        muscleGroups: muscleGroups.sort(),
        bodyParts: bodyParts.sort(),
        equipments: equipments.sort(),
        buildDate: new Date().toISOString(),
        buildDurationMs: Date.now() - this.startTime,
        apiSource: BASE_URL,
        batchErrors: this.errorCount
      },
      exercises: uniqueExercises,
      
      // Create lookup indices for fast searching
      indices: {
        byName: this.createNameIndex(uniqueExercises),
        byMuscle: this.createMuscleIndex(uniqueExercises),
        byBodyPart: this.createBodyPartIndex(uniqueExercises),
        byEquipment: this.createEquipmentIndex(uniqueExercises)
      }
    };
    
    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    try {
      await fs.access(outputDir);
    } catch {
      await fs.mkdir(outputDir, { recursive: true });
      console.log(`📁 Created directory: ${outputDir}`);
    }
    
    // Save the database
    try {
      await fs.writeFile(OUTPUT_FILE, JSON.stringify(database, null, 2));
      console.log(`\n💾 Database saved to: ${OUTPUT_FILE}`);
      
      const stats = await fs.stat(OUTPUT_FILE);
      console.log(`📊 File size: ${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB`);
      
      // Also create a minified version for production
      const minifiedFile = OUTPUT_FILE.replace('.json', '.min.json');
      await fs.writeFile(minifiedFile, JSON.stringify(database));
      const minStats = await fs.stat(minifiedFile);
      console.log(`📊 Minified size: ${Math.round(minStats.size / 1024 / 1024 * 100) / 100} MB`);
      
    } catch (error) {
      console.error('❌ Failed to save database:', error);
      throw error;
    }
    
    // Generate summary report
    this.generateSummaryReport(database);
  }

  createNameIndex(exercises) {
    const index = {};
    exercises.forEach((exercise, idx) => {
      const name = exercise.name.toLowerCase();
      const words = name.split(/\s+/);
      
      // Index by full name
      index[name] = idx;
      
      // Index by individual words
      words.forEach(word => {
        if (word.length > 2) { // Skip very short words
          if (!index[word]) index[word] = [];
          if (Array.isArray(index[word]) && !index[word].includes(idx)) {
            index[word].push(idx);
          }
        }
      });
    });
    return index;
  }

  createMuscleIndex(exercises) {
    const index = {};
    exercises.forEach((exercise, idx) => {
      exercise.targetMuscles?.forEach(muscle => {
        const key = muscle.toLowerCase();
        if (!index[key]) index[key] = [];
        index[key].push(idx);
      });
    });
    return index;
  }

  createBodyPartIndex(exercises) {
    const index = {};
    exercises.forEach((exercise, idx) => {
      exercise.bodyParts?.forEach(part => {
        const key = part.toLowerCase();
        if (!index[key]) index[key] = [];
        index[key].push(idx);
      });
    });
    return index;
  }

  createEquipmentIndex(exercises) {
    const index = {};
    exercises.forEach((exercise, idx) => {
      exercise.equipments?.forEach(equipment => {
        const key = equipment.toLowerCase();
        if (!index[key]) index[key] = [];
        index[key].push(idx);
      });
    });
    return index;
  }

  generateSummaryReport(database) {
    console.log('\n📋 EXERCISE DATABASE SUMMARY REPORT');
    console.log('=' .repeat(60));
    
    const buildTimeMinutes = Math.round(database.metadata.buildDurationMs / 1000 / 60 * 100) / 100;
    
    console.log(`✅ Successfully built comprehensive exercise database!`);
    console.log(`📊 Total exercises: ${database.metadata.totalExercises}`);
    console.log(`🎬 GIF coverage: ${database.metadata.gifCoveragePercent}%`);
    console.log(`⏱️  Build time: ${buildTimeMinutes} minutes`);
    console.log(`❌ Batch errors: ${database.metadata.batchErrors}`);
    
    console.log(`\n🏷️  Top Muscle Groups:`);
    database.metadata.muscleGroups.slice(0, 10).forEach(muscle => {
      const count = database.indices.byMuscle[muscle.toLowerCase()]?.length || 0;
      console.log(`   ${muscle}: ${count} exercises`);
    });
    
    console.log(`\n🏋️ Top Equipment Types:`);
    database.metadata.equipments.slice(0, 10).forEach(equipment => {
      const count = database.indices.byEquipment[equipment.toLowerCase()]?.length || 0;
      console.log(`   ${equipment}: ${count} exercises`);
    });
    
    console.log(`\n💡 Usage Instructions:`);
    console.log(`1. Import database in exerciseVisualService.ts`);
    console.log(`2. Use indices for ultra-fast exercise lookup`);
    console.log(`3. 100% offline capability with GIF URLs`);
    console.log(`4. Perfect for AI-generated workout matching`);
    
    console.log(`\n🎯 Result: MILLION-DOLLAR EXERCISE SYSTEM READY! 🎯`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Build the database
async function main() {
  try {
    const builder = new ExerciseDatabaseBuilder();
    await builder.buildDatabase();
  } catch (error) {
    console.error('❌ Database build failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { ExerciseDatabaseBuilder };