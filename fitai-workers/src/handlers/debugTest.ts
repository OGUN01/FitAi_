/**
 * Debug Test Handler
 * Tests if Supabase credentials are loaded
 */

import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { Env } from '../utils/types';

export async function handleDebugTest(
  c: Context<{ Bindings: Env }>
): Promise<Response> {
  try {
    const supabaseUrlSet = !!c.env.SUPABASE_URL;
    const supabaseKeySet = !!c.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('[Debug] SUPABASE_URL set:', supabaseUrlSet);
    console.log('[Debug] SUPABASE_SERVICE_ROLE_KEY set:', supabaseKeySet);

    if (!supabaseUrlSet || !supabaseKeySet) {
      return c.json({
        success: false,
        error: 'Supabase credentials not configured',
        debug: {
          supabaseUrlSet,
          supabaseKeySet,
        },
      });
    }

    // Try to create client and insert
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    const testLog = {
      endpoint: '/debug/test',
      method: 'GET',
      status_code: 200,
      response_time_ms: 0,
      user_agent: 'Debug Test',
      ip_address: '127.0.0.1',
      request_id: 'debug-' + crypto.randomUUID(),
    };

    console.log('[Debug] Attempting Supabase insert...');
    const { data, error } = await supabase
      .from('api_logs')
      .insert([testLog])
      .select();

    if (error) {
      console.error('[Debug] Insert error:', JSON.stringify(error, null, 2));
      return c.json({
        success: false,
        error: 'Supabase insert failed',
        details: error,
      });
    }

    console.log('[Debug] Insert successful:', data);
    return c.json({
      success: true,
      message: 'Successfully inserted test log to Supabase',
      data: data,
    });

  } catch (error) {
    console.error('[Debug] Exception:', error);
    return c.json({
      success: false,
      error: 'Exception occurred',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
