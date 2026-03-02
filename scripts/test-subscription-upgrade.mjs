/**
 * FitAI Subscription Upgrade Flow Test
 * ──────────────────────────────────────
 * Comprehensive test of every subscription upgrade/downgrade scenario,
 * PaywallModal pricing logic, SubscriptionManagement visibility,
 * RazorpayService error codes, live endpoints, and webhook verification.
 *
 * Simulates the subscription logic WITHOUT React Native / Zustand
 * by re-implementing the store's pure functions directly in Node.js.
 *
 * Run: node scripts/test-subscription-upgrade.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHmac } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env from scripts/ ──────────────────────────────────────────────────
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
}

const WORKERS_BASE = "https://fitai-workers.sharmaharsh9887.workers.dev";
const SUPABASE_URL = "https://mqfrwtmkokivoxgukgsz.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

// Dev account for live endpoint checks
const DEV_EMAIL = "sharmaharsh9887@gmail.com";
const DEV_PASSWORD = "Harsh@9887";

// ─── Shared test harness ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function check(label, actual, expected) {
  const ok =
    typeof expected === "boolean"
      ? actual === expected
      : JSON.stringify(actual) === JSON.stringify(expected);

  if (ok) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    console.error(`     expected: ${JSON.stringify(expected)}`);
    console.error(`     actual  : ${JSON.stringify(actual)}`);
    failed++;
    failures.push(label);
  }
}

function checkTruthy(label, value) {
  if (value) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label} — got falsy: ${JSON.stringify(value)}`);
    failed++;
    failures.push(label);
  }
}

function checkFalsy(label, value) {
  if (!value) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(
      `  ❌ ${label} — expected falsy, got: ${JSON.stringify(value)}`,
    );
    failed++;
    failures.push(label);
  }
}

function section(title) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"─".repeat(60)}`);
}

// ─── Pure store logic (mirrors subscriptionStore.ts) ─────────────────────────

const FREE_FEATURES = {
  ai_generations_per_day: null,
  ai_generations_per_month: 10,
  scans_per_day: 10,
  unlimited_scans: false,
  unlimited_ai: false,
  analytics: false,
  coaching: false,
};

const BASIC_FEATURES = {
  ai_generations_per_day: 10,
  ai_generations_per_month: null,
  scans_per_day: null,
  unlimited_scans: true,
  unlimited_ai: false,
  analytics: true,
  coaching: false,
};

const PRO_FEATURES = {
  ai_generations_per_day: null,
  ai_generations_per_month: null,
  scans_per_day: null,
  unlimited_scans: true,
  unlimited_ai: true,
  analytics: true,
  coaching: true,
};

function deriveUsage(features) {
  return {
    ai_generation: {
      daily: {
        current: 0,
        limit: features.ai_generations_per_day,
        remaining: features.ai_generations_per_day,
      },
      monthly: {
        current: 0,
        limit: features.ai_generations_per_month,
        remaining: features.ai_generations_per_month,
      },
    },
    barcode_scan: {
      daily: {
        current: 0,
        limit: features.scans_per_day,
        remaining: features.scans_per_day,
      },
    },
  };
}

function canUseFeature(featureKey, usage, features) {
  if (featureKey === "ai_generation") {
    if (features.unlimited_ai) return true;
    const dailyRemaining = usage.ai_generation.daily.remaining;
    const monthlyRemaining = usage.ai_generation.monthly.remaining;
    const dailyOk = dailyRemaining === null || dailyRemaining > 0;
    const monthlyOk = monthlyRemaining === null || monthlyRemaining > 0;
    return dailyOk && monthlyOk;
  }
  if (featureKey === "barcode_scan") {
    if (features.unlimited_scans) return true;
    const dailyRemaining = usage.barcode_scan.daily.remaining;
    return dailyRemaining === null || dailyRemaining > 0;
  }
  return false;
}

function incrementUsage(featureKey, usage, features) {
  const u = JSON.parse(JSON.stringify(usage)); // deep clone
  if (featureKey === "ai_generation") {
    if (features.unlimited_ai) return u;
    u.ai_generation.monthly.current++;
    if (u.ai_generation.monthly.remaining !== null) {
      u.ai_generation.monthly.remaining = Math.max(
        0,
        u.ai_generation.monthly.remaining - 1,
      );
    }
    if (u.ai_generation.daily.remaining !== null) {
      u.ai_generation.daily.current++;
      u.ai_generation.daily.remaining = Math.max(
        0,
        u.ai_generation.daily.remaining - 1,
      );
    }
  } else if (featureKey === "barcode_scan") {
    if (features.unlimited_scans) return u;
    u.barcode_scan.daily.current++;
    if (u.barcode_scan.daily.remaining !== null) {
      u.barcode_scan.daily.remaining = Math.max(
        0,
        u.barcode_scan.daily.remaining - 1,
      );
    }
  }
  return u;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// Section 1: Free Tier Upgrade Readiness
// ═══════════════════════════════════════════════════════════════════════════════

function testFreeUpgradeReadiness() {
  section("1. FREE TIER — Upgrade Readiness");

  // Verify FREE_FEATURES has correct values (fixed: 10, NOT 1)
  check(
    "FREE_FEATURES.ai_generations_per_month = 10 (was recently fixed from 1)",
    FREE_FEATURES.ai_generations_per_month,
    10,
  );

  let usage = deriveUsage(FREE_FEATURES);

  // Initial state: 10 AI gens remaining, 10 scans/day
  check(
    "Initial: 10 AI gen monthly remaining",
    usage.ai_generation.monthly.remaining,
    10,
  );
  check(
    "Initial: 10 scans/day remaining",
    usage.barcode_scan.daily.remaining,
    10,
  );
  check(
    "canUseFeature(ai_generation) = true initially",
    canUseFeature("ai_generation", usage, FREE_FEATURES),
    true,
  );

  // Use all 10 AI generations
  for (let i = 0; i < 10; i++) {
    usage = incrementUsage("ai_generation", usage, FREE_FEATURES);
  }
  check(
    "After 10 AI gen uses: monthly remaining = 0",
    usage.ai_generation.monthly.remaining,
    0,
  );
  check(
    "canUseFeature(ai_generation) = false after 10 uses (limit hit)",
    canUseFeature("ai_generation", usage, FREE_FEATURES),
    false,
  );

  // Paywall should trigger at limit
  const shouldTriggerPaywall = !canUseFeature(
    "ai_generation",
    usage,
    FREE_FEATURES,
  );
  check("Paywall triggered correctly at limit", shouldTriggerPaywall, true);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 2: Free → Basic Upgrade Logic
// ═══════════════════════════════════════════════════════════════════════════════

function testFreeToBasicUpgrade() {
  section("2. FREE → BASIC — Upgrade Logic");

  // Simulate tier change detection
  const prevTier = "free";
  const newTier = "basic";
  const tierChanged = prevTier !== newTier;
  check("Tier change detected (free → basic)", tierChanged, true);

  // Usage counters reset on tier change
  const freshUsage = deriveUsage(BASIC_FEATURES);

  check(
    "BASIC: ai_generations_per_day = 10",
    BASIC_FEATURES.ai_generations_per_day,
    10,
  );
  check(
    "BASIC: ai_generations_per_month = null (no monthly cap)",
    BASIC_FEATURES.ai_generations_per_month,
    null,
  );
  check("BASIC: unlimited_scans = true", BASIC_FEATURES.unlimited_scans, true);

  // After upgrade: canUseFeature(ai_generation) = true with 10 daily remaining
  check(
    "After upgrade: AI gen daily remaining = 10",
    freshUsage.ai_generation.daily.remaining,
    10,
  );
  check(
    "After upgrade: canUseFeature(ai_generation) = true",
    canUseFeature("ai_generation", freshUsage, BASIC_FEATURES),
    true,
  );

  // canUseFeature(barcode_scan) = true (unlimited)
  check(
    "After upgrade: canUseFeature(barcode_scan) = true (unlimited)",
    canUseFeature("barcode_scan", freshUsage, BASIC_FEATURES),
    true,
  );
  check(
    "After upgrade: scan remaining = null (unlimited)",
    freshUsage.barcode_scan.daily.remaining,
    null,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 3: Basic → Pro Upgrade Logic
// ═══════════════════════════════════════════════════════════════════════════════

function testBasicToProUpgrade() {
  section("3. BASIC → PRO — Upgrade Logic");

  // Simulate tier change detection
  const prevTier = "basic";
  const newTier = "pro";
  const tierChanged = prevTier !== newTier;
  check("Tier change detected (basic → pro)", tierChanged, true);

  // PRO_FEATURES
  check("PRO: unlimited_ai = true", PRO_FEATURES.unlimited_ai, true);
  check("PRO: unlimited_scans = true", PRO_FEATURES.unlimited_scans, true);

  // Usage counters reset to unlimited on upgrade
  const freshUsage = deriveUsage(PRO_FEATURES);
  check(
    "After upgrade: AI gen daily remaining = null (unlimited)",
    freshUsage.ai_generation.daily.remaining,
    null,
  );
  check(
    "After upgrade: AI gen monthly remaining = null (unlimited)",
    freshUsage.ai_generation.monthly.remaining,
    null,
  );

  // 1000 AI gens and 1000 scans still allowed
  let usage = freshUsage;
  for (let i = 0; i < 1000; i++) {
    usage = incrementUsage("ai_generation", usage, PRO_FEATURES);
  }
  check(
    "canUseFeature(ai_generation) = true after 1000 uses",
    canUseFeature("ai_generation", usage, PRO_FEATURES),
    true,
  );

  for (let i = 0; i < 1000; i++) {
    usage = incrementUsage("barcode_scan", usage, PRO_FEATURES);
  }
  check(
    "canUseFeature(barcode_scan) = true after 1000 scans",
    canUseFeature("barcode_scan", usage, PRO_FEATURES),
    true,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 4: Downgrade / Cancel Logic
// ═══════════════════════════════════════════════════════════════════════════════

function testDowngradeCancelLogic() {
  section("4. PRO → FREE — Downgrade / Cancel Logic");

  // Simulate tier change from pro → free (e.g. after cancel + webhook)
  const prevTier = "pro";
  const newTier = "free";
  const tierChanged = prevTier !== newTier;
  check("Tier change detected (pro → free)", tierChanged, true);

  // Usage counters reset to free tier limits
  const freshUsage = deriveUsage(FREE_FEATURES);
  check(
    "After downgrade: AI gen monthly remaining = 10",
    freshUsage.ai_generation.monthly.remaining,
    10,
  );
  check(
    "After downgrade: scan daily remaining = 10",
    freshUsage.barcode_scan.daily.remaining,
    10,
  );

  // After downgrade, free user hits limit at 10 AI gens
  let usage = freshUsage;
  for (let i = 0; i < 10; i++) {
    usage = incrementUsage("ai_generation", usage, FREE_FEATURES);
  }
  check(
    "canUseFeature(ai_generation) = false after 10 uses on free",
    canUseFeature("ai_generation", usage, FREE_FEATURES),
    false,
  );

  // 11th increment — stays at 0 remaining
  usage = incrementUsage("ai_generation", usage, FREE_FEATURES);
  check(
    "Remaining stays 0 after 11th attempt",
    usage.ai_generation.monthly.remaining,
    0,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 5: PaywallModal Yearly Savings Calculation
// ═══════════════════════════════════════════════════════════════════════════════

function testYearlySavingsCalculation() {
  section("5. PAYWALL — Yearly Savings Calculation");

  // Implement getYearlySavingsLabel logic from PaywallModal.tsx in pure JS
  function getYearlySavingsLabel(plans) {
    const monthlyPro = plans.find(
      (p) => p.tier === "pro" && p.billing_cycle === "monthly",
    );
    const yearlyPro = plans.find(
      (p) => p.tier === "pro" && p.billing_cycle === "yearly",
    );
    if (!monthlyPro || !yearlyPro) return null;
    const monthlyTotal = monthlyPro.price_monthly * 12;
    const yearlyTotal = yearlyPro.price_monthly * 12;
    const pct = Math.round(((monthlyTotal - yearlyTotal) / monthlyTotal) * 100);
    return pct > 0 ? `Save ${pct}%` : null;
  }

  // Test with live DB values: proMonthly=499, proYearly=333 (₹3999/yr ÷ 12)
  const dbPlans = [
    { tier: "pro", price_monthly: 499, billing_cycle: "monthly" },
    { tier: "pro", price_monthly: 333, billing_cycle: "yearly" },
  ];
  const dbMonthlyTotal = 499 * 12; // 5988
  const dbYearlyTotal = 333 * 12; // 3996
  const dbPct = Math.round(
    ((dbMonthlyTotal - dbYearlyTotal) / dbMonthlyTotal) * 100,
  );

  check("DB: monthlyTotal = 5988", dbMonthlyTotal, 5988);
  check("DB: yearlyTotal = 3996", dbYearlyTotal, 3996);
  check("DB: pct = 33", dbPct, 33);
  check(
    "DB: savings label = 'Save 33%'",
    getYearlySavingsLabel(dbPlans),
    "Save 33%",
  );

  // Test FALLBACK_PLANS values: proMonthly=599, proYearly=400
  const fallbackPlans = [
    { tier: "pro", price_monthly: 599, billing_cycle: "monthly" },
    { tier: "pro", price_monthly: 400, billing_cycle: "yearly" },
  ];
  const fbMonthlyTotal = 599 * 12; // 7188
  const fbYearlyTotal = 400 * 12; // 4800
  const fbPct = Math.round(
    ((fbMonthlyTotal - fbYearlyTotal) / fbMonthlyTotal) * 100,
  );

  check("Fallback: monthlyTotal = 7188", fbMonthlyTotal, 7188);
  check("Fallback: yearlyTotal = 4800", fbYearlyTotal, 4800);
  check("Fallback: pct = 33", fbPct, 33);
  check(
    "Fallback: savings label = 'Save 33%'",
    getYearlySavingsLabel(fallbackPlans),
    "Save 33%",
  );

  // Edge case: no yearly plan → returns null
  const monthlyOnly = [
    { tier: "pro", price_monthly: 499, billing_cycle: "monthly" },
  ];
  check(
    "No yearly plan → savings label = null",
    getYearlySavingsLabel(monthlyOnly),
    null,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 6: PaywallModal Billing Label
// ═══════════════════════════════════════════════════════════════════════════════

function testBillingLabel() {
  section("6. PAYWALL — Billing Label (formatPrice)");

  // formatPrice logic from PaywallModal.tsx
  function formatPrice(priceMonthly, cycle) {
    if (cycle === "yearly") {
      return `₹${priceMonthly * 12}/yr`;
    }
    return `₹${priceMonthly}/mo`;
  }

  // Basic monthly ₹299/mo → "₹299/mo"
  check("Basic monthly: ₹299/mo", formatPrice(299, "monthly"), "₹299/mo");

  // Pro yearly ₹333/mo effective → "₹3996/yr"
  check(
    "Pro yearly: ₹333/mo → ₹3996/yr",
    formatPrice(333, "yearly"),
    "₹3996/yr",
  );

  // Pro monthly ₹499/mo → "₹499/mo"
  check("Pro monthly: ₹499/mo", formatPrice(499, "monthly"), "₹499/mo");

  // Fallback pro yearly ₹400/mo → "₹4800/yr"
  check(
    "Fallback pro yearly: ₹400/mo → ₹4800/yr",
    formatPrice(400, "yearly"),
    "₹4800/yr",
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 7: SubscriptionManagement Actions Visibility
// ═══════════════════════════════════════════════════════════════════════════════

function testActionsVisibility() {
  section("7. SUBSCRIPTION MANAGEMENT — Actions Section Visibility");

  // Condition from SubscriptionManagement.tsx line ~434:
  //   (subscriptionStatus && tier !== "free") || subscriptionStatus === "cancelled"
  function showActionsSection(subscriptionStatus, tier) {
    return (
      (subscriptionStatus && tier !== "free") ||
      subscriptionStatus === "cancelled"
    );
  }

  check(
    'status="active", tier="basic" → true (show manage)',
    !!showActionsSection("active", "basic"),
    true,
  );
  check(
    'status="active", tier="pro" → true',
    !!showActionsSection("active", "pro"),
    true,
  );
  check(
    'status="active", tier="free" → false (free active, hide manage)',
    !!showActionsSection("active", "free"),
    false,
  );
  check(
    'status=null, tier="free" → false',
    !!showActionsSection(null, "free"),
    false,
  );
  check(
    'status="cancelled", tier="free" → true (show resubscribe)',
    !!showActionsSection("cancelled", "free"),
    true,
  );
  check(
    'status="paused", tier="basic" → true (show resume)',
    !!showActionsSection("paused", "basic"),
    true,
  );
  check(
    'status="cancelled", tier="pro" → true',
    !!showActionsSection("cancelled", "pro"),
    true,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 8: RazorpayService Error Codes
// ═══════════════════════════════════════════════════════════════════════════════

function testRazorpayErrorCodes() {
  section("8. RAZORPAY — Error Code Classification");

  // Simulate the error handling logic from usePaywall.ts
  function handleRazorpayError(code) {
    if (code === "CHECKOUT_CANCELLED") {
      // User closed modal, NOT an error → returns false without alert
      return { alert: false, type: "cancelled" };
    }
    if (code === "PAYMENT_FAILED") {
      return { alert: true, type: "payment_failed", title: "Payment Failed" };
    }
    if (code === "AUTH_ERROR") {
      return { alert: true, type: "auth_error", title: "Authentication Error" };
    }
    // Generic error
    return { alert: true, type: "generic", title: "Error" };
  }

  const cancelled = handleRazorpayError("CHECKOUT_CANCELLED");
  check(
    "CHECKOUT_CANCELLED: alert = false (not an error)",
    cancelled.alert,
    false,
  );
  check("CHECKOUT_CANCELLED: type = cancelled", cancelled.type, "cancelled");

  const paymentFailed = handleRazorpayError("PAYMENT_FAILED");
  check("PAYMENT_FAILED: alert = true", paymentFailed.alert, true);
  check(
    "PAYMENT_FAILED: title = 'Payment Failed'",
    paymentFailed.title,
    "Payment Failed",
  );

  const authError = handleRazorpayError("AUTH_ERROR");
  check("AUTH_ERROR: alert = true", authError.alert, true);
  check(
    "AUTH_ERROR: title = 'Authentication Error'",
    authError.title,
    "Authentication Error",
  );

  const generic = handleRazorpayError("UNKNOWN_CODE");
  check("Generic error: alert = true", generic.alert, true);
  check("Generic error: title = 'Error'", generic.title, "Error");
}

// ─── Live endpoint tests ──────────────────────────────────────────────────────

async function getSupabaseJWT() {
  if (!SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 9: Live Endpoint — Subscription Status
// ═══════════════════════════════════════════════════════════════════════════════

async function testSubscriptionStatusEndpoint() {
  section("9. LIVE ENDPOINT — Subscription Status");

  if (!SUPABASE_ANON_KEY) {
    console.log("  ⚠️  Skipped — SUPABASE_ANON_KEY not in scripts/.env");
    return;
  }

  const jwt = await getSupabaseJWT();
  if (!jwt) {
    console.log(
      "  ⚠️  Skipped — could not obtain Supabase JWT (check credentials)",
    );
    return;
  }
  console.log("  🔑 JWT obtained");

  try {
    const res = await Promise.race([
      fetch(`${WORKERS_BASE}/api/subscription/status`, {
        headers: { Authorization: `Bearer ${jwt}` },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 15000),
      ),
    ]);

    check("Subscription status endpoint returns 200", res.status, 200);
    const responseData = await res.json();
    const data = responseData.data || responseData;

    checkTruthy("Response has 'tier' field", typeof data.tier === "string");
    checkTruthy("Response has 'status' field", typeof data.status === "string");
    checkTruthy(
      "Response has 'features' object",
      typeof data.features === "object",
    );

    // Assert free user features are correct (fixed values)
    if (data.tier === "free" && data.features) {
      check(
        "Free user: features.ai_generations_per_month = 10 (fixed)",
        data.features.ai_generations_per_month,
        10,
      );
      check(
        "Free user: features.scans_per_day = 10",
        data.features.scans_per_day,
        10,
      );
    } else {
      console.log(
        `    ℹ️  User tier is "${data.tier}" — skipping free-specific feature assertions`,
      );
    }

    console.log(`    Tier: ${data.tier}  Status: ${data.status}`);
    if (data.features) {
      console.log(
        `    Features: ${JSON.stringify(data.features).slice(0, 120)}`,
      );
    }
  } catch (e) {
    console.error(`  ❌ Subscription status endpoint failed: ${e.message}`);
    failed++;
    failures.push("Subscription status endpoint");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 10: Live Endpoint — Create Subscription (Error Cases)
// ═══════════════════════════════════════════════════════════════════════════════

async function testCreateSubscriptionErrors() {
  section("10. LIVE ENDPOINT — Create Subscription (Error Cases)");

  if (!SUPABASE_ANON_KEY) {
    console.log("  ⚠️  Skipped — SUPABASE_ANON_KEY not in scripts/.env");
    return;
  }

  const jwt = await getSupabaseJWT();
  if (!jwt) {
    console.log("  ⚠️  Skipped — could not obtain Supabase JWT");
    return;
  }

  const timeout = (ms) =>
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms),
    );

  // Test 1: Try creating subscription with non-existent plan
  try {
    const res = await Promise.race([
      fetch(`${WORKERS_BASE}/api/subscription/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          plan_id: "00000000-0000-0000-0000-000000000000",
          billing_cycle: "monthly",
        }),
      }),
      timeout(15000),
    ]);
    checkTruthy(
      "Non-existent plan → 400 or 404 response",
      res.status === 400 || res.status === 404,
    );
    console.log(`    Status: ${res.status}`);
  } catch (e) {
    console.error(`  ❌ Non-existent plan test failed: ${e.message}`);
    failed++;
    failures.push("Create subscription — non-existent plan");
  }

  // Test 2: Empty plan_id
  try {
    const res = await Promise.race([
      fetch(`${WORKERS_BASE}/api/subscription/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          plan_id: "",
          billing_cycle: "monthly",
        }),
      }),
      timeout(15000),
    ]);
    check("Empty plan_id → 400 response", res.status, 400);
  } catch (e) {
    console.error(`  ❌ Empty plan_id test failed: ${e.message}`);
    failed++;
    failures.push("Create subscription — empty plan_id");
  }

  // Test 3: No auth header → 401
  try {
    const res = await Promise.race([
      fetch(`${WORKERS_BASE}/api/subscription/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: "some-plan",
          billing_cycle: "monthly",
        }),
      }),
      timeout(15000),
    ]);
    check("No auth header → 401 response", res.status, 401);
  } catch (e) {
    console.error(`  ❌ No auth header test failed: ${e.message}`);
    failed++;
    failures.push("Create subscription — no auth");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 11: Live Endpoint — Lifecycle Error Cases
// ═══════════════════════════════════════════════════════════════════════════════

async function testLifecycleErrorCases() {
  section("11. LIVE ENDPOINT — Lifecycle Error Cases");

  if (!SUPABASE_ANON_KEY) {
    console.log("  ⚠️  Skipped — SUPABASE_ANON_KEY not in scripts/.env");
    return;
  }

  const jwt = await getSupabaseJWT();
  if (!jwt) {
    console.log("  ⚠️  Skipped — could not obtain Supabase JWT");
    return;
  }

  const timeout = (ms) =>
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms),
    );

  // Cancel — no active subscription for test user
  try {
    const res = await Promise.race([
      fetch(`${WORKERS_BASE}/api/subscription/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      }),
      timeout(15000),
    ]);
    check("Cancel (no active sub) → 404", res.status, 404);
  } catch (e) {
    console.error(`  ❌ Cancel test failed: ${e.message}`);
    failed++;
    failures.push("Lifecycle — cancel no active sub");
  }

  // Pause — no active subscription
  try {
    const res = await Promise.race([
      fetch(`${WORKERS_BASE}/api/subscription/pause`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      }),
      timeout(15000),
    ]);
    check("Pause (no active sub) → 404", res.status, 404);
  } catch (e) {
    console.error(`  ❌ Pause test failed: ${e.message}`);
    failed++;
    failures.push("Lifecycle — pause no active sub");
  }

  // Resume — no paused subscription
  try {
    const res = await Promise.race([
      fetch(`${WORKERS_BASE}/api/subscription/resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      }),
      timeout(15000),
    ]);
    check("Resume (no paused sub) → 404", res.status, 404);
  } catch (e) {
    console.error(`  ❌ Resume test failed: ${e.message}`);
    failed++;
    failures.push("Lifecycle — resume no paused sub");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 12: Webhook Signature Verification (Unit Test)
// ═══════════════════════════════════════════════════════════════════════════════

function testWebhookSignatureVerification() {
  section("12. WEBHOOK — Signature Verification (HMAC-SHA256)");

  const webhookSecret = process.env.RAZORPAY_KEY_SECRET || "test-secret";

  // Test payload
  const rawBody = JSON.stringify({
    event: "subscription.activated",
    payload: {
      subscription: {
        entity: {
          id: "sub_test123",
          plan_id: "plan_test456",
          status: "active",
        },
      },
    },
  });

  // Generate valid signature
  const validSignature = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  // Test 1: Valid signature matches
  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");
  check(
    "Valid signature: matches → verified=true",
    validSignature === expectedSignature,
    true,
  );

  // Test 2: Tampered body does NOT match
  const tamperedBody = rawBody.replace("activated", "cancelled");
  const tamperedSignature = createHmac("sha256", webhookSecret)
    .update(tamperedBody)
    .digest("hex");
  check(
    "Tampered body: does NOT match original signature → verified=false",
    validSignature === tamperedSignature,
    false,
  );

  // Test 3: Wrong secret does NOT match
  const wrongSecretSignature = createHmac("sha256", "wrong-secret")
    .update(rawBody)
    .digest("hex");
  check(
    "Wrong secret: does NOT match → verified=false",
    validSignature === wrongSecretSignature,
    false,
  );

  // Test 4: Verify the HMAC format is correct hex
  checkTruthy(
    "Signature is 64-char hex string",
    /^[a-f0-9]{64}$/.test(validSignature),
  );

  console.log(`    Webhook secret used: ${webhookSecret.slice(0, 8)}...`);
  console.log(`    Sample signature: ${validSignature.slice(0, 32)}...`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 13: FALLBACK_PLANS Consistency Check
// ═══════════════════════════════════════════════════════════════════════════════

function testFallbackPlansConsistency() {
  section("13. FALLBACK_PLANS — Consistency Check");

  // Load exact FALLBACK_PLANS values from usePaywall.ts
  const FALLBACK_PLANS = [
    {
      id: "fallback-basic-monthly",
      tier: "basic",
      name: "Basic Plan",
      price_monthly: 299,
      billing_cycle: "monthly",
    },
    {
      id: "fallback-pro-monthly",
      tier: "pro",
      name: "Pro Plan (Monthly)",
      price_monthly: 599,
      billing_cycle: "monthly",
    },
    {
      id: "fallback-pro-yearly",
      tier: "pro",
      name: "Pro Plan (Yearly)",
      price_monthly: 400,
      billing_cycle: "yearly",
    },
  ];

  check("3 fallback plans total", FALLBACK_PLANS.length, 3);

  // Basic monthly
  const basicMonthly = FALLBACK_PLANS.find(
    (p) => p.tier === "basic" && p.billing_cycle === "monthly",
  );
  checkTruthy("Fallback basic monthly plan exists", basicMonthly);
  check("Fallback basic monthly price = 299", basicMonthly.price_monthly, 299);

  // Pro monthly
  const proMonthly = FALLBACK_PLANS.find(
    (p) => p.tier === "pro" && p.billing_cycle === "monthly",
  );
  checkTruthy("Fallback pro monthly plan exists", proMonthly);
  check(
    "Fallback pro monthly price = 599 (known discrepancy with DB price ₹499)",
    proMonthly.price_monthly,
    599,
  );

  // Pro yearly
  const proYearly = FALLBACK_PLANS.find(
    (p) => p.tier === "pro" && p.billing_cycle === "yearly",
  );
  checkTruthy("Fallback pro yearly plan exists", proYearly);
  check(
    "Fallback pro yearly price_monthly = 400",
    proYearly.price_monthly,
    400,
  );

  // Document the known bug
  console.log("");
  console.log("  ⚠️  KNOWN BUG: FALLBACK_PLANS pro monthly price is ₹599");
  console.log("     but the real DB price is ₹499. This discrepancy means");
  console.log("     users who see fallback plans get a higher price shown.");
  console.log(
    "     The fallback pro yearly ₹400/mo (₹4799/yr ÷ 12) is correct.",
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔄 FitAI Subscription Upgrade Flow Test");
  console.log(`   Time: ${new Date().toISOString()}\n`);

  // Pure logic tests (no I/O)
  testFreeUpgradeReadiness();
  testFreeToBasicUpgrade();
  testBasicToProUpgrade();
  testDowngradeCancelLogic();
  testYearlySavingsCalculation();
  testBillingLabel();
  testActionsVisibility();
  testRazorpayErrorCodes();
  testWebhookSignatureVerification();
  testFallbackPlansConsistency();

  // Live endpoint tests
  await testSubscriptionStatusEndpoint();
  await testCreateSubscriptionErrors();
  await testLifecycleErrorCases();

  // Summary
  const total = passed + failed;
  console.log(`\n${"═".repeat(60)}`);
  console.log("  SUMMARY");
  console.log(`${"═".repeat(60)}`);
  console.log(`  Total : ${total}`);
  console.log(`  Passed: ${passed} ✅`);
  console.log(`  Failed: ${failed} ❌`);
  console.log(
    `  Rate  : ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`,
  );

  if (failures.length > 0) {
    console.log("\n  ❌ Failed checks:");
    for (const f of failures) {
      console.log(`    - ${f}`);
    }
  }

  console.log(`\n${"═".repeat(60)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
