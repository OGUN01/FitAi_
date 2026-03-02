/**
 * FitAI — Get Test JWT
 * ────────────────────
 * Uses Supabase Admin API to generate a magic link for a test user,
 * then verifies the OTP to exchange it for a real access_token (JWT).
 *
 * Run: node scripts/get-test-jwt.mjs
 * Then add the printed JWT to scripts/.env as FITAI_TEST_JWT=<token>
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env files ──────────────────────────────────────────────────────────
function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  }
}

loadEnv(join(__dirname, ".env"));
loadEnv(join(__dirname, "..", ".env"));
loadEnv(join(__dirname, "..", ".env.local"));

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://mqfrwtmkokivoxgukgsz.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY not found");
  process.exit(1);
}

async function listUsers() {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=10`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!res.ok) throw new Error(`List users: ${res.status} ${await res.text()}`);
  return res.json();
}

async function generateLink(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", email }),
  });
  if (!res.ok)
    throw new Error(`Generate link: ${res.status} ${await res.text()}`);
  return res.json();
}

async function verifyOTP(email, token) {
  // Use the public anon key — this is the OTP verification endpoint (no auth required)
  const key = ANON_KEY || SERVICE_ROLE_KEY;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", token, email }),
  });
  if (!res.ok) throw new Error(`Verify OTP: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log("🔑 FitAI — Supabase Test JWT Generator");
  console.log(`   Supabase: ${SUPABASE_URL}\n`);

  // Step 1: Get users
  console.log("Step 1: Listing Supabase users...");
  const usersData = await listUsers();
  const users = usersData.users || [];
  if (!users.length) {
    console.error("❌ No users found.");
    process.exit(1);
  }

  users.forEach((u, i) => {
    console.log(
      `   [${i + 1}] ${u.email} — confirmed: ${u.email_confirmed_at ? "yes" : "no"}`,
    );
  });

  const user = users.find((u) => u.email_confirmed_at) || users[0];
  console.log(`\n   → Using: ${user.email}`);

  // Step 2: Generate magic link
  console.log("\nStep 2: Generating magic link...");
  const linkData = await generateLink(user.email);

  // Extract hashed_token from response
  const hashedToken =
    linkData.hashed_token || linkData.properties?.hashed_token;
  const emailOtpToken = linkData.email_otp;

  console.log("   Link data keys:", Object.keys(linkData).join(", "));
  if (linkData.properties) {
    console.log(
      "   Properties keys:",
      Object.keys(linkData.properties).join(", "),
    );
  }

  if (!hashedToken && !emailOtpToken) {
    console.error("❌ Could not find token in response:");
    console.error(JSON.stringify(linkData, null, 2));
    process.exit(1);
  }

  const otpToken = hashedToken || emailOtpToken;
  console.log(
    `   Token (${otpToken.length} chars): ${otpToken.slice(0, 20)}...`,
  );

  // Step 3: Exchange OTP for session JWT
  console.log("\nStep 3: Exchanging OTP for access token...");
  const session = await verifyOTP(user.email, otpToken);

  if (!session.access_token) {
    console.error("❌ No access_token in session response:");
    console.error(JSON.stringify(session, null, 2));
    process.exit(1);
  }

  const jwt = session.access_token;
  console.log("\n" + "═".repeat(70));
  console.log("✅ SUCCESS — Add this to scripts/.env:");
  console.log("═".repeat(70));
  console.log(`FITAI_TEST_JWT=${jwt}`);
  console.log("═".repeat(70));
  console.log(`\nUser   : ${user.email}`);
  console.log(`JWT len: ${jwt.length} chars`);
  console.log(`Expires: ${session.expires_in}s from now`);
}

main().catch((err) => {
  console.error("Fatal:", err.message || err);
  process.exit(1);
});
