# FitAI Workers - Testing Guide

Complete guide to test the workout generation endpoint end-to-end.

---

## 📋 Prerequisites

Before testing, ensure you have:
- ✅ Cloudflare Workers deployed
- ✅ Supabase project configured
- ✅ Valid Supabase user account
- ✅ Node.js installed (for test scripts)

---

## 🔑 Step 1: Get JWT Token

You have **3 options** to get a valid JWT token:

### Option A: Use Supabase Dashboard (Easiest)

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** > **Users**
4. Click on any user
5. Scroll down to **"Access Token"**
6. Click **"Copy Access Token"**
7. Token is copied to clipboard!

### Option B: Use Mobile App (If Available)

1. Open your FitAI mobile app
2. Sign in with your account
3. Extract token from AsyncStorage/SecureStore
4. Token key is usually: `supabase.auth.token` or similar

### Option C: Use Helper Script (Create New User)

```bash
# Install dependencies
cd D:/FitAi/FitAI/fitai-workers
npm install @supabase/supabase-js

# Set environment variables
export SUPABASE_URL="https://mnkocepybapknfxlsxef.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key-here"

# Sign in with existing user
node get-jwt-token.js signin test@example.com password123

# OR create new test user
node get-jwt-token.js signup test@fitai.com TestPassword123!
```

The script will output:
```
=== JWT ACCESS TOKEN ===
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Copy this token** for the next steps.

---

## 🧪 Step 2: Run Tests

Once you have the JWT token, run the comprehensive test script:

```bash
cd D:/FitAi/FitAI/fitai-workers

# Method 1: Pass token as argument
node test-workout-generation.js "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Method 2: Use environment variable
export SUPABASE_JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
node test-workout-generation.js
```

### What the Test Script Does:

1. ✅ **Tests Authentication**
   - No token → 401 Unauthorized
   - Invalid token → 401 Unauthorized
   - Valid token → 200 Success

2. ✅ **Tests Rate Limiting**
   - Checks X-RateLimit headers
   - Verifies 50 req/hour limit

3. ✅ **Tests Exercise Filtering**
   - Verifies 1500 → 30-50 exercises
   - Shows filtering stats (equipment, body parts, experience)
   - Confirms 95%+ token reduction

4. ✅ **Tests AI Generation**
   - Calls Google Gemini 2.0 Flash via Vercel AI Gateway
   - Generates personalized workout
   - Shows token usage and cost

5. ✅ **Tests Caching System**
   - First request: Cache MISS (fresh generation)
   - Second request: Cache HIT (served from KV/Database)
   - Verifies 60-70% cache hit rate

6. ✅ **Tests Response Enrichment**
   - Verifies all exercises have full data
   - Checks GIF URLs are present and fixed
   - Confirms 100% GIF coverage

7. ✅ **Tests Complete Workout Structure**
   - Warmup exercises
   - Main workout exercises
   - Cooldown exercises
   - Sets, reps, rest periods

---

## 📊 Expected Output

If everything is working correctly, you should see:

```
╔═══════════════════════════════════════════════════════════════╗
║         FitAI Workers - Workout Generation Tests            ║
╚═══════════════════════════════════════════════════════════════╝

=== Testing Authentication ===
Test 1: Request without token (should return 401)...
✅ Authentication properly enforced (401 Unauthorized)

Test 2: Request with invalid token (should return 401)...
✅ Invalid token properly rejected (401 Unauthorized)

=== Testing Workout Generation Endpoint ===
1. Sending request to: https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate
3. Response received in 2847ms
4. Status: 200 OK

=== Rate Limit Headers ===
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 49
X-RateLimit-Reset: 1699876543

✅ Request successful!

=== Response Analysis ===
Success: true
Cached: false
Cache Source: fresh
Model: google:gemini-2.0-flash-001
Generation Time: 2847ms
AI Generation Time: 2245ms
Tokens Used: 687
Cost (USD): 0.000069

=== Exercise Filtering Stats ===
Total Exercises: 1500
After Equipment Filter: 412
After Body Parts Filter: 156
After Experience Filter: 98
Final Selection: 40
Reduction: 1500 → 40 (97.3% reduction)

=== Workout Details ===
Title: Chest, Shoulders & Triceps Push Workout
Description: An intermediate-level push workout focusing on building muscle...
Total Duration: 45 minutes
Difficulty: intermediate
Estimated Calories: 350

Warmup Exercises: 2
Main Exercises: 8
Cooldown Exercises: 2

=== Sample Exercises (first 3) ===
1. Exercise ID: VPPtusI
   Sets: 4, Reps: 8-10, Rest: 90s
   Name: barbell bench press
   Equipment: barbell
   Body Parts: chest
   GIF URL: https://static.exercisedb.dev/media/VPPtusI.gif
   GIF Fixed: ✅

2. Exercise ID: ABC123X
   Sets: 3, Reps: 10-12, Rest: 60s
   Name: dumbbell shoulder press
   Equipment: dumbbell
   Body Parts: shoulders
   GIF URL: https://static.exercisedb.dev/media/ABC123X.gif
   GIF Fixed: ✅

3. Exercise ID: XYZ789Z
   Sets: 3, Reps: 12-15, Rest: 45s
   Name: cable tricep pushdown
   Equipment: cable
   Body Parts: arms
   GIF URL: https://static.exercisedb.dev/media/XYZ789Z.gif
   GIF Fixed: ✅

=== GIF Coverage ===
Total exercises: 12
Exercises with GIFs: 12
Coverage: 100.0%
Status: ✅ 100% Coverage!

=== Testing Caching System ===
Making first request (should be cache MISS)...
[Same output as above, cached: false]

Making second request (should be cache HIT)...
[Faster response time, cached: true]

✅ Caching is working! Second request was served from cache.
Cache source: kv

╔═══════════════════════════════════════════════════════════════╗
║                     Tests Complete!                          ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 🔍 Step 3: Manual Testing (Optional)

You can also test manually using `curl`:

```bash
# Set your token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test health check
curl https://fitai-workers.sharmaharsh9887.workers.dev/health

# Test authentication (should fail)
curl -X POST https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate \
  -H "Content-Type: application/json" \
  -d '{}'

# Test workout generation (should work)
curl -X POST https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "profile": {
      "age": 25,
      "weight": 70,
      "height": 175,
      "gender": "male",
      "fitnessGoal": "muscle_gain",
      "experienceLevel": "intermediate",
      "availableEquipment": ["dumbbell", "barbell", "body weight"]
    },
    "workoutType": "push",
    "duration": 45
  }' | jq '.'
```

---

## 📝 Step 4: Check Cloudflare Logs

Monitor Worker execution in real-time:

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com
2. Select **Workers & Pages**
3. Click **fitai-workers**
4. Go to **Logs** tab
5. Watch real-time logs while running tests

You should see:
- `[Workout Generation] Request validated`
- `[Filter Layer 1] Equipment: 1500 → 412 exercises`
- `[Filter Layer 2] Body parts: 412 → 156 exercises`
- `[Filter Layer 3] Experience: 156 → 98 exercises`
- `[Filter Layer 4] Ranking: 98 → 40 exercises`
- `[Workout Generation] Calling AI model: google:gemini-2.0-flash-001`
- `[Workout Generation] AI generation complete: { generationTime: 2245ms }`
- `[Workout Generation] Cached successfully`

---

## ✅ Success Criteria

All tests should pass with:
- ✅ Authentication working (401 for invalid/missing tokens)
- ✅ Rate limiting headers present
- ✅ Exercise filtering: 1500 → 30-50 exercises
- ✅ AI generation successful (Google Gemini)
- ✅ Response time: <5 seconds for fresh, <500ms for cached
- ✅ 100% GIF coverage (all exercises have valid GIF URLs)
- ✅ Caching working (second request served from cache)
- ✅ No errors in Worker logs

---

## 🐛 Troubleshooting

### Issue: "Invalid or expired token"
- **Solution:** Get a fresh JWT token (tokens expire after 1 hour)

### Issue: "Rate limit exceeded"
- **Solution:** Wait 1 hour or increase rate limits in `src/middleware/rateLimit.ts`

### Issue: "No exercises found"
- **Solution:** Adjust equipment/body parts in test request

### Issue: "Validation failed"
- **Solution:** Check request body matches schema in `src/utils/validation.ts`

### Issue: "AI generation failed"
- **Solution:** Check Vercel AI Gateway key is valid and has credits

### Issue: "Exercise database not loaded"
- **Solution:** Verify `src/data/exerciseDatabase.json` exists and is valid JSON

---

## 📧 Next Steps

After all tests pass:
1. ✅ Mark Task 1.5 as fully tested
2. ✅ Update IMPLEMENTATION_STATUS.md
3. ✅ Proceed to Task 1.6 (Diet generation endpoint)

---

**Ready to test?** Run: `node get-jwt-token.js` to get started!
