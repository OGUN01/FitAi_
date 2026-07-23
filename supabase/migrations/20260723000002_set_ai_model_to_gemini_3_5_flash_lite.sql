-- ============================================================================
-- Switch app_config.ai_model from google/gemini-3.5-flash to the lite variant
-- google/gemini-3.5-flash-lite (verified working on Vercel AI Gateway, HTTP
-- 200; faster + ~6x cheaper). Affects chat / diet / workout generation which
-- all read ai_model via getAIConfig(). See CLAUDE.md rule 7 (append-only).
-- ============================================================================

UPDATE app_config
SET value = '"google/gemini-3.5-flash-lite"',
    description = 'Active AI model ID (Vercel AI Gateway, google/gemini-3.5-flash-lite)',
    updated_at = now()
WHERE key = 'ai_model';
