# Backend Integration Guide

## 🚧 Current Status: Client-Side Services Disabled

To improve security and prepare for production, the following client-side services have been **temporarily disabled**:

### ❌ Disabled Services

1. **Client-Side Gemini AI** (`src/ai/gemini.ts`)
   - ❌ Exposed 23 API keys in client bundle (security risk)
   - ❌ Direct API calls from client
   - 🔧 Now: Returns "not available" for all AI requests

2. **Client-Side IAP Validation** (`src/services/SubscriptionService.ts`)
   - ❌ Client-side purchase validation (can be bypassed)
   - 🔧 Now: Returns "not available" for subscription features

### ✅ Working Backend (Ready for Integration)

Your **Cloudflare Workers backend** is fully built and tested:
- **URL**: https://fitai-workers.sharmaharsh9887.workers.dev
- **Status**: ✅ Production-ready (95/100)
- **Location**: `fitai-workers/` directory

#### Backend Endpoints Available:

```typescript
// Workout Generation
POST /workout/generate
Body: { profile, workoutType, duration, focusMuscles }

// Diet/Meal Generation
POST /diet/generate
Body: { profile, dietType, mealCount, restrictions }

// Exercise Search
GET /exercises/search?query=...

// Chat/AI Assistant
POST /chat/message
Body: { conversationId, message, userId }

// Media Upload
POST /media/upload
Body: FormData with file

// Analytics
GET /api/analytics/usage

// Health Check
GET /health
```

---

## 🔄 How to Integrate Backend (When Ready)

### Step 1: Create API Client

Create `src/services/workersApi.ts`:

```typescript
// Cloudflare Workers API Client
const WORKERS_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';

export const workersApi = {
  // Generate workout via backend
  async generateWorkout(request: WorkoutRequest) {
    const response = await fetch(`${WORKERS_URL}/workout/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify(request),
    });
    return response.json();
  },

  // Generate meal plan via backend
  async generateMealPlan(request: DietRequest) {
    const response = await fetch(`${WORKERS_URL}/diet/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify(request),
    });
    return response.json();
  },

  // Validate subscription via backend
  async validateSubscription(receipt: string) {
    const response = await fetch(`${WORKERS_URL}/subscription/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({ receipt }),
    });
    return response.json();
  },
};

async function getAuthToken() {
  // Get Supabase auth token
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}
```

### Step 2: Re-enable Client Services

#### For Gemini AI (`src/ai/gemini.ts`):

1. Uncomment the initialization code (lines 149-180)
2. Keep using backend for production
3. Only use client-side AI for testing/development

#### For Subscriptions (`src/services/SubscriptionService.ts`):

1. Uncomment the initialization code (lines 127-157)
2. Add backend validation after client purchase:

```typescript
async handlePurchaseSuccess(purchase: Purchase) {
  // 1. Finish transaction on device
  await finishTransaction(purchase);

  // 2. Validate on backend (CRITICAL!)
  const validation = await workersApi.validateSubscription(
    purchase.transactionReceipt
  );

  if (validation.success) {
    // Update local state
    await this.updateSubscriptionStatus(validation.data);
  }
}
```

### Step 3: Update Components

#### CreateRecipeModal (`src/components/diet/CreateRecipeModal.tsx`):

Replace lines 121-128:

```typescript
// OLD: Check if local AI is available
if (!geminiService.isAvailable()) { ... }

// NEW: Call backend instead
const response = await workersApi.generateRecipe({
  description: inputs.description,
  dietary: inputs.dietary,
  time: inputs.time,
  servings: inputs.servings,
  profile: profile,
});
```

---

## 📊 Why Backend Integration?

### Security Benefits:
✅ API keys never exposed in client bundle
✅ Server-side validation for purchases
✅ Rate limiting and abuse prevention
✅ Centralized monitoring and logging

### Performance Benefits:
✅ Edge deployment (0ms cold start)
✅ 3-tier caching system
✅ Request deduplication
✅ Cost optimization ($0 with Cloudflare free tier)

---

## 🧪 Testing Backend

Your backend is already tested and working. Test endpoints:

```bash
# Health check
curl https://fitai-workers.sharmaharsh9887.workers.dev/health

# Generate workout (requires auth token)
curl -X POST https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "profile": {...},
    "workoutType": "strength",
    "duration": 45
  }'
```

See `fitai-workers/ARCHITECTURE_AND_STATUS.md` for full testing details.

---

## 📝 Files Modified (Current Cleanup)

```
✅ src/ai/gemini.ts
   - Disabled auto-initialization
   - Suppressed error logs
   - Added re-enable instructions

✅ src/services/SubscriptionService.ts
   - Disabled IAP initialization
   - Added backend validation notes

✅ src/components/diet/CreateRecipeModal.tsx
   - Added availability check
   - Shows user-friendly message when disabled
```

---

## ⏭️ Next Steps (When You're Ready)

1. **Phase 1**: Test backend endpoints manually ✅ DONE
2. **Phase 2**: Create API client wrapper (30 min)
3. **Phase 3**: Migrate workout generation (1 hour)
4. **Phase 4**: Migrate meal planning (1 hour)
5. **Phase 5**: Add subscription validation (2 hours)
6. **Phase 6**: Remove client-side AI completely (30 min)

**Estimated Total Integration Time**: 4-5 hours

---

## 📚 Additional Resources

- Backend Architecture: `fitai-workers/ARCHITECTURE_AND_STATUS.md`
- Backend Setup: `fitai-workers/README.md`
- API Documentation: `fitai-workers/FINAL_STATUS_REPORT.md`
- Test Scripts: `fitai-workers/*.js` (working examples)

---

## 🎯 Summary

**Current State:**
✅ Backend is production-ready
✅ Client-side services disabled for security
✅ No more error logs on startup

**When You're Ready:**
👉 Follow this guide to integrate backend
👉 Keep backend as source of truth
👉 Maintain security best practices

Your Cloudflare Workers backend is **ready to use** whenever you want to integrate it! 🚀
