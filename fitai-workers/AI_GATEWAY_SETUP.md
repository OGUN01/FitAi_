# Cloudflare AI Gateway Setup Guide

## Overview
AI Gateway provides analytics, caching, rate limiting, and cost tracking for AI API calls across multiple providers.

## Setup Steps (Dashboard)

### 1. Navigate to AI Gateway
1. Go to https://dash.cloudflare.com/914022281183abb7ca6a5590fec4b994
2. Click **AI** in the left sidebar
3. Click **AI Gateway**

### 2. Create New Gateway
1. Click **"Create Gateway"** button
2. Enter Gateway Details:
   - **Name:** `fitai-production`
   - **Description:** `FitAI production AI requests gateway`
3. Click **"Create"**

### 3. Note Gateway Configuration
After creation, you'll receive:
- **Gateway URL:** `https://gateway.ai.cloudflare.com/v1/914022281183abb7ca6a5590fec4b994/fitai-production`
- **Gateway Slug:** `fitai-production`
- **Account ID:** `914022281183abb7ca6a5590fec4b994`

### 4. Gateway URL Format
```
https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_slug}/{provider}/{endpoint}
```

**Examples:**
- OpenAI: `https://gateway.ai.cloudflare.com/v1/914022281183abb7ca6a5590fec4b994/fitai-production/openai/chat/completions`
- Anthropic: `https://gateway.ai.cloudflare.com/v1/914022281183abb7ca6a5590fec4b994/fitai-production/anthropic/v1/messages`
- Google (Gemini): `https://gateway.ai.cloudflare.com/v1/914022281183abb7ca6a5590fec4b994/fitai-production/google-ai-studio/v1beta/models/gemini-pro:generateContent`

## Testing AI Gateway

### Test with curl (OpenAI example)
```bash
curl https://gateway.ai.cloudflare.com/v1/914022281183abb7ca6a5590fec4b994/fitai-production/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello from FitAI!"}]
  }'
```

### Verify in Dashboard
1. Go to AI Gateway dashboard
2. Click on `fitai-production` gateway
3. Check **"Recent Requests"** tab
4. You should see the test request logged

## Features Enabled

### ✅ Analytics
- Request volume
- Token usage
- Cost tracking
- Latency metrics

### ✅ Caching
- Semantic caching (similar requests)
- TTL configuration
- Cache hit rate tracking

### ✅ Rate Limiting
- Per-user limits
- Per-endpoint limits
- Automatic retry with backoff

### ✅ Multi-Provider Routing
- Automatic fallbacks
- Load balancing
- Provider failover

### ✅ Cost Tracking
- Real-time spend monitoring
- Per-model cost breakdown
- Budget alerts

## Configuration for Vercel AI SDK

In Worker code:
```typescript
// src/services/aiRouter.ts
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  baseURL: 'https://gateway.ai.cloudflare.com/v1/914022281183abb7ca6a5590fec4b994/fitai-production/openai/v1',
  apiKey: env.OPENAI_API_KEY,
});
```

## Environment Variables to Add

Add to `wrangler.jsonc` vars or secrets:
```json
{
  "vars": {
    "AI_GATEWAY_URL": "https://gateway.ai.cloudflare.com/v1/914022281183abb7ca6a5590fec4b994/fitai-production",
    "AI_GATEWAY_SLUG": "fitai-production"
  }
}
```

## Status

- [ ] Gateway created in dashboard
- [ ] Gateway URL noted
- [ ] Test request sent
- [ ] Request visible in dashboard
- [ ] Configuration documented

**Created:** 2025-11-14
**Status:** Pending dashboard creation
