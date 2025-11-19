/**
 * Load Testing Suite for FitAI Workers
 * Tests performance under concurrent load
 *
 * Usage: node load-test.js
 */

const API_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// LOAD TEST CONFIGURATION
// ============================================================================

const TESTS = {
  healthCheck: {
    name: 'Health Check',
    endpoint: '/health',
    method: 'GET',
    concurrent: 20,
    requests: 100,
  },
  exerciseSearch: {
    name: 'Exercise Search (Basic)',
    endpoint: '/exercises/search?limit=20',
    method: 'GET',
    concurrent: 10,
    requests: 50,
  },
  exerciseSearchFiltered: {
    name: 'Exercise Search (Filtered)',
    endpoint: '/exercises/search?query=chest&equipment=barbell&limit=20',
    method: 'GET',
    concurrent: 10,
    requests: 50,
  },
};

// ============================================================================
// LOAD TESTING UTILITIES
// ============================================================================

async function makeRequest(endpoint, method = 'GET') {
  const startTime = Date.now();
  try {
    const response = await fetch(`${API_URL}${endpoint}`, { method });
    const responseTime = Date.now() - startTime;

    return {
      success: response.ok,
      status: response.status,
      time: responseTime,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      time: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function runConcurrentRequests(endpoint, method, concurrency, totalRequests) {
  const results = [];
  const batches = Math.ceil(totalRequests / concurrency);

  log(`  Running ${totalRequests} requests with concurrency ${concurrency}...`, 'cyan');

  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(concurrency, totalRequests - (batch * concurrency));
    const promises = Array(batchSize).fill(null).map(() => makeRequest(endpoint, method));

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    // Show progress
    const completed = results.length;
    const percent = ((completed / totalRequests) * 100).toFixed(0);
    process.stdout.write(`\r  Progress: ${completed}/${totalRequests} (${percent}%)  `);
  }

  console.log(''); // New line after progress
  return results;
}

function analyzeResults(results) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const rateLimited = results.filter(r => r.status === 429);

  const times = successful.map(r => r.time);
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length || 0;
  const min = Math.min(...times) || 0;
  const max = Math.max(...times) || 0;

  // Calculate percentiles
  const sorted = [...times].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    rateLimited: rateLimited.length,
    successRate: ((successful.length / results.length) * 100).toFixed(1),
    timing: {
      min: Math.round(min),
      max: Math.round(max),
      avg: Math.round(avg),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
    },
  };
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runLoadTests() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'bright');
  log('║         FitAI Workers - Load Testing Suite               ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'bright');

  log(`API URL: ${API_URL}\n`, 'cyan');

  const allResults = {};

  for (const [key, test] of Object.entries(TESTS)) {
    log(`\n${colors.bright}${colors.blue}🔥 ${test.name}${colors.reset}`);
    log(`   Endpoint: ${test.endpoint}`, 'cyan');
    log(`   Method: ${test.method}`, 'cyan');

    const startTime = Date.now();
    const results = await runConcurrentRequests(
      test.endpoint,
      test.method,
      test.concurrent,
      test.requests
    );
    const totalTime = Date.now() - startTime;

    const stats = analyzeResults(results);
    allResults[key] = { ...test, stats, totalTime };

    // Display results
    log('\n  📊 Results:', 'bright');
    log(`     Total requests: ${stats.total}`, 'cyan');
    log(`     Successful: ${stats.successful} (${stats.successRate}%)`,
        stats.successRate === '100.0' ? 'green' : 'yellow');
    log(`     Failed: ${stats.failed}`, stats.failed > 0 ? 'red' : 'green');
    log(`     Rate limited: ${stats.rateLimited}`, stats.rateLimited > 0 ? 'yellow' : 'cyan');

    log('\n  ⚡ Performance:', 'bright');
    log(`     Min: ${stats.timing.min}ms`, 'cyan');
    log(`     Avg: ${stats.timing.avg}ms`, 'cyan');
    log(`     Max: ${stats.timing.max}ms`, 'cyan');
    log(`     P50: ${stats.timing.p50}ms`, 'cyan');
    log(`     P95: ${stats.timing.p95}ms`, stats.timing.p95 > 1000 ? 'yellow' : 'cyan');
    log(`     P99: ${stats.timing.p99}ms`, stats.timing.p99 > 2000 ? 'red' : 'cyan');

    log(`\n  ⏱️  Total test time: ${(totalTime / 1000).toFixed(2)}s`, 'cyan');
    log(`     Throughput: ${(stats.total / (totalTime / 1000)).toFixed(1)} req/s`, 'cyan');
  }

  // Overall summary
  log('\n\n╔═══════════════════════════════════════════════════════════╗', 'bright');
  log('║                    LOAD TEST SUMMARY                      ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'bright');

  let totalRequests = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  let maxP99 = 0;
  let slowestTest = '';

  for (const [key, result] of Object.entries(allResults)) {
    totalRequests += result.stats.total;
    totalSuccessful += result.stats.successful;
    totalFailed += result.stats.failed;

    if (result.stats.timing.p99 > maxP99) {
      maxP99 = result.stats.timing.p99;
      slowestTest = result.name;
    }
  }

  log(`Total Requests: ${totalRequests}`, 'cyan');
  log(`Successful: ${totalSuccessful}`, 'green');
  log(`Failed: ${totalFailed}`, totalFailed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((totalSuccessful / totalRequests) * 100).toFixed(1)}%`, 'green');
  log(`Slowest Test: ${slowestTest} (P99: ${maxP99}ms)`, maxP99 > 2000 ? 'yellow' : 'cyan');

  // Performance assessment
  log('\n📋 Performance Assessment:', 'bright');

  const assessments = [];
  for (const [key, result] of Object.entries(allResults)) {
    const p95 = result.stats.timing.p95;
    const p99 = result.stats.timing.p99;

    if (p99 < 500) {
      assessments.push({ name: result.name, rating: 'excellent', p99 });
    } else if (p99 < 1000) {
      assessments.push({ name: result.name, rating: 'good', p99 });
    } else if (p99 < 2000) {
      assessments.push({ name: result.name, rating: 'acceptable', p99 });
    } else {
      assessments.push({ name: result.name, rating: 'needs improvement', p99 });
    }
  }

  assessments.forEach(a => {
    const emoji = {
      'excellent': '🟢',
      'good': '🟡',
      'acceptable': '🟠',
      'needs improvement': '🔴',
    }[a.rating];

    const color = {
      'excellent': 'green',
      'good': 'cyan',
      'acceptable': 'yellow',
      'needs improvement': 'red',
    }[a.rating];

    log(`   ${emoji} ${a.name}: ${a.rating} (P99: ${a.p99}ms)`, color);
  });

  // Final verdict
  const overallP99 = maxP99;
  log('\n🎯 Final Verdict:', 'bright');

  if (overallP99 < 500) {
    log('   ✅ EXCELLENT - System performs exceptionally well under load', 'green');
  } else if (overallP99 < 1000) {
    log('   ✅ GOOD - System handles load effectively', 'green');
  } else if (overallP99 < 2000) {
    log('   ⚠️  ACCEPTABLE - System works but may need optimization', 'yellow');
  } else {
    log('   ❌ NEEDS IMPROVEMENT - Performance optimization recommended', 'red');
  }

  log('\nLoad testing complete! 🚀\n', 'green');
}

// Run load tests
runLoadTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
