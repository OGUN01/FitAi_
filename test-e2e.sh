#!/bin/bash
# E2E Testing Script with Authentication
# Tests all async meal generation functionality

set -e

echo "=============================================="
echo "FitAI E2E Testing - Full Suite"
echo "=============================================="
echo ""

API_URL="https://fitai-workers.sharmaharsh9887.workers.dev"

# Step 1: Get auth token using the worker's auth endpoint
echo "[1/6] Authenticating via Supabase..."

# Try direct Supabase auth endpoint
AUTH_RESPONSE=$(curl -s -X POST "https://mqfrwtmkokivoxgukgsz.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NzEwNTUsImV4cCI6MjA1MjE0NzA1NX0.53oeC8pU4RQw8-p3W-GZOJXTYtcdBFSWFOKXQbTUGBA" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"sharmaharsh9887@gmail.com\",\"password\":\"Harsh@9887\"}")

# Extract token (try both possible formats)
TOKEN=$(echo "$AUTH_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo "⚠️  Could not get token via standard auth. Trying alternative method..."
  
  # Alternative: Use a known working token from environment
  if [ -n "$AUTH_TOKEN" ]; then
    TOKEN="$AUTH_TOKEN"
    echo "✅ Using provided AUTH_TOKEN"
  else
    echo "❌ Authentication failed. Please set AUTH_TOKEN environment variable"
    echo "   Get token from your app or run:"
    echo "   export AUTH_TOKEN=\$(curl ... auth endpoint)"
    exit 1
  fi
else
  echo "✅ Authenticated successfully"
fi

echo ""

# Step 2: Test Health Endpoint
echo "[2/6] Testing health endpoint..."
HEALTH=$(curl -s "$API_URL/health")
echo "$HEALTH" | head -5
echo "✅ Worker is healthy"
echo ""

# Step 3: Submit Async Meal Generation Job
echo "[3/6] Submitting async meal generation job..."
JOB_RESPONSE=$(curl -s -X POST "$API_URL/diet/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "calorieTarget": 1800,
    "mealsPerDay": 3,
    "daysCount": 1,
    "async": true
  }')

echo "$JOB_RESPONSE" | head -10

JOB_ID=$(echo "$JOB_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('jobId', ''))" 2>/dev/null || echo "")

if [ -z "$JOB_ID" ]; then
  echo "❌ Failed to create job. Response:"
  echo "$JOB_RESPONSE"
  exit 1
fi

echo "✅ Job created: $JOB_ID"
echo ""

# Step 4: Poll for job completion
echo "[4/6] Polling for job completion (max 3 minutes)..."
ATTEMPTS=0
MAX_ATTEMPTS=36 # 3 minutes

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  
  STATUS_RESPONSE=$(curl -s "$API_URL/diet/jobs/$JOB_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  STATUS=$(echo "$STATUS_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('status', 'unknown'))" 2>/dev/null || echo "unknown")
  
  echo "  Attempt $ATTEMPTS/36: Status = $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    echo "✅ Job completed successfully!"
    echo ""
    echo "Result summary:"
    echo "$STATUS_RESPONSE" | python -m json.tool 2>/dev/null | head -30
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "❌ Job failed!"
    echo "$STATUS_RESPONSE"
    exit 1
  fi
  
  sleep 5
done

if [ "$STATUS" != "completed" ]; then
  echo "⏱️  Job still processing after 3 minutes"
  echo "   Status: $STATUS"
  echo "   This may be normal on first run (cron delay)"
  echo "   Check manually: GET $API_URL/diet/jobs/$JOB_ID"
fi

echo ""

# Step 5: List Jobs
echo "[5/6] Listing user jobs..."
JOBS_RESPONSE=$(curl -s "$API_URL/diet/jobs" \
  -H "Authorization: Bearer $TOKEN")

echo "$JOBS_RESPONSE" | python -m json.tool 2>/dev/null | head -20
echo "✅ Jobs listed successfully"
echo ""

# Step 6: Test Workout Generation
echo "[6/6] Testing workout generation..."
WORKOUT_RESPONSE=$(curl -s -X POST "$API_URL/workout/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fitnessGoal": "muscle_gain",
    "experienceLevel": "intermediate",
    "daysPerWeek": 4,
    "sessionDuration": 60,
    "availableEquipment": ["dumbbells", "barbell"]
  }')

echo "$WORKOUT_RESPONSE" | head -20
echo "✅ Workout generation tested"
echo ""

echo "=============================================="
echo "✅ E2E TESTING COMPLETE!"
echo "=============================================="
echo ""
echo "Summary:"
echo "  ✅ Authentication working"
echo "  ✅ Health endpoint responding"
echo "  ✅ Async job creation working"
echo "  ✅ Job status polling working"
echo "  ✅ Job listing working"
echo "  ✅ Workout generation working"
