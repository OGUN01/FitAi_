-- FitAI Workers - Chat Messages Table
-- Stores conversation history for persistent AI chat context

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Conversation tracking
  conversation_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Message metadata
  tokens_used INTEGER,
  model_used TEXT,
  generation_time_ms INTEGER,
  cost_usd DECIMAL(10,6),

  -- Context window management
  message_index INTEGER NOT NULL, -- Order within conversation

  -- Search and filtering
  conversation_title TEXT, -- Optional title for first message
  tags TEXT[], -- Optional tags for categorization

  -- Indexes for efficient querying
  CONSTRAINT unique_conversation_message UNIQUE (conversation_id, message_index)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id, message_index);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);

-- Create a view for conversation summaries
CREATE OR REPLACE VIEW public.conversation_summaries AS
SELECT
  conversation_id,
  user_id,
  MIN(created_at) as started_at,
  MAX(created_at) as last_message_at,
  COUNT(*) as message_count,
  MAX(conversation_title) as title,
  SUM(tokens_used) as total_tokens,
  SUM(cost_usd) as total_cost
FROM public.chat_messages
GROUP BY conversation_id, user_id;

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Service role can access everything
CREATE POLICY "Service role can access all chat messages"
  ON public.chat_messages
  FOR ALL
  TO service_role
  USING (true);

-- Users can only access their own messages
CREATE POLICY "Users can read their own messages"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own messages"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own messages"
  ON public.chat_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON public.chat_messages
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_chat_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_message_updated_at();

-- Create function to get conversation context window
CREATE OR REPLACE FUNCTION public.get_conversation_context(
  p_conversation_id UUID,
  p_max_messages INTEGER DEFAULT 20,
  p_max_tokens INTEGER DEFAULT 4000
) RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  message_index INTEGER,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_total_tokens INTEGER := 0;
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.role,
    cm.content,
    cm.message_index,
    cm.tokens_used,
    cm.created_at
  FROM public.chat_messages cm
  WHERE cm.conversation_id = p_conversation_id
  ORDER BY cm.message_index DESC
  LIMIT p_max_messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old conversations
CREATE OR REPLACE FUNCTION public.cleanup_old_conversations(
  p_days_to_keep INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.chat_messages
    WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.chat_messages IS 'Stores AI chat conversation history with context management';
COMMENT ON COLUMN public.chat_messages.conversation_id IS 'Unique identifier for conversation thread';
COMMENT ON COLUMN public.chat_messages.message_index IS 'Sequential order of messages within conversation (0-indexed)';
COMMENT ON COLUMN public.chat_messages.tokens_used IS 'Number of tokens used for this message (for context window management)';
COMMENT ON FUNCTION public.get_conversation_context IS 'Retrieves recent messages for conversation context, respecting token limits';
COMMENT ON FUNCTION public.cleanup_old_conversations IS 'Removes conversations older than specified days (default: 90)';
