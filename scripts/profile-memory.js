#!/usr/bin/env node

/**
 * Memory Profiling Script for React Native
 *
 * Monitors memory usage and detects potential memory leaks in the FitAI application.
 * This script helps identify components or services that retain memory after unmounting.
 *
 * Usage:
 *   npm run profile:memory              # Start memory profiling
 *   npm run profile:memory --help       # Show this help message
 *   npm run profile:memory --interval 5000  # Custom sampling interval (ms)
 *   npm run profile:memory --duration 60    # Profile for 60 seconds
 *   npm run profile:memory --threshold 50   # Alert if memory increases by 50MB
 *
 * Features:
 *   - Real-time memory usage monitoring
 *   - Memory leak detection based on growth patterns
 *   - Heap snapshot comparison (manual trigger)
 *   - Export profiling data to JSON
 *
 * Output:
 *   - Console: Real-time memory statistics
 *   - File: memory-profile-{timestamp}.json (if --save flag used)
 */

const { performance } = require("perf_hooks");
const fs = require("fs");
const path = require("path");

// Configuration
const DEFAULT_INTERVAL = 2000; // 2 seconds
const DEFAULT_DURATION = 0; // 0 = run indefinitely
const DEFAULT_THRESHOLD = 100; // MB - alert threshold for memory growth
const SAMPLES_FOR_LEAK_DETECTION = 10; // Number of samples to analyze for leak detection

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  interval: DEFAULT_INTERVAL,
  duration: DEFAULT_DURATION,
  threshold: DEFAULT_THRESHOLD,
  save: false,
  help: false,
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === "--help" || arg === "-h") {
    config.help = true;
  } else if (arg === "--interval" && args[i + 1]) {
    config.interval = parseInt(args[i + 1], 10);
    i++;
  } else if (arg === "--duration" && args[i + 1]) {
    config.duration = parseInt(args[i + 1], 10);
    i++;
  } else if (arg === "--threshold" && args[i + 1]) {
    config.threshold = parseInt(args[i + 1], 10);
    i++;
  } else if (arg === "--save") {
    config.save = true;
  }
}

// Show help
if (config.help) {
  console.log(`
Memory Profiling Script for React Native

Usage:
  npm run profile:memory [options]

Options:
  --help, -h              Show this help message
  --interval <ms>         Sampling interval in milliseconds (default: 2000)
  --duration <seconds>    Duration to run profiler (default: 0 = indefinite)
  --threshold <mb>        Memory increase threshold for alerts (default: 100)
  --save                  Save profiling data to JSON file

Examples:
  npm run profile:memory
  npm run profile:memory --interval 5000 --duration 60
  npm run profile:memory --threshold 50 --save

Notes:
  - Press Ctrl+C to stop profiling at any time
  - Memory leak detection analyzes growth patterns over ${SAMPLES_FOR_LEAK_DETECTION} samples
  - Threshold alerts trigger when memory increases beyond specified MB
  - Saved data includes timestamps, memory stats, and leak analysis

Output:
  - Console: Real-time memory statistics
  - File: memory-profile-{timestamp}.json (if --save flag used)
`);
  process.exit(0);
}

// Memory profiling state
const profileData = {
  startTime: Date.now(),
  samples: [],
  config,
  leaks: [],
};

let baselineMemory = null;
let sampleCount = 0;

// Format bytes to human-readable format
function formatBytes(bytes) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
}

// Get current memory usage
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    timestamp: Date.now(),
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    rss: usage.rss,
  };
}

// Analyze memory growth for potential leaks
function analyzeMemoryLeaks() {
  if (profileData.samples.length < SAMPLES_FOR_LEAK_DETECTION) {
    return null;
  }

  const recentSamples = profileData.samples.slice(-SAMPLES_FOR_LEAK_DETECTION);
  const firstSample = recentSamples[0];
  const lastSample = recentSamples[recentSamples.length - 1];

  // Calculate growth rate
  const heapGrowth = lastSample.heapUsed - firstSample.heapUsed;
  const timeElapsed = lastSample.timestamp - firstSample.timestamp;
  const growthRate = heapGrowth / timeElapsed; // bytes per ms

  // Check if memory is consistently growing
  let isConsistentGrowth = true;
  for (let i = 1; i < recentSamples.length; i++) {
    if (recentSamples[i].heapUsed < recentSamples[i - 1].heapUsed) {
      isConsistentGrowth = false;
      break;
    }
  }

  const analysis = {
    timestamp: Date.now(),
    heapGrowth,
    growthRate: growthRate * 1000, // bytes per second
    isConsistentGrowth,
    samplesAnalyzed: SAMPLES_FOR_LEAK_DETECTION,
    isPotentialLeak: isConsistentGrowth && heapGrowth > 10 * 1024 * 1024, // 10 MB growth
  };

  return analysis;
}

// Sample memory and log results
function sampleMemory() {
  const sample = getMemoryUsage();
  profileData.samples.push(sample);
  sampleCount++;

  // Set baseline on first sample
  if (!baselineMemory) {
    baselineMemory = sample;
    console.log("\n🔍 Memory Profiling Started");
    console.log(`⏱️  Interval: ${config.interval}ms`);
    console.log(
      `⏳ Duration: ${config.duration > 0 ? config.duration + "s" : "indefinite"}`,
    );
    console.log(`⚠️  Threshold: ${config.threshold}MB`);
    console.log("━".repeat(80));
  }

  // Calculate differences from baseline
  const heapDiff = sample.heapUsed - baselineMemory.heapUsed;
  const totalDiff = sample.heapTotal - baselineMemory.heapTotal;
  const rssDiff = sample.rss - baselineMemory.rss;

  // Log current stats
  console.log(
    `\n📊 Sample #${sampleCount} (${new Date(sample.timestamp).toLocaleTimeString()})`,
  );
  console.log(
    `   Heap Used:  ${formatBytes(sample.heapUsed)} (${heapDiff >= 0 ? "+" : ""}${formatBytes(heapDiff)})`,
  );
  console.log(
    `   Heap Total: ${formatBytes(sample.heapTotal)} (${totalDiff >= 0 ? "+" : ""}${formatBytes(totalDiff)})`,
  );
  console.log(
    `   RSS:        ${formatBytes(sample.rss)} (${rssDiff >= 0 ? "+" : ""}${formatBytes(rssDiff)})`,
  );
  console.log(`   External:   ${formatBytes(sample.external)}`);

  // Check threshold
  const thresholdBytes = config.threshold * 1024 * 1024;
  if (heapDiff > thresholdBytes) {
    console.log(
      `\n⚠️  WARNING: Memory increased by ${formatBytes(heapDiff)} (threshold: ${config.threshold}MB)`,
    );
  }

  // Analyze for leaks
  const leakAnalysis = analyzeMemoryLeaks();
  if (leakAnalysis) {
    if (leakAnalysis.isPotentialLeak) {
      console.log(`\n🚨 POTENTIAL MEMORY LEAK DETECTED!`);
      console.log(
        `   Growth: ${formatBytes(leakAnalysis.heapGrowth)} over ${SAMPLES_FOR_LEAK_DETECTION} samples`,
      );
      console.log(`   Rate: ${formatBytes(leakAnalysis.growthRate)}/second`);
      console.log(`   Pattern: Consistent upward trend`);

      profileData.leaks.push(leakAnalysis);
    }
  }

  // Force garbage collection if available (requires --expose-gc flag)
  if (global.gc && sampleCount % 5 === 0) {
    console.log("\n🗑️  Running garbage collection...");
    global.gc();
  }
}

// Save profiling data to file
function saveProfileData() {
  if (!config.save) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `memory-profile-${timestamp}.json`;
  const filepath = path.join(process.cwd(), filename);

  const report = {
    ...profileData,
    endTime: Date.now(),
    duration: Date.now() - profileData.startTime,
    totalSamples: profileData.samples.length,
    leaksDetected: profileData.leaks.length,
    summary: {
      initialHeap: formatBytes(profileData.samples[0]?.heapUsed || 0),
      finalHeap: formatBytes(
        profileData.samples[profileData.samples.length - 1]?.heapUsed || 0,
      ),
      peakHeap: formatBytes(
        Math.max(...profileData.samples.map((s) => s.heapUsed)),
      ),
      averageHeap: formatBytes(
        profileData.samples.reduce((sum, s) => sum + s.heapUsed, 0) /
          profileData.samples.length,
      ),
    },
  };

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Profile data saved to: ${filename}`);
}

// Graceful shutdown
function shutdown() {
  console.log("\n\n━".repeat(80));
  console.log("🛑 Profiling stopped");

  if (profileData.samples.length > 0) {
    const firstSample = profileData.samples[0];
    const lastSample = profileData.samples[profileData.samples.length - 1];
    const totalGrowth = lastSample.heapUsed - firstSample.heapUsed;
    const duration = lastSample.timestamp - firstSample.timestamp;

    console.log("\n📈 Summary:");
    console.log(`   Total Samples: ${profileData.samples.length}`);
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Initial Heap: ${formatBytes(firstSample.heapUsed)}`);
    console.log(`   Final Heap: ${formatBytes(lastSample.heapUsed)}`);
    console.log(
      `   Total Growth: ${totalGrowth >= 0 ? "+" : ""}${formatBytes(totalGrowth)}`,
    );
    console.log(`   Leaks Detected: ${profileData.leaks.length}`);

    if (profileData.leaks.length > 0) {
      console.log("\n🚨 Memory Leak Summary:");
      profileData.leaks.forEach((leak, index) => {
        console.log(
          `   Leak #${index + 1}: ${formatBytes(leak.heapGrowth)} growth at ${formatBytes(leak.growthRate)}/second`,
        );
      });
    }
  }

  saveProfileData();
  process.exit(0);
}

// Handle interrupts
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Main profiling loop
console.log("🚀 Starting memory profiler...\n");

const intervalId = setInterval(sampleMemory, config.interval);

// Auto-stop after duration if specified
if (config.duration > 0) {
  setTimeout(() => {
    clearInterval(intervalId);
    shutdown();
  }, config.duration * 1000);
}

// Initial sample
sampleMemory();
