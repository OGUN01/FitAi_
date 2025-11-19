# FitAI Cloudflare Workers API

Centralized AI generation API for FitAI mobile app.

## Project Information

- **Domain:** fitai.health
- **API Endpoint:** api.fitai.health (to be configured)
- **Account ID:** 914022281183abb7ca6a5590fec4b994
- **Created:** 2025-11-14

## Project Structure

```
fitai-workers/
├── src/
│   └── index.ts              # Main Worker entry point
├── test/                     # Test files
├── wrangler.jsonc            # Cloudflare Worker configuration
├── package.json              # Node.js dependencies
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Development Commands

### Run locally (with hot reload)
```bash
npx wrangler dev
```
Access at: http://localhost:8787

### Check authentication
```bash
npx wrangler whoami
```

### Deploy to staging
```bash
npx wrangler deploy --env staging
```

### Deploy to production
```bash
npx wrangler deploy --env production
```

## Architecture

This Worker serves as the centralized API gateway for:
- 🏋️ Workout generation
- 🍎 Diet/meal plan generation
- 💬 AI chat assistance
- 🎥 Exercise media serving
- 🖼️ Diet media serving

See `/ARCHITECTURE.md` in main FitAI repository for complete system design.

## Implementation Status

### Phase 0: Infrastructure Setup
- [x] Task 0.1: Cloudflare account setup ✓
- [x] Task 0.2: Workers project initialized ✓
- [ ] Task 0.3: KV namespaces (workout_cache, meal_cache, rate_limit)
- [ ] Task 0.4: R2 bucket (media storage)
- [ ] Task 0.5: AI Gateway setup
- [ ] Task 0.6: Environment variables & secrets
- [ ] Task 0.7: Supabase migrations
- [ ] Task 0.8: Dependencies installation

## Technology Stack

- **Runtime:** Cloudflare Workers (V8 isolates)
- **Language:** TypeScript
- **AI SDK:** Vercel AI SDK 5.x
- **Storage:** Cloudflare KV + R2
- **Database:** Supabase (PostgreSQL)
- **Caching:** Smart Hybrid (60-70% hit rate)

## Security

- All API keys stored as Cloudflare secrets (not in code)
- JWT authentication via Supabase
- Rate limiting per user tier
- Input validation and sanitization
- Zero secrets committed to git

## Free Infrastructure

All services running on FREE tiers:
- ✅ Cloudflare Workers: 100K req/day
- ✅ Cloudflare KV: 1GB storage
- ✅ Cloudflare R2: 10GB storage
- ✅ Cloudflare AI Gateway: Unlimited
- ✅ Supabase: 500MB database

**Estimated Cost:** $0/month infrastructure + ~$5/month AI credits (with caching)

## Links

- [Cloudflare Dashboard](https://dash.cloudflare.com/914022281183abb7ca6a5590fec4b994)
- [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Architecture Documentation](../ARCHITECTURE.md)
- [Implementation Status](../IMPLEMENTATION_STATUS.md)
