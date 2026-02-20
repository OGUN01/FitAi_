#!/usr/bin/env node

/**
 * Razorpay Plan Creation Script
 *
 * Creates 3 subscription plans in Razorpay test mode:
 * - Basic Monthly: ₹299/month
 * - Pro Monthly: ₹499/month
 * - Pro Yearly: ₹3,999/year
 *
 * Prerequisites:
 * 1. Create .env file in scripts/ directory with:
 *    RAZORPAY_KEY_ID=rzp_test_xxx
 *    RAZORPAY_KEY_SECRET=xxx
 * 2. Run: bun install
 *
 * Usage:
 *   bun scripts/create-razorpay-plans.ts
 *
 * Output:
 *   Plan IDs to be added to Supabase subscription_plans table
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, ".env") });

interface RazorpayPlan {
  id: string;
  entity: "plan";
  interval: number;
  period: "daily" | "weekly" | "monthly" | "yearly";
  item: {
    id: string;
    active: boolean;
    name: string;
    description: string | null;
    amount: number;
    currency: string;
  };
  notes: Record<string, string>;
  created_at: number;
}

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error(
    "❌ Error: Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in scripts/.env",
  );
  console.error(
    "   Create scripts/.env with your Razorpay test mode credentials.",
  );
  process.exit(1);
}

const basicAuth = Buffer.from(
  `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`,
).toString("base64");

async function createPlan(
  name: string,
  amount: number,
  period: "monthly" | "yearly",
  interval: number,
  tier: string,
): Promise<RazorpayPlan> {
  const response = await fetch("https://api.razorpay.com/v1/plans", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      period,
      interval,
      item: {
        name,
        amount,
        currency: "INR",
        description: `FitAI ${tier} subscription - ${period} billing`,
      },
      notes: {
        tier,
        billing_cycle: period,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Razorpay API error: ${response.status} ${error}`);
  }

  return response.json();
}

async function main() {
  console.log("🚀 Creating Razorpay subscription plans...\n");

  try {
    const plans: Record<string, RazorpayPlan> = {};

    console.log("Creating Basic Monthly plan (₹299/month)...");
    plans.basicMonthly = await createPlan(
      "FitAI Basic - Monthly",
      29900,
      "monthly",
      1,
      "basic",
    );
    console.log(`✅ Created: ${plans.basicMonthly.id}\n`);

    console.log("Creating Pro Monthly plan (₹499/month)...");
    plans.proMonthly = await createPlan(
      "FitAI Pro - Monthly",
      49900,
      "monthly",
      1,
      "pro",
    );
    console.log(`✅ Created: ${plans.proMonthly.id}\n`);

    console.log("Creating Pro Yearly plan (₹3,999/year)...");
    plans.proYearly = await createPlan(
      "FitAI Pro - Yearly",
      399900,
      "yearly",
      1,
      "pro",
    );
    console.log(`✅ Created: ${plans.proYearly.id}\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✨ All plans created successfully!\n");

    console.log("📋 Plan IDs (copy these to Cloudflare Workers env):");
    console.log(`   RAZORPAY_PLAN_ID_BASIC_MONTHLY=${plans.basicMonthly.id}`);
    console.log(`   RAZORPAY_PLAN_ID_PRO_MONTHLY=${plans.proMonthly.id}`);
    console.log(`   RAZORPAY_PLAN_ID_PRO_YEARLY=${plans.proYearly.id}\n`);

    console.log("📝 Update Supabase subscription_plans table:");
    console.log(
      `   UPDATE subscription_plans SET razorpay_plan_id_monthly = '${plans.basicMonthly.id}' WHERE tier = 'basic';`,
    );
    console.log(
      `   UPDATE subscription_plans SET razorpay_plan_id_monthly = '${plans.proMonthly.id}', razorpay_plan_id_yearly = '${plans.proYearly.id}' WHERE tier = 'pro';`,
    );
    console.log("\n🎉 Done!");
  } catch (error) {
    console.error("❌ Error creating plans:", error);
    process.exit(1);
  }
}

main();
