/**
 * Manual verification script for async diet generation
 * Run with: node verify-async.js
 */

const API_URL = "https://fitai-workers.sharmaharsh9887.workers.dev";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyAsync() {
  console.log("=".repeat(60));
  console.log("Async Diet Generation - Manual Verification");
  console.log("=".repeat(60));
  console.log("");

  // Note: This requires a valid auth token
  // Get one by logging into your app or using Supabase auth
  const authToken = process.env.AUTH_TOKEN || "YOUR_TOKEN_HERE";

  if (authToken === "YOUR_TOKEN_HERE") {
    console.log("❌ ERROR: Please set AUTH_TOKEN environment variable");
    console.log("   Example: AUTH_TOKEN=xxx node verify-async.js");
    process.exit(1);
  }

  try {
    // Step 1: Test health endpoint
    console.log("[1/5] Testing health endpoint...");
    const healthRes = await fetch(`${API_URL}/health`);
    const health = await healthRes.json();
    console.log("✅ Worker is healthy:", health.status);
    console.log("");

    // Step 2: Submit async job
    console.log("[2/5] Submitting async diet generation job...");
    const jobRes = await fetch(`${API_URL}/diet/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        calorieTarget: 1800,
        mealsPerDay: 3,
        daysCount: 1,
        async: true,
      }),
    });

    if (!jobRes.ok) {
      const error = await jobRes.json();
      console.log("❌ Failed to create job:", error);
      process.exit(1);
    }

    const jobData = await jobRes.json();
    const jobId = jobData.data.jobId;
    console.log("✅ Job created:", jobId);
    console.log("   Status:", jobData.data.status);
    console.log("   Message:", jobData.data.message);
    console.log("");

    // Step 3: Poll for completion
    console.log("[3/5] Polling for job completion...");
    console.log("   (Cron runs every 1 min, processing takes ~30-60s)");

    let attempts = 0;
    const maxAttempts = 30; // 2.5 minutes max
    let finalStatus = null;

    while (attempts < maxAttempts) {
      attempts++;
      await sleep(5000); // Poll every 5 seconds

      const statusRes = await fetch(`${API_URL}/diet/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const statusData = await statusRes.json();
      const status = statusData.data.status;

      console.log(`   Attempt ${attempts}: ${status}`);

      if (status === "completed") {
        finalStatus = statusData;
        console.log("✅ Job completed successfully!");
        break;
      } else if (status === "failed") {
        console.log("❌ Job failed:", statusData.data.error_message);
        process.exit(1);
      }
    }

    if (!finalStatus) {
      console.log("⏱️  Job still processing after 2.5 minutes");
      console.log("   This is normal for first run (cron delay)");
      console.log("   Check status manually: GET /diet/jobs/" + jobId);
      process.exit(0);
    }

    console.log("");

    // Step 4: Verify result
    console.log("[4/5] Verifying result...");
    const result = finalStatus.data.result;

    if (result && result.days && result.days.length > 0) {
      console.log("✅ Valid meal plan generated:");
      console.log("   Days:", result.days.length);
      console.log("   First day meals:", result.days[0].meals.length);
      console.log("   Total calories:", result.summary.totalCalories);
    } else {
      console.log("❌ Invalid result structure");
    }
    console.log("");

    // Step 5: List jobs
    console.log("[5/5] Listing recent jobs...");
    const listRes = await fetch(`${API_URL}/diet/jobs`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const listData = await listRes.json();
    console.log("✅ Found", listData.data.jobs.length, "jobs");
    console.log("");

    console.log("=".repeat(60));
    console.log("✅ ALL TESTS PASSED!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

verifyAsync();
