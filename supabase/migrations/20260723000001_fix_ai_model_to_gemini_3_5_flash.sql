-- ============================================================================
-- Fix: update app_config.ai_model from deprecated google/gemini-2.0-flash-exp
-- (HTTP 404 "Model not found" on Vercel AI Gateway) to google/gemini-3.5-flash
-- (verified working, HTTP 200). Affects chat / diet / workout generation which
-- all read ai_model via getAIConfig(). See CLAUDE.md rule 7 (append-only).
-- ============================================================================

UPDATE app_config
SET value = '"google/gemini-3.5-flash"',
    description = 'Active AI model ID (Vercel AI Gateway, google/gemini-3.5-flash)',
    updated_at = now()
WHERE key = 'ai_model';
