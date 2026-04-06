-- ============================================================================
-- CHAT MESSAGES TABLE + CONVERSATION SUMMARIES VIEW
-- ============================================================================
-- Migration: Create chat_messages table and conversation_summaries view
-- Created: 2026-04-06
-- Description: Persistent storage for AI chat conversations and a summary view
--              used by handleGetConversations in chatHandler.ts.
--
-- The table schema matches the insert shape in saveConversationMessages():
--   conversation_id, user_id, role, content, message_index,
--   tokens_used, model_used, generation_time_ms, cost_usd
--
-- The view aggregates per-conversation stats used by handleGetConversations():
--   conversation_id, user_id, title, message_count,
--   started_at, last_message_at, total_tokens, total_cost
-- ============================================================================

-- ============================================================================
-- TABLE: CHAT_MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id    UUID    NOT NULL,
  user_id            UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Message content
  role               TEXT    NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content            TEXT    NOT NULL,
  message_index      INTEGER NOT NULL,

  -- AI metadata (populated on assistant messages only)
  tokens_used        INTEGER,
  model_used         TEXT,
  generation_time_ms INTEGER,
  cost_usd           NUMERIC(12, 8),

  -- Timestamps
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique index so upsert ON CONFLICT (conversation_id, message_index) works
  CONSTRAINT chat_messages_conversation_index_unique UNIQUE (conversation_id, message_index)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, message_index);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user        ON chat_messages(user_id);

-- Trigger to keep updated_at current
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_chat_message_updated_at'
  ) THEN
    CREATE TRIGGER set_chat_message_updated_at
      BEFORE UPDATE ON chat_messages
      FOR EACH ROW EXECUTE FUNCTION public.update_chat_message_updated_at();
  END IF;
END;
$$;

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own chat_messages"
  ON chat_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- VIEW: CONVERSATION_SUMMARIES
-- ============================================================================
-- Aggregates chat_messages into one row per conversation.
-- Fields consumed by handleGetConversations():
--   conversation_id, user_id, title, message_count,
--   started_at, last_message_at, total_tokens, total_cost
--
-- "title" is derived from the first user message in the conversation
-- (truncated to 80 chars), matching the fallback logic in the handler:
--   title: conv.title || 'Untitled Conversation'
-- ============================================================================
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT
  cm.conversation_id,
  cm.user_id,

  -- Title: first user message text, truncated to 80 characters
  LEFT(
    (
      SELECT content
      FROM   chat_messages first_msg
      WHERE  first_msg.conversation_id = cm.conversation_id
        AND  first_msg.role = 'user'
      ORDER  BY first_msg.message_index ASC
      LIMIT  1
    ),
    80
  ) AS title,

  COUNT(*)::INTEGER                         AS message_count,
  MIN(cm.created_at)                        AS started_at,
  MAX(cm.created_at)                        AS last_message_at,
  COALESCE(SUM(cm.tokens_used), 0)::INTEGER AS total_tokens,
  COALESCE(SUM(cm.cost_usd),    0)          AS total_cost

FROM chat_messages cm
GROUP BY cm.conversation_id, cm.user_id;

-- RLS note: The view inherits the underlying table's RLS, so each user only
-- sees rows where auth.uid() = user_id.  The handler also adds an explicit
-- .eq('user_id', user.id) filter as a belt-and-suspenders guard.
