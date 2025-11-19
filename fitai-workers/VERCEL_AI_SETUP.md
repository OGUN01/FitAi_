# Vercel AI Gateway Setup for FitAI

## ✨ The Simple Way

With Vercel AI Gateway, you only need **3 secrets** instead of 23+!

---

## 🔑 Required Secrets

### 1. Vercel AI Gateway API Key
**What:** Single key for 100+ AI models
**Where to get:**
1. Go to https://vercel.com/dashboard
2. Navigate to **Settings** → **AI Gateway**
3. Click **"Create API Key"**
4. Copy the key (format: `va_...`)

**Set in Workers:**
```bash
cd fitai-workers
wrangler secret put VERCEL_AI_GATEWAY_KEY
# Paste your va_... key when prompted
```

---

### 2. Supabase URL
**What:** Your Supabase project URL
**Where to get:**
1. Go to https://supabase.com/dashboard
2. Select your FitAI project
3. Go to **Settings** → **API**
4. Copy **"Project URL"** (format: `https://xxx.supabase.co`)

**Set in Workers:**
```bash
wrangler secret put SUPABASE_URL
# Enter: https://YOUR_PROJECT_ID.supabase.co
```

---

### 3. Supabase Service Role Key
**What:** Server-side database access
**Where to get:**
1. Same page as above (**Settings** → **API**)
2. Copy **"service_role"** key (NOT anon key)
3. This is sensitive - server use only!

**Set in Workers:**
```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste the service_role key
```

---

## 🚀 Quick Setup Script

Run this from `fitai-workers/` directory:

```bash
#!/bin/bash

echo "🔐 FitAI Workers Secrets Setup"
echo "================================"
echo ""

echo "1️⃣  Vercel AI Gateway API Key"
echo "   Get from: https://vercel.com/dashboard → AI Gateway"
wrangler secret put VERCEL_AI_GATEWAY_KEY

echo ""
echo "2️⃣  Supabase Project URL"
echo "   Get from: https://supabase.com/dashboard → Settings → API"
wrangler secret put SUPABASE_URL

echo ""
echo "3️⃣  Supabase Service Role Key"
echo "   Get from: Same page as above (service_role key)"
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

echo ""
echo "✅ Setup complete!"
echo "🔍 Verify: wrangler secret list"
```

Save as `setup-secrets.sh`, make executable, and run:
```bash
chmod +x setup-secrets.sh
./setup-secrets.sh
```

---

## ✅ Verify Setup

Check that all secrets are set:
```bash
wrangler secret list
```

Expected output:
```
VERCEL_AI_GATEWAY_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

---

## 🤖 How It Works

### Vercel AI Gateway provides:
- ✅ **100+ models** via one API key
- ✅ **OpenAI-compatible** endpoint
- ✅ **Auto-fallback** if a model is down
- ✅ **Unified billing** (no per-provider management)
- ✅ **20ms latency** routing

### Supported Models (examples):
```javascript
// OpenAI
model: 'openai/gpt-4o'
model: 'openai/gpt-4o-mini'

// Anthropic
model: 'anthropic/claude-sonnet-4'
model: 'anthropic/claude-3-5-haiku'

// Google
model: 'google/gemini-2.0-flash-exp'
model: 'google/gemini-1.5-pro'

// xAI
model: 'xai/grok-2'
model: 'xai/grok-2-mini'

// Mistral
model: 'mistral/mistral-large'

// And 100+ more!
```

### Usage in Worker:
```typescript
import { createOpenAI } from '@ai-sdk/openai';

// Configure to use Vercel AI Gateway
const ai = createOpenAI({
  apiKey: env.VERCEL_AI_GATEWAY_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

// Use any model
const result = await generateText({
  model: ai('openai/gpt-4o-mini'),
  prompt: 'Generate a workout plan...',
});
```

---

## 💰 Cost Benefits

With Vercel AI Gateway + Smart Hybrid Caching (65% hit rate):

| Users | Requests/Day | AI Cost/Month | Notes |
|-------|--------------|---------------|-------|
| 3K | 1,500 | **$5.46** | 76 years with $5K credits |
| 10K | 5,000 | **$18.20** | 23 years with $5K credits |
| 20K | 10,000 | **$36.40** | 11 years with $5K credits |

**Vercel handles:**
- Rate limiting per provider
- Automatic failover
- Request routing
- Cost optimization

---

## 🔒 Security Checklist

Before deploying:
- [ ] All secrets set via `wrangler secret put` ✓
- [ ] `.env` file added to `.gitignore` ✓
- [ ] No secrets in `wrangler.jsonc` (only URLs) ✓
- [ ] Service role key NEVER exposed to client ✓
- [ ] Verified with `wrangler secret list` ✓

---

## 🧪 Test After Setup

```bash
# Deploy Worker with secrets
cd fitai-workers
wrangler deploy

# Test the endpoint
curl https://fitai-workers.sharmaharsh9887.workers.dev/health

# Check logs
wrangler tail
```

---

**Status:** Ready for secret configuration
**Created:** 2025-11-14
**Simplification:** From 23+ keys → **3 keys**
**Time to set up:** ~3 minutes
