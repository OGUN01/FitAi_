/**
 * Performance test for optimized health check endpoint
 * Tests caching effectiveness
 */

const API_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';

async function testHealthPerformance() {
  console.log('Testing Health Check Performance with Caching\n');

  const results = [];

  // Test 1: Cold start (cache miss)
  console.log('Test 1: Cold start (cache miss)');
  const cold1 = Date.now();
  await fetch(`${API_URL}/health`);
  const coldTime1 = Date.now() - cold1;
  console.log(`  Response time: ${coldTime1}ms\n`);
  results.push({ type: 'cold', time: coldTime1 });

  // Test 2-10: Cached responses (should be fast)
  console.log('Test 2-10: Cached responses');
  for (let i = 0; i < 9; i++) {
    const start = Date.now();
    await fetch(`${API_URL}/health`);
    const time = Date.now() - start;
    console.log(`  Request ${i + 2}: ${time}ms`);
    results.push({ type: 'cached', time });

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Analysis
  const cachedTimes = results.filter(r => r.type === 'cached').map(r => r.time);
  const avgCached = cachedTimes.reduce((sum, t) => sum + t, 0) / cachedTimes.length;
  const maxCached = Math.max(...cachedTimes);
  const minCached = Math.min(...cachedTimes);

  console.log('\n📊 Results:');
  console.log(`  Cold start: ${coldTime1}ms`);
  console.log(`  Cached avg: ${Math.round(avgCached)}ms`);
  console.log(`  Cached min: ${minCached}ms`);
  console.log(`  Cached max: ${maxCached}ms`);
  console.log(`  Speedup: ${(coldTime1 / avgCached).toFixed(1)}x faster`);

  if (avgCached < 200) {
    console.log('\n✅ EXCELLENT - Caching is working effectively!');
  } else if (avgCached < 500) {
    console.log('\n✅ GOOD - Caching provides benefit');
  } else {
    console.log('\n⚠️  Caching may not be working as expected');
  }

  // Test concurrent load with caching
  console.log('\n\nTest 11: Concurrent load (20 requests)');
  const concurrentStart = Date.now();
  const promises = Array(20).fill(null).map(() => {
    const start = Date.now();
    return fetch(`${API_URL}/health`).then(() => Date.now() - start);
  });

  const times = await Promise.all(promises);
  const concurrentTotal = Date.now() - concurrentStart;
  const concurrentAvg = times.reduce((sum, t) => sum + t, 0) / times.length;
  const concurrentP95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

  console.log(`  Total time: ${concurrentTotal}ms`);
  console.log(`  Avg response: ${Math.round(concurrentAvg)}ms`);
  console.log(`  P95: ${concurrentP95}ms`);
  console.log(`  Throughput: ${(20 / (concurrentTotal / 1000)).toFixed(1)} req/s`);

  if (concurrentP95 < 500) {
    console.log('\n✅ Performance is excellent under concurrent load!');
  } else if (concurrentP95 < 1000) {
    console.log('\n✅ Performance is good under concurrent load');
  } else {
    console.log('\n⚠️  Performance could be improved');
  }
}

testHealthPerformance().catch(console.error);
