# Cloudflare Workers Secrets Setup Guide

## Overview
This guide walks you through securely setting up all API keys and secrets for the FitAI Workers project.

**IMPORTANT:** Never commit secrets to git. All secrets are stored encrypted in Cloudflare.

---

## Prerequisites

1. ✅ Cloudflare account with Workers access
2. ✅ Wrangler CLI authenticated (`wrangler whoami`)
3. ✅ Workers project initialized (`wrangler.jsonc` configured)
4. ✅ API keys ready (see `.env.example` for list)

---

## Quick Start

### 1. Copy .env.example
```bash
cp .env.example .env
```

###2. Fill in `.env` with your actual API keys
**DO NOT commit .env to git!** (already in .gitignore)

### 3. Run the secrets setup script (below)

---

## Setting Secrets via Wrangler CLI

### Supabase Secrets
```bash
cd fitai-workers

# Supabase URL (can be a regular var, not sensitive)
# Already configured in wrangler.jsonc, but you can override:
wrangler secret put SUPABASE_URL
# When prompted, enter: https://YOUR_PROJECT_ID.supabase.co

# Supabase Service Role Key (SENSITIVE - server-side only)
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# When prompted, paste your service role key
```

**Where to find:**
- Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api
- Copy "service_role" key (NOT the anon key)

---

### Google Gemini API Keys (23 keys)
```bash
# For each key (1-23), run:
wrangler secret put GEMINI_API_KEY_1
wrangler secret put GEMINI_API_KEY_2
wrangler secret put GEMINI_API_KEY_3
# ... repeat for all 23 keys
```

**Batch script (saves time):**
```bash
# Create a file: setup-gemini-keys.sh
for i in {1..23}; do
  echo "Setting GEMINI_API_KEY_$i"
  echo "YOUR_KEY_HERE" | wrangler secret put GEMINI_API_KEY_$i
done
```

**Where to get:**
- Go to https://makersuite.google.com/app/apikey
- Create 23 API keys (for quota rotation)
- Or reuse existing keys from your current setup

---

### OpenAI API Key
```bash
wrangler secret put OPENAI_API_KEY
# Enter your OpenAI API key when prompted
```

**Where to get:**
- Go to https://platform.openai.com/api-keys
- Create new secret key

---

### Anthropic API Key
```bash
wrangler secret put ANTHROPIC_API_KEY
# Enter your Anthropic API key when prompted
```

**Where to get:**
- Go to https://console.anthropic.com/settings/keys
- Create new key

---

### Other AI Providers (Optional)

```bash
# Groq (fast inference)
wrangler secret put GROQ_API_KEY

# DeepSeek (cost-optimized)
wrangler secret put DEEPSEEK_API_KEY

# Mistral (multilingual)
wrangler secret put MISTRAL_API_KEY
```

---

### Media API Keys (Optional)

For exercise videos and diet images:

```bash
# Pexels (exercise videos)
wrangler secret put PEXELS_API_KEY

# Pixabay (exercise videos)
wrangler secret put PIXABAY_API_KEY

# Spoonacular (food data)
wrangler secret put SPOONACULAR_API_KEY

# Edamam (nutrition data)
wrangler secret put EDAMAM_API_KEY

# Unsplash (food images)
wrangler secret put UNSPLASH_API_KEY
```

---

## Automated Secrets Setup Script

Create `setup-secrets.sh`:

```bash
#!/bin/bash

echo "🔐 Setting up FitAI Workers secrets..."
echo "⚠️  You will be prompted for each secret value"
echo ""

# Supabase
echo "📦 Supabase Configuration"
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Gemini Keys
echo "🤖 Google Gemini API Keys (23 total)"
for i in {1..23}; do
  echo "  Setting GEMINI_API_KEY_$i ($i/23)"
  wrangler secret put GEMINI_API_KEY_$i
done

# Other AI Providers
echo "🧠 Other AI Providers"
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY

# Optional providers
read -p "Do you want to set up optional AI providers (Groq, DeepSeek, Mistral)? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  wrangler secret put GROQ_API_KEY
  wrangler secret put DEEPSEEK_API_KEY
  wrangler secret put MISTRAL_API_KEY
fi

# Media APIs
read -p "Do you want to set up media API keys (Pexels, Spoonacular, etc.)? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  wrangler secret put PEXELS_API_KEY
  wrangler secret put PIXABAY_API_KEY
  wrangler secret put SPOONACULAR_API_KEY
  wrangler secret put EDAMAM_API_KEY
  wrangler secret put UNSPLASH_API_KEY
fi

echo ""
echo "✅ Secrets setup complete!"
echo "🔍 Verify secrets: wrangler secret list"
```

Make executable and run:
```bash
chmod +x setup-secrets.sh
./setup-secrets.sh
```

---

## Verifying Secrets

### List all secrets
```bash
wrangler secret list
```

Output should show (without values):
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY_1
GEMINI_API_KEY_2
...
OPENAI_API_KEY
ANTHROPIC_API_KEY
```

### Delete a secret (if needed)
```bash
wrangler secret delete SECRET_NAME
```

---

## Security Best Practices

### ✅ DO
- Use `wrangler secret put` for all sensitive values
- Keep `.env.example` as a template (no real values)
- Add `.env` to `.gitignore`
- Rotate API keys regularly
- Use different keys for staging/production
- Monitor usage via provider dashboards

### ❌ DON'T
- Commit secrets to git (NEVER!)
- Share secrets via Slack/Discord
- Hardcode secrets in code
- Use production keys in development
- Reuse same key across projects

---

## Environment-Specific Secrets

For staging vs production:

```bash
# Production
wrangler secret put OPENAI_API_KEY --env production

# Staging
wrangler secret put OPENAI_API_KEY --env staging
```

Configure in `wrangler.jsonc`:
```jsonc
{
  "env": {
    "staging": {
      "name": "fitai-workers-staging"
    },
    "production": {
      "name": "fitai-workers"
    }
  }
}
```

---

## Troubleshooting

### "Secret not found" error
- Run `wrangler secret list` to verify secret exists
- Check secret name matches exactly (case-sensitive)
- Re-add secret: `wrangler secret put SECRET_NAME`

### "Unauthorized" error
- Run `wrangler whoami` to verify login
- Re-login: `wrangler logout && wrangler login`

### Secrets not loading in Worker
- Verify deployment: `wrangler deploy`
- Check logs: `wrangler tail`
- Ensure secrets are set before deploying

---

## Cost Tracking

With $5K Vercel AI SDK credits and smart hybrid caching (65% hit rate):

| Usage | AI Cost/Month | Credits Last |
|-------|---------------|--------------|
| 3,000 users | $5.46 | **76 years** |
| 10,000 users | $18.20 | **23 years** |
| 20,000 users | $36.40 | **11 years** |

**Tip:** Monitor costs via:
- Cloudflare AI Gateway dashboard
- `get_generation_costs()` SQL function
- Provider dashboards (OpenAI, Anthropic, etc.)

---

## Status Checklist

Before moving to Phase 1, verify:

- [ ] `.env.example` created ✓
- [ ] `.env` added to `.gitignore` ✓
- [ ] Supabase secrets set
- [ ] At least 1 Gemini API key set
- [ ] OpenAI key set (or primary AI provider)
- [ ] Secrets verified with `wrangler secret list`
- [ ] Test deployment successful

---

**Status:** Template ready, awaiting API keys
**Created:** 2025-11-14
**Security Level:** Maximum (all secrets encrypted by Cloudflare)
