/**
 * FitAI Workers - AI Chat Handler
 *
 * Provides conversational AI coaching using:
 * - Vercel AI SDK with streaming support
 * - Conversation history management
 * - Context-aware responses (workouts, diet, user profile)
 */

import { Context } from 'hono';
import { streamText, generateText, createGateway } from 'ai';
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import {
  ChatRequest,
  ChatRequestSchema,
  ChatResponse,
  validateRequest,
} from '../utils/validation';
import { ValidationError, APIError } from '../utils/errors';
import { getSupabaseClient } from '../utils/supabase';

// ============================================================================
// AI PROVIDER CONFIGURATION
// ============================================================================

/**
 * Initialize Vercel AI SDK with Vercel AI Gateway
 * Creates gateway instance with explicit API key (Cloudflare Workers don't have process.env)
 * Model format: provider/model (e.g., 'google/gemini-2.5-flash', 'openai/gpt-4-turbo-preview')
 */
function createAIProvider(env: Env, modelId: string) {
  // Create gateway instance with explicit API key for Cloudflare Workers
  const gatewayInstance = createGateway({
    apiKey: env.AI_GATEWAY_API_KEY,
  });

  // Return model from gateway
  const model = modelId || 'google/gemini-2.5-flash';
  return gatewayInstance(model);
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

/**
 * Build system prompt for FitAI coach
 */
function buildSystemPrompt(request: ChatRequest): string {
  const contextInfo: string[] = [];

  // Add user profile context
  if (request.context?.userProfile) {
    const profile = request.context.userProfile;
    contextInfo.push(`**User Profile:**`);
    contextInfo.push(`- Age: ${profile.age} years`);
    contextInfo.push(`- Gender: ${profile.gender}`);
    contextInfo.push(`- Experience Level: ${profile.experienceLevel}`);
    contextInfo.push(`- Fitness Goal: ${profile.fitnessGoal}`);
    if (profile.height) contextInfo.push(`- Height: ${profile.height} cm`);
    if (profile.weight) contextInfo.push(`- Weight: ${profile.weight} kg`);
    if (profile.availableEquipment) contextInfo.push(`- Available Equipment: ${profile.availableEquipment.join(', ')}`);
  }

  // Add current workout context
  if (request.context?.currentWorkout) {
    const workout = request.context.currentWorkout;
    contextInfo.push(`\n**Current Workout Plan:**`);
    contextInfo.push(`- Title: ${workout.title || 'N/A'}`);
    contextInfo.push(`- Difficulty: ${workout.difficulty || 'N/A'}`);
    contextInfo.push(`- Duration: ${workout.duration || 'N/A'} minutes`);
  }

  // Add current diet context
  if (request.context?.currentDiet) {
    const diet = request.context.currentDiet;
    contextInfo.push(`\n**Current Diet Plan:**`);
    contextInfo.push(`- Total Calories: ${diet.totalCalories || 'N/A'} kcal`);
    contextInfo.push(`- Meals per day: ${diet.meals?.length || 'N/A'}`);
  }

  const contextSection =
    contextInfo.length > 0
      ? `\n\n${contextInfo.join('\n')}\n\nUse this context to provide personalized advice.`
      : '';

  return `You are FitAI, an expert AI fitness coach and nutritionist. Your role is to:

**Core Responsibilities:**
1. Provide personalized fitness and nutrition advice
2. Answer questions about workouts, exercises, and training techniques
3. Explain proper form and technique for exercises
4. Give guidance on nutrition, macros, and meal planning
5. Motivate and encourage users in their fitness journey
6. Adapt advice based on user's fitness level and goals

**Communication Style:**
- Be friendly, supportive, and motivating
- Use clear, concise language
- Back up advice with scientific principles when relevant
- Be honest about limitations (e.g., "consult a doctor for medical advice")
- Ask clarifying questions when needed

**Important Guidelines:**
- NEVER provide medical advice or diagnose conditions
- NEVER recommend supplements without disclaimers
- ALWAYS encourage proper form over heavy weights
- ALWAYS emphasize safety and injury prevention
- If unsure, recommend consulting a certified professional

**Safety First:**
- Recommend warm-ups before workouts
- Suggest rest days for recovery
- Warn against overtraining
- Encourage listening to one's body${contextSection}`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * POST /chat/ai - AI conversational coaching
 * Supports both streaming and non-streaming responses
 */
export async function handleChat(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>
): Promise<Response> {
  const startTime = Date.now();

  try {
    // 1. Validate request
    const rawBody = await c.req.json();
    const request: ChatRequest = validateRequest(ChatRequestSchema, rawBody);

    // Get user from auth context (if authenticated)
    const user = c.get('user');
    const conversationId = request.conversationId || crypto.randomUUID();

    console.log('[Chat] Request validated:', {
      messageCount: request.messages.length,
      hasContext: !!request.context,
      stream: request.stream,
      model: request.model,
      conversationId,
      authenticated: !!user,
    });

    // 2. Build system prompt with context
    const systemPrompt = buildSystemPrompt(request);

    // 3. Prepare messages array (system + conversation history)
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...request.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
    ];

    // 4. Get AI model
    const model = createAIProvider(c.env, request.model);

    // 5. Handle streaming vs non-streaming
    if (request.stream) {
      console.log('[Chat] Starting streaming response');

      // Stream response using AI SDK
      const result = streamText({
        model,
        messages,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });

      // Return SSE stream
      return result.toDataStreamResponse({
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      console.log('[Chat] Generating non-streaming response');

      // Generate complete response
      const result = await generateText({
        model,
        messages,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });

      const totalTime = Date.now() - startTime;

      console.log('[Chat] Response generated:', {
        generationTime: totalTime + 'ms',
        tokensUsed: result.usage?.totalTokens,
        finishReason: result.finishReason,
      });

      // Save conversation to database (if user is authenticated)
      if (user) {
        try {
          await saveConversationMessages(
            c.env,
            conversationId,
            user.id,
            request.messages[request.messages.length - 1], // Last user message
            {
              role: 'assistant',
              content: result.text,
            },
            {
              model: request.model,
              tokensUsed: result.usage?.totalTokens || 0,
              generationTimeMs: totalTime,
              costUsd: calculateCost(request.model, result.usage?.totalTokens || 0),
            }
          );
          console.log('[Chat] Conversation saved to database');
        } catch (saveError) {
          console.error('[Chat] Failed to save conversation:', saveError);
          // Don't fail the request if saving fails
        }
      }

      // Return JSON response
      const response: ChatResponse = {
        message: result.text,
        tokensUsed: result.usage?.totalTokens,
        finishReason: result.finishReason as any,
        conversationId, // Include conversation ID in response
      };

      return c.json(
        {
          success: true,
          data: response,
          metadata: {
            model: request.model,
            generationTime: totalTime,
            tokensUsed: result.usage?.totalTokens,
            costUsd: calculateCost(request.model, result.usage?.totalTokens || 0),
          },
        },
        200
      );
    }
  } catch (error) {
    console.error('[Chat] Error:', error);

    if (error instanceof ValidationError || error instanceof APIError) {
      throw error;
    }

    throw new APIError(
      'Failed to process chat request. Please try again.',
      500,
      'CHAT_FAILED' as any,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate approximate API cost based on model and token usage
 * Prices as of Jan 2025 (subject to change)
 */
function calculateCost(modelId: string, tokens: number): number {
  const costPer1kTokens: Record<string, number> = {
    'google/gemini-2.5-flash': 0.0001, // $0.10 per 1M tokens
    'google/gemini-1.5-pro': 0.002, // $2.00 per 1M tokens
    'openai/gpt-4': 0.03, // $30 per 1M tokens
    'openai/gpt-4-turbo-preview': 0.01, // $10 per 1M tokens
    'openai/gpt-3.5-turbo': 0.0015, // $1.50 per 1M tokens
  };

  const costRate = costPer1kTokens[modelId] || 0.001; // Default $1 per 1M tokens
  return (tokens / 1000) * costRate;
}

/**
 * Save conversation messages to database
 */
async function saveConversationMessages(
  env: Env,
  conversationId: string,
  userId: string,
  userMessage: { role: string; content: string },
  assistantMessage: { role: string; content: string },
  metadata: {
    model: string;
    tokensUsed: number;
    generationTimeMs: number;
    costUsd: number;
  }
): Promise<void> {
  const supabase = getSupabaseClient(env);

  // Get current message count for this conversation
  const { data: existingMessages, error: countError } = await supabase
    .from('chat_messages')
    .select('message_index')
    .eq('conversation_id', conversationId)
    .order('message_index', { ascending: false })
    .limit(1);

  if (countError && countError.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    throw countError;
  }

  const nextIndex = existingMessages && existingMessages.length > 0
    ? existingMessages[0].message_index + 1
    : 0;

  // Save both messages
  const messages = [
    {
      conversation_id: conversationId,
      user_id: userId,
      role: userMessage.role,
      content: userMessage.content,
      message_index: nextIndex,
      tokens_used: null,
      model_used: null,
      generation_time_ms: null,
      cost_usd: null,
    },
    {
      conversation_id: conversationId,
      user_id: userId,
      role: assistantMessage.role,
      content: assistantMessage.content,
      message_index: nextIndex + 1,
      tokens_used: metadata.tokensUsed,
      model_used: metadata.model,
      generation_time_ms: metadata.generationTimeMs,
      cost_usd: metadata.costUsd,
    },
  ];

  const { error } = await supabase.from('chat_messages').insert(messages);

  if (error) {
    throw error;
  }
}

/**
 * Get conversation history
 */
export async function handleGetConversationHistory(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>
): Promise<Response> {
  try {
    const conversationId = c.req.param('conversationId');
    const user = c.get('user');

    if (!user) {
      throw new APIError('Authentication required', 401, 'UNAUTHORIZED' as any);
    }

    console.log('[Chat] Fetching conversation history:', conversationId);

    const supabase = getSupabaseClient(c.env);

    // Get messages for this conversation
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .order('message_index', { ascending: true });

    if (error) {
      throw new APIError(
        'Failed to fetch conversation history',
        500,
        'FETCH_FAILED' as any,
        { error }
      );
    }

    return c.json(
      {
        success: true,
        data: {
          conversationId,
          messageCount: messages?.length || 0,
          messages:
            messages?.map((msg) => ({
              role: msg.role,
              content: msg.content,
              createdAt: msg.created_at,
              tokensUsed: msg.tokens_used,
              modelUsed: msg.model_used,
            })) || [],
        },
      },
      200
    );
  } catch (error) {
    console.error('[Chat] Error fetching history:', error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(
      'Failed to fetch conversation history',
      500,
      'FETCH_FAILED' as any,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Get user's conversation list
 */
export async function handleGetConversations(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>
): Promise<Response> {
  try {
    const user = c.get('user');

    if (!user) {
      throw new APIError('Authentication required', 401, 'UNAUTHORIZED' as any);
    }

    console.log('[Chat] Fetching user conversations');

    const supabase = getSupabaseClient(c.env);

    // Get conversation summaries from the view
    const { data: conversations, error } = await supabase
      .from('conversation_summaries')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new APIError(
        'Failed to fetch conversations',
        500,
        'FETCH_FAILED' as any,
        { error }
      );
    }

    return c.json(
      {
        success: true,
        data: {
          conversations:
            conversations?.map((conv) => ({
              conversationId: conv.conversation_id,
              title: conv.title || 'Untitled Conversation',
              messageCount: conv.message_count,
              startedAt: conv.started_at,
              lastMessageAt: conv.last_message_at,
              totalTokens: conv.total_tokens,
              totalCost: conv.total_cost,
            })) || [],
        },
      },
      200
    );
  } catch (error) {
    console.error('[Chat] Error fetching conversations:', error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(
      'Failed to fetch conversations',
      500,
      'FETCH_FAILED' as any,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}
