/**
 * Error Handling Test Script for FitAI Workers
 * Tests all error scenarios and error responses
 *
 * Usage: node error-handling-test.js
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

function logTest(name) {
  console.log(`\n${colors.bright}${colors.blue}🧪 TEST: ${name}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.cyan}ℹ ${message}${colors.reset}`);
}

const results = {
  passed: 0,
  failed: 0,
  total: 0,
};

// Test 1: 401 Unauthorized - Missing token
async function testUnauthorized() {
  logTest('1. Unauthorized Error (401) - Missing Token');
  results.total++;

  try {
    const response = await fetch(`${API_URL}/exercises/search?query=test&limit=1`);
    const data = await response.json();

    if (response.status === 401 && data.error?.code === 'UNAUTHORIZED') {
      logSuccess(`Status: ${response.status}`);
      logSuccess(`Error code: ${data.error.code}`);
      logSuccess(`Message: ${data.error.message}`);
      results.passed++;
    } else {
      logError(`Expected 401 UNAUTHORIZED, got ${response.status} ${data.error?.code}`);
      results.failed++;
    }
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 2: 404 Not Found - Invalid route
async function testNotFound() {
  logTest('2. Not Found Error (404) - Invalid Route');
  results.total++;

  try {
    const response = await fetch(`${API_URL}/invalid/route/that/does/not/exist`);
    const data = await response.json();

    if (response.status === 404 && data.error?.code === 'NOT_FOUND') {
      logSuccess(`Status: ${response.status}`);
      logSuccess(`Error code: ${data.error.code}`);
      logSuccess(`Message: ${data.error.message}`);
      results.passed++;
    } else {
      logError(`Expected 404 NOT_FOUND, got ${response.status} ${data.error?.code}`);
      results.failed++;
    }
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 3: 404 Not Found - Nonexistent exercise
async function testResourceNotFound() {
  logTest('3. Resource Not Found (404) - Nonexistent Exercise');
  results.total++;

  try {
    const response = await fetch(`${API_URL}/exercises/nonexistent-exercise-id`);
    const data = await response.json();

    if (response.status === 404) {
      logSuccess(`Status: ${response.status}`);
      logSuccess(`Error code: ${data.error?.code}`);
      logSuccess(`Message: ${data.error.message}`);
      results.passed++;
    } else {
      logError(`Expected 404, got ${response.status}`);
      results.failed++;
    }
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 4: 429 Rate Limit - Too many requests
async function testRateLimit() {
  logTest('4. Rate Limit Error (429) - Too Many Requests');
  results.total++;

  try {
    logInfo('Sending 150 rapid requests to trigger rate limit...');

    let rateLimitHit = false;
    for (let i = 0; i < 150; i++) {
      const response = await fetch(`${API_URL}/test/rate-limit`);

      if (response.status === 429) {
        const data = await response.json();
        rateLimitHit = true;

        logSuccess(`Rate limit triggered at request ${i + 1}`);
        logSuccess(`Status: ${response.status}`);
        logSuccess(`Error code: ${data.error?.code}`);
        logSuccess(`Message: ${data.error.message}`);

        const retryAfter = response.headers.get('Retry-After');
        const rateLimit = response.headers.get('X-RateLimit-Limit');
        const resetAt = response.headers.get('X-RateLimit-Reset');

        if (retryAfter) logInfo(`Retry-After header: ${retryAfter}s`);
        if (rateLimit) logInfo(`Rate limit: ${rateLimit}`);
        if (resetAt) logInfo(`Reset at: ${new Date(parseInt(resetAt) * 1000).toISOString()}`);

        results.passed++;
        break;
      }
    }

    if (!rateLimitHit) {
      logError('Rate limit not triggered after 150 requests (may need adjustment)');
      results.failed++;
    }
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 5: Error response structure validation
async function testErrorResponseStructure() {
  logTest('5. Error Response Structure Validation');
  results.total++;

  try {
    const response = await fetch(`${API_URL}/exercises/search?query=test`);
    const data = await response.json();

    const hasSuccess = typeof data.success === 'boolean';
    const hasError = data.error && typeof data.error === 'object';
    const hasCode = data.error?.code && typeof data.error.code === 'string';
    const hasMessage = data.error?.message && typeof data.error.message === 'string';

    if (hasSuccess && hasError && hasCode && hasMessage) {
      logSuccess('Response structure valid');
      logInfo(`Structure: { success: ${data.success}, error: { code, message, details } }`);
      results.passed++;
    } else {
      logError('Invalid error response structure');
      logInfo(`Got: ${JSON.stringify(data, null, 2)}`);
      results.failed++;
    }
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 6: CORS headers on errors
async function testCORSHeaders() {
  logTest('6. CORS Headers on Error Responses');
  results.total++;

  try {
    const response = await fetch(`${API_URL}/invalid/route`, {
      headers: {
        'Origin': 'https://example.com',
      },
    });

    const corsHeader = response.headers.get('Access-Control-Allow-Origin');
    const allowHeaders = response.headers.get('Access-Control-Allow-Headers');

    if (corsHeader) {
      logSuccess(`CORS origin header present: ${corsHeader}`);
      if (allowHeaders) logInfo(`Allow headers: ${allowHeaders}`);
      results.passed++;
    } else {
      logError('CORS headers missing on error response');
      results.failed++;
    }
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 7: Content-Type header on errors
async function testContentTypeHeader() {
  logTest('7. Content-Type Header on Error Responses');
  results.total++;

  try {
    const response = await fetch(`${API_URL}/invalid/route`);
    const contentType = response.headers.get('Content-Type');

    if (contentType && contentType.includes('application/json')) {
      logSuccess(`Content-Type correct: ${contentType}`);
      results.passed++;
    } else {
      logError(`Expected application/json, got: ${contentType}`);
      results.failed++;
    }
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 8: Error details field
async function testErrorDetails() {
  logTest('8. Error Details Field');
  results.total++;

  try {
    const response = await fetch(`${API_URL}/exercises/search?query=test`);
    const data = await response.json();

    if (data.error?.details) {
      logSuccess('Error details field present');
      logInfo(`Details: ${JSON.stringify(data.error.details)}`);
      results.passed++;
    } else {
      logInfo('Error details field not present (optional - OK)');
      results.passed++;
    }
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    results.failed++;
  }
}

// Main test runner
async function runAllTests() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'bright');
  log('║     FitAI Workers - Error Handling Test Suite            ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'bright');

  logInfo(`API URL: ${API_URL}`);
  logInfo('Testing comprehensive error handling\n');

  await testUnauthorized();
  await testNotFound();
  await testResourceNotFound();
  await testRateLimit();
  await testErrorResponseStructure();
  await testCORSHeaders();
  await testContentTypeHeader();
  await testErrorDetails();

  // Print summary
  log('\n╔═══════════════════════════════════════════════════════════╗', 'bright');
  log('║                      TEST SUMMARY                         ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'bright');

  log(`Total Tests: ${results.total}`, 'cyan');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

  const passRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`\nPass Rate: ${passRate}%`, passRate === '100.0' ? 'green' : 'yellow');

  if (results.failed === 0) {
    log('\n✓ All error handling tests passed!', 'green');
  } else {
    log(`\n✗ ${results.failed} test(s) failed`, 'red');
  }

  log('\n╔═══════════════════════════════════════════════════════════╗', 'bright');
  log('║              ERROR CODES TESTED                           ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'bright');

  log('✓ UNAUTHORIZED (401) - Missing token', 'cyan');
  log('✓ NOT_FOUND (404) - Invalid route/resource', 'cyan');
  log('✓ RATE_LIMIT_EXCEEDED (429) - Too many requests', 'cyan');
  log('✓ Error response structure validation', 'cyan');
  log('✓ CORS and Content-Type headers', 'cyan');

  log('\n╔═══════════════════════════════════════════════════════════╗', 'bright');
  log('║              ADDITIONAL ERROR CODES                       ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'bright');

  log('Authentication:', 'yellow');
  log('  - INVALID_TOKEN, TOKEN_EXPIRED, FORBIDDEN', 'cyan');
  log('\nValidation:', 'yellow');
  log('  - VALIDATION_ERROR, INVALID_REQUEST, MISSING_REQUIRED_FIELD', 'cyan');
  log('  - INVALID_PARAMETER', 'cyan');
  log('\nAI Generation:', 'yellow');
  log('  - AI_GENERATION_FAILED, MODEL_UNAVAILABLE, AI_TIMEOUT', 'cyan');
  log('  - AI_INVALID_RESPONSE, AI_QUOTA_EXCEEDED', 'cyan');
  log('\nDatabase:', 'yellow');
  log('  - DATABASE_ERROR, SUPABASE_ERROR, QUERY_FAILED', 'cyan');
  log('\nMedia:', 'yellow');
  log('  - MEDIA_NOT_FOUND, FILE_TOO_LARGE, INVALID_FILE_TYPE', 'cyan');
  log('  - MEDIA_UPLOAD_FAILED, MEDIA_DELETE_FAILED', 'cyan');
  log('\nInternal:', 'yellow');
  log('  - INTERNAL_ERROR, SERVICE_UNAVAILABLE, TIMEOUT', 'cyan');

  log('\nError handling test complete! 🎉\n', 'green');
}

// Run tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
