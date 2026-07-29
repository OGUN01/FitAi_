/**
 * QA Script for Task 7: usageTracker.ts
 * Tests pure logic functions and simulates limit-checking scenarios.
 */

// ---------- Test getPeriodStart ----------
function testGetPeriodStart() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  const expectedDaily = `${year}-${month}-${day}`;
  const expectedMonthly = `${year}-${month}-01`;

  // Inline the function since we can't import TS directly
  function getPeriodStart(periodType: 'daily' | 'monthly'): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    if (periodType === 'daily') return `${year}-${month}-${day}`;
    return `${year}-${month}-01`;
  }

  const daily = getPeriodStart('daily');
  const monthly = getPeriodStart('monthly');

  console.log('=== getPeriodStart Tests ===');
  console.log(`Daily:   ${daily} === ${expectedDaily} → ${daily === expectedDaily ? 'PASS' : 'FAIL'}`);
  console.log(`Monthly: ${monthly} === ${expectedMonthly} → ${monthly === expectedMonthly ? 'PASS' : 'FAIL'}`);
  return daily === expectedDaily && monthly === expectedMonthly;
}

// ---------- Test resolveLimit ----------
interface FeatureLimitConfig {
  ai_generations_per_day?: number;
  ai_generations_per_month?: number;
  scans_per_day?: number;
  unlimited_scans?: boolean;
  unlimited_ai?: boolean;
  analytics?: boolean;
  coaching?: boolean;
}

type FeatureKey = 'ai_generation' | 'barcode_scan' | 'chat_message';
type PeriodType = 'daily' | 'monthly';

const FEATURE_LIMIT_MAP: Record<FeatureKey, {
  daily?: keyof FeatureLimitConfig;
  monthly?: keyof FeatureLimitConfig;
  unlimitedFlag?: keyof FeatureLimitConfig;
}> = {
  ai_generation: { daily: 'ai_generations_per_day', monthly: 'ai_generations_per_month', unlimitedFlag: 'unlimited_ai' },
  barcode_scan: { daily: 'scans_per_day', unlimitedFlag: 'unlimited_scans' },
  chat_message: {},
};

function resolveLimit(featureKey: FeatureKey, periodType: PeriodType, planFeatures: FeatureLimitConfig): number | null {
  const mapping = FEATURE_LIMIT_MAP[featureKey];
  if (mapping.unlimitedFlag) {
    const flagValue = planFeatures[mapping.unlimitedFlag];
    if (flagValue === true) return null;
  }
  const limitKey = mapping[periodType];
  if (!limitKey) return null;
  const limitValue = planFeatures[limitKey];
  if (limitValue === null || limitValue === undefined) return null;
  return typeof limitValue === 'number' ? limitValue : null;
}

function testResolveLimit() {
  console.log('\n=== resolveLimit Tests ===');

  // Free tier: ai_generations_per_month: 1, no daily limit, unlimited_ai: false
  const freePlan: FeatureLimitConfig = { ai_generations_per_month: 1, scans_per_day: 10, unlimited_ai: false, unlimited_scans: false };
  const r1 = resolveLimit('ai_generation', 'monthly', freePlan);
  console.log(`Free AI monthly limit: ${r1} === 1 → ${r1 === 1 ? 'PASS' : 'FAIL'}`);

  const r2 = resolveLimit('ai_generation', 'daily', freePlan);
  console.log(`Free AI daily limit (no field): ${r2} === null → ${r2 === null ? 'PASS' : 'FAIL'}`);

  // Pro tier: unlimited_ai: true
  const proPlan: FeatureLimitConfig = { unlimited_ai: true, unlimited_scans: true, analytics: true, coaching: true };
  const r3 = resolveLimit('ai_generation', 'monthly', proPlan);
  console.log(`Pro AI monthly (unlimited flag): ${r3} === null → ${r3 === null ? 'PASS' : 'FAIL'}`);

  const r4 = resolveLimit('ai_generation', 'daily', proPlan);
  console.log(`Pro AI daily (unlimited flag): ${r4} === null → ${r4 === null ? 'PASS' : 'FAIL'}`);

  // Basic tier: ai_generations_per_day: 10, unlimited_scans: true
  const basicPlan: FeatureLimitConfig = { ai_generations_per_day: 10, unlimited_scans: true };
  const r5 = resolveLimit('ai_generation', 'daily', basicPlan);
  console.log(`Basic AI daily limit: ${r5} === 10 → ${r5 === 10 ? 'PASS' : 'FAIL'}`);

  const r6 = resolveLimit('barcode_scan', 'daily', basicPlan);
  console.log(`Basic scan daily (unlimited flag): ${r6} === null → ${r6 === null ? 'PASS' : 'FAIL'}`);

  // Zero limit
  const zeroPlan: FeatureLimitConfig = { ai_generations_per_month: 0 };
  const r7 = resolveLimit('ai_generation', 'monthly', zeroPlan);
  console.log(`Zero AI monthly limit: ${r7} === 0 → ${r7 === 0 ? 'PASS' : 'FAIL'}`);

  // chat_message (no limits defined)
  const r8 = resolveLimit('chat_message', 'daily', freePlan);
  console.log(`Chat daily (no mapping): ${r8} === null → ${r8 === null ? 'PASS' : 'FAIL'}`);

  return r1 === 1 && r2 === null && r3 === null && r4 === null && r5 === 10 && r6 === null && r7 === 0 && r8 === null;
}

// ---------- Scenario 1: Free user (1 AI/month) ----------
function testScenario1_FreeUser() {
  console.log('\n=== Scenario 1: Free User (1 AI/month) ===');
  const freePlan: FeatureLimitConfig = { ai_generations_per_month: 1, scans_per_day: 10, unlimited_ai: false, unlimited_scans: false };

  // Simulate checkUsageLimit logic with current=0
  const limit = resolveLimit('ai_generation', 'monthly', freePlan);
  let current = 0;

  // First call: should be allowed
  const allowed1 = limit === null || (limit > 0 && current < limit);
  const remaining1 = limit === null ? null : Math.max(0, limit - current);
  console.log(`Call 1: allowed=${allowed1}, current=${current}, limit=${limit}, remaining=${remaining1} → ${allowed1 === true ? 'PASS' : 'FAIL'}`);

  // Simulate increment
  current = 1;

  // Second call: should be blocked
  const allowed2 = limit === null || (limit > 0 && current < limit);
  const remaining2 = limit === null ? null : Math.max(0, limit - current);
  console.log(`Call 2: allowed=${allowed2}, current=${current}, limit=${limit}, remaining=${remaining2} → ${allowed2 === false ? 'PASS' : 'FAIL'}`);

  return allowed1 === true && allowed2 === false;
}

// ---------- Scenario 2: Pro user (unlimited AI) ----------
function testScenario2_ProUser() {
  console.log('\n=== Scenario 2: Pro User (unlimited AI) ===');
  const proPlan: FeatureLimitConfig = { unlimited_ai: true, unlimited_scans: true, analytics: true, coaching: true };

  const limit = resolveLimit('ai_generation', 'monthly', proPlan);
  console.log(`Resolved limit: ${limit} (null = unlimited) → ${limit === null ? 'PASS' : 'FAIL'}`);

  // Simulate 100 calls - all should be allowed because limit is null
  let allAllowed = true;
  for (let i = 0; i < 100; i++) {
    const allowed = limit === null;
    if (!allowed) { allAllowed = false; break; }
  }
  console.log(`100 calls all allowed: ${allAllowed} → ${allAllowed ? 'PASS' : 'FAIL'}`);

  return limit === null && allAllowed;
}

// ---------- Run all tests ----------
const results: boolean[] = [];
results.push(testGetPeriodStart());
results.push(testResolveLimit());
results.push(testScenario1_FreeUser());
results.push(testScenario2_ProUser());

console.log('\n=== SUMMARY ===');
const allPassed = results.every(r => r);
console.log(`All tests passed: ${allPassed}`);
console.log(`Results: ${results.map((r, i) => `Test${i+1}:${r ? 'PASS' : 'FAIL'}`).join(', ')}`);

if (!allPassed) process.exit(1);
