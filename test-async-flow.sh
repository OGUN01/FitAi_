#!/bin/bash
# Test async diet generation flow
# Usage: bash test-async-flow.sh

set -e

echo "========================================="
echo "Testing Async Diet Generation Flow"
echo "========================================="

# Configuration
API_URL="https://fitai-workers.sharmaharsh9887.workers.dev"
SUPABASE_URL="https://mqfrwtmkokivoxgukgsz.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NzEwNTUsImV4cCI6MjA1MjE0NzA1NX0.53oeC8pU4RQw8-p3W-GZOJXTYtcdBFSWFOKXQbTUGBA"

# Step 1: Authenticate
echo ""
echo "[1/5] Authenticating..."
AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"sharmaharsh9887@gmail.com","password":"Harsh@9887"}')

TOKEN=$(echo $AUTH_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed!"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo "✅ Authenticated successfully"

# Step 2: Submit async job
echo ""
echo "[2/5] Submitting async diet generation job..."
JOB_RESPONSE=$(curl -s -X POST "${API_URL}/diet/generate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"calorieTarget":1800,"mealsPerDay":3,"daysCount":1,"async":true}')

echo "Response: $JOB_RESPONSE"

JOB_ID=$(echo $JOB_RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  echo "❌ Job submission failed!"
  exit 1
fi

echo "✅ Job submitted: $JOB_ID"

# Step 3: Poll for completion
echo ""
echo "[3/5] Polling for job completion (max 3 minutes)..."
MAX_ATTEMPTS=36
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  
  STATUS_RESPONSE=$(curl -s "${API_URL}/diet/jobs/${JOB_ID}" \
    -H "Authorization: Bearer ${TOKEN}")
  
  STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  
  echo "  Attempt $ATTEMPT: Status = $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    echo "✅ Job completed successfully!"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "❌ Job failed!"
    echo "Response: $STATUS_RESPONSE"
    exit 1
  fi
  
  sleep 5
done

if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
  echo "❌ Job timed out after 3 minutes"
  exit 1
fi

# Step 4: Get result
echo ""
echo "[4/5] Fetching result..."
RESULT=$(curl -s "${API_URL}/diet/jobs/${JOB_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

echo "$RESULT" | head -50

# Step 5: List all jobs
echo ""
echo "[5/5] Listing recent jobs..."
JOBS=$(curl -s "${API_URL}/diet/jobs" \
  -H "Authorization: Bearer ${TOKEN}")

echo "$JOBS"

echo ""
echo "========================================="
echo "✅ Test completed successfully!"
echo "========================================="
