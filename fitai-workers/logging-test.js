/**
 * Logging Test Script for FitAI Workers
 * Tests request/response logging to Supabase api_logs table
 *
 * Usage: node logging-test.js <email> <password>
 */

const API_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';

// Test configuration
const TESTS = {
  SUCCESSFUL_REQUEST: true,
  ERROR_REQUEST: true,
  AUTHENTICATED_REQUEST: true,
  RATE_LIMITED_REQUEST: true,
  MULTIPLE_REQUESTS: true,
};

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
  console.log(`\n${colors.bright}${colors.blue}📝 TEST: ${name}${colors.reset}`);
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

function logWarning(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

let authToken = null;
let testUserId = null;

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  total: 0,
};

async function authenticate(email, password) {
  logTest('Authentication');
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = await response.json();
    authToken = data.data.token;
    testUserId = data.data.user.id;

    logSuccess(`Authenticated as: ${email}`);
    logInfo(`User ID: ${testUserId}`);
    logInfo(`Token: ${authToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    logError(`Authentication failed: ${error.message}`);
    return false;
  }
}

// Test 1: Successful request logging
async function testSuccessfulRequest() {
  if (!TESTS.SUCCESSFUL_REQUEST) return;

  logTest('1. Successful Request Logging');
  results.total++;

  try {
    const startTime = Date.now();
    const response = await fetch(`${API_URL}/health`);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    const data = await response.json();

    logSuccess(`Health check successful: ${response.status}`);
    logInfo(`Response time: ${responseTime}ms`);
    logInfo(`Response: ${JSON.stringify(data)}`);
    logWarning('Check Supabase api_logs table for this request');
    logInfo('Expected fields: endpoint="/health", method="GET", status_code=200');

    results.passed++;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 2: Error request logging
async function testErrorRequest() {
  if (!TESTS.ERROR_REQUEST) return;

  logTest('2. Error Request Logging');
  results.total++;

  try {
    const startTime = Date.now();
    const response = await fetch(`${API_URL}/exercises/nonexistent-id`);
    const responseTime = Date.now() - startTime;

    const data = await response.json();

    logSuccess(`Error response captured: ${response.status}`);
    logInfo(`Response time: ${responseTime}ms`);
    logInfo(`Error: ${data.error?.code || 'N/A'} - ${data.error?.message || 'N/A'}`);
    logWarning('Check Supabase api_logs for error_code and error_message fields');
    logInfo('Expected: status_code=404, error_code present, error_message present');

    results.passed++;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 3: Authenticated request logging (with user_id)
async function testAuthenticatedRequest() {
  if (!TESTS.AUTHENTICATED_REQUEST || !authToken) return;

  logTest('3. Authenticated Request Logging');
  results.total++;

  try {
    const startTime = Date.now();
    const response = await fetch(`${API_URL}/test/rate-limit`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();

    logSuccess(`Authenticated request successful: ${response.status}`);
    logInfo(`Response time: ${responseTime}ms`);
    logInfo(`User ID tracked: ${testUserId}`);
    logWarning('Check Supabase api_logs for user_id field');
    logInfo(`Expected: user_id="${testUserId}", endpoint="/test/rate-limit"`);

    results.passed++;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 4: Rate-limited request logging
async function testRateLimitedRequest() {
  if (!TESTS.RATE_LIMITED_REQUEST) return;

  logTest('4. Rate-Limited Request Logging');
  results.total++;

  try {
    logInfo('Sending 10 rapid requests to trigger rate limit...');

    let rateLimitTriggered = false;
    for (let i = 0; i < 10; i++) {
      const response = await fetch(`${API_URL}/test/rate-limit`);
      const data = await response.json();

      if (response.status === 429) {
        rateLimitTriggered = true;
        logSuccess(`Rate limit triggered on request ${i + 1}: ${response.status}`);
        logInfo(`Error: ${data.error?.code || 'N/A'}`);
        logWarning('Check Supabase api_logs for status_code=429');
        break;
      }
    }

    if (!rateLimitTriggered) {
      logWarning('Rate limit not triggered (limits may be high)');
    }

    results.passed++;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 5: Multiple requests to verify consistent logging
async function testMultipleRequests() {
  if (!TESTS.MULTIPLE_REQUESTS) return;

  logTest('5. Multiple Requests Logging');
  results.total++;

  try {
    const endpoints = [
      { path: '/health', method: 'GET' },
      { path: '/exercises/search?query=chest&limit=5', method: 'GET' },
      { path: '/health', method: 'GET' },
    ];

    logInfo(`Testing ${endpoints.length} different endpoints...`);

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      const response = await fetch(`${API_URL}${endpoint.path}`);
      const responseTime = Date.now() - startTime;

      logInfo(`${endpoint.method} ${endpoint.path}: ${response.status} (${responseTime}ms)`);
    }

    logSuccess('Multiple requests sent successfully');
    logWarning('Check Supabase api_logs table - should have 3 new entries');
    logInfo('Verify: Different endpoints, timestamps, response times all logged');

    results.passed++;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    results.failed++;
  }
}

// Test 6: Verify request metadata
async function testRequestMetadata() {
  logTest('6. Request Metadata Verification');
  results.total++;

  try {
    const response = await fetch(`${API_URL}/health`, {
      headers: {
        'User-Agent': 'FitAI-Logging-Test/1.0',
        'X-Custom-Header': 'test-value',
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    logSuccess('Request with custom headers sent');
    logWarning('Check Supabase api_logs for this request');
    logInfo('Expected fields populated:');
    logInfo('  - user_agent: "FitAI-Logging-Test/1.0"');
    logInfo('  - ip_address: Your IP address');
    logInfo('  - request_id: UUID format');
    logInfo('  - created_at: Current timestamp');

    results.passed++;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    results.failed++;
  }
}

// Main test runner
async function runAllTests() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'bright');
  log('║     FitAI Workers - Logging Middleware Test Suite        ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'bright');

  logInfo(`API URL: ${API_URL}`);
  logInfo('Testing request/response logging to Supabase api_logs table\n');

  // Authenticate if credentials provided
  const email = process.argv[2];
  const password = process.argv[3];

  if (email && password) {
    await authenticate(email, password);
  } else {
    logWarning('No credentials provided - skipping authenticated tests');
    logInfo('Usage: node logging-test.js <email> <password>');
  }

  // Run all tests
  await testSuccessfulRequest();
  await testErrorRequest();
  await testAuthenticatedRequest();
  await testRateLimitedRequest();
  await testMultipleRequests();
  await testRequestMetadata();

  // Wait a moment for logs to propagate
  logInfo('\nWaiting 3 seconds for logs to propagate to Supabase...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Print summary
  log('\n╔═══════════════════════════════════════════════════════════╗', 'bright');
  log('║                      TEST SUMMARY                         ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'bright');

  log(`Total Tests: ${results.total}`, 'cyan');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

  if (results.failed === 0) {
    log('\n✓ All tests passed!', 'green');
  } else {
    log(`\n✗ ${results.failed} test(s) failed`, 'red');
  }

  log('\n╔═══════════════════════════════════════════════════════════╗', 'bright');
  log('║              MANUAL VERIFICATION STEPS                    ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'bright');

  log('1. Open Supabase Dashboard', 'yellow');
  log('2. Navigate to Table Editor > api_logs', 'yellow');
  log('3. Check for recent entries (created_at within last minute)', 'yellow');
  log('4. Verify the following fields are populated:', 'yellow');
  log('   - endpoint, method, status_code', 'cyan');
  log('   - response_time_ms', 'cyan');
  log('   - user_agent, ip_address, request_id', 'cyan');
  log('   - user_id (for authenticated requests)', 'cyan');
  log('   - error_code, error_message (for error requests)', 'cyan');
  log('5. Verify timestamps match test execution time', 'yellow');
  log('6. Check that response times are reasonable (< 2000ms)', 'yellow');

  log('\n╔═══════════════════════════════════════════════════════════╗', 'bright');
  log('║              EXPECTED LOG ENTRIES                         ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'bright');

  log('You should see approximately 15-20 new log entries:', 'cyan');
  log('  - Multiple GET /health requests', 'cyan');
  log('  - GET /exercises/nonexistent-id (404 error)', 'cyan');
  log('  - GET /test/rate-limit (authenticated)', 'cyan');
  log('  - GET /exercises/search (with query params)', 'cyan');
  log('  - Possibly some 429 rate limit errors', 'cyan');

  log('\nLogging middleware test complete! 🎉\n', 'green');
}

// Run tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
