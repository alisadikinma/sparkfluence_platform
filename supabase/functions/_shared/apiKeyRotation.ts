/**
 * API Key Rotation Helper
 *
 * All API keys come from the `api_keys_pool` table in Supabase.
 * No environment secret fallback — single source of truth.
 *
 * Features:
 * - Automatic rotation across multiple keys per provider
 * - 429/402 → mark key as exhausted (daily cron resets)
 * - 403 leaked/compromised → permanently deactivate key
 * - Usage tracking per key
 *
 * Usage:
 * ```typescript
 * import { callGeminiHybrid, callTavilyHybrid } from '../_shared/apiKeyRotation.ts';
 *
 * const result = await callGeminiHybrid(supabase, messages, { model: 'gemini-2.0-flash' });
 * const search = await callTavilyHybrid(supabase, 'AI niche ideas');
 * ```
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Types
// ============================================================================

export interface ApiKeyResult {
  keyId: string;
  apiKey: string;
  keyName: string;
  usageCount: number;
  usageLimit: number;
  source: 'pool';
}

export interface ApiKeyStats {
  provider: string;
  totalKeys: number;
  activeKeys: number;
  exhaustedKeys: number;
  totalUsage: number;
  totalLimit: number;
  usagePercentage: number;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get API key from pool table
 */
export async function getApiKeyFromPool(
  supabase: SupabaseClient,
  provider: string
): Promise<ApiKeyResult | null> {
  try {
    const { data, error } = await supabase.rpc('get_available_api_key', {
      p_provider: provider
    });

    if (error) {
      console.error(`[ApiKeyRotation] Pool error for ${provider}:`, error.message);
      return null;
    }

    if (!data || data.length === 0) {
      console.log(`[ApiKeyRotation] No keys in pool for ${provider}`);
      return null;
    }

    const key = data[0];
    return {
      keyId: key.key_id,
      apiKey: key.api_key,
      keyName: key.key_name,
      usageCount: key.usage_count,
      usageLimit: key.usage_limit,
      source: 'pool'
    };
  } catch (err) {
    console.error(`[ApiKeyRotation] Exception getting ${provider} from pool:`, err);
    return null;
  }
}

/**
 * Get API key from pool (alias for getApiKeyFromPool)
 * All keys come from api_keys_pool table — no secret fallback.
 */
export async function getApiKeyHybrid(
  supabase: SupabaseClient,
  provider: string
): Promise<ApiKeyResult | null> {
  const poolKey = await getApiKeyFromPool(supabase, provider);
  if (poolKey) {
    console.log(`[ApiKeyRotation] Using ${provider} from pool: ${poolKey.keyName} (${poolKey.usageCount}/${poolKey.usageLimit})`);
    return poolKey;
  }

  console.error(`[ApiKeyRotation] No API key available for ${provider} (all pool keys exhausted or none configured)`);
  return null;
}

/**
 * Increment usage count for a pool key
 */
export async function incrementUsage(
  supabase: SupabaseClient,
  keyId: string | null,
  increment: number = 1
): Promise<boolean> {
  if (!keyId) {
    return true;
  }

  try {
    const { error } = await supabase.rpc('increment_api_key_usage', {
      p_key_id: keyId,
      p_increment: increment
    });

    if (error) {
      console.error(`[ApiKeyRotation] Error incrementing usage:`, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[ApiKeyRotation] Exception incrementing usage:`, err);
    return false;
  }
}

/**
 * Mark key as exhausted (daily cron resets these)
 */
export async function markExhausted(
  supabase: SupabaseClient,
  keyId: string | null
): Promise<boolean> {
  if (!keyId) {
    console.warn(`[ApiKeyRotation] No keyId provided for markExhausted`);
    return false;
  }

  try {
    const { error } = await supabase.rpc('mark_api_key_exhausted', {
      p_key_id: keyId
    });

    if (error) {
      console.error(`[ApiKeyRotation] Error marking exhausted:`, error);
      return false;
    }

    console.log(`[ApiKeyRotation] Key ${keyId} marked as exhausted`);
    return true;
  } catch (err) {
    console.error(`[ApiKeyRotation] Exception marking exhausted:`, err);
    return false;
  }
}

/**
 * Deactivate key permanently (e.g., leaked/revoked keys)
 * Sets is_active=false so it's never used again
 */
export async function deactivateKey(
  supabase: SupabaseClient,
  keyId: string | null
): Promise<boolean> {
  if (!keyId) {
    console.warn(`[ApiKeyRotation] No keyId provided for deactivateKey`);
    return false;
  }

  try {
    const { error } = await supabase
      .from('api_keys_pool')
      .update({ is_active: false, is_exhausted: true })
      .eq('id', keyId);

    if (error) {
      console.error(`[ApiKeyRotation] Error deactivating key:`, error);
      return false;
    }

    console.log(`[ApiKeyRotation] Key ${keyId} DEACTIVATED permanently (is_active=false)`);
    return true;
  } catch (err) {
    console.error(`[ApiKeyRotation] Exception deactivating key:`, err);
    return false;
  }
}

/**
 * Get usage statistics for providers
 */
export async function getStats(
  supabase: SupabaseClient,
  provider?: string
): Promise<ApiKeyStats[]> {
  try {
    const { data, error } = await supabase.rpc('get_api_keys_stats', {
      p_provider: provider || null
    });

    if (error) {
      console.error(`[ApiKeyRotation] Error getting stats:`, error);
      return [];
    }

    return (data || []).map((row: any) => ({
      provider: row.provider,
      totalKeys: row.total_keys,
      activeKeys: row.active_keys,
      exhaustedKeys: row.exhausted_keys,
      totalUsage: row.total_usage,
      totalLimit: row.total_limit,
      usagePercentage: row.usage_percentage
    }));
  } catch (err) {
    console.error(`[ApiKeyRotation] Exception getting stats:`, err);
    return [];
  }
}

// ============================================================================
// Call with Rotation
// ============================================================================

/**
 * Make API call with automatic key rotation from pool.
 * Rotates to next key on rate limit (429), payment required (402), or auth errors.
 */
export async function callWithRotationHybrid<T>(
  supabase: SupabaseClient,
  provider: string,
  apiCallFn: (apiKey: string) => Promise<{ data: T; status: number }>,
  maxRetries: number = 5
): Promise<{ data: T | null; error: string | null; keyUsed: string | null; source: 'pool' | null }> {
  let lastError = '';
  // Track keys temporarily exhausted due to 429 — we'll restore them at the end
  const rateLimitedKeyIds: string[] = [];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Get key from pool
    const keyResult = await getApiKeyFromPool(supabase, provider);

    if (!keyResult) {
      // No keys available — if we rate-limited some, wait and un-exhaust for one final attempt
      if (rateLimitedKeyIds.length > 0 && attempt < maxRetries - 1) {
        console.log(`[ApiKeyRotation] All ${provider} keys rate-limited — waiting 5s then restoring...`);
        await new Promise(r => setTimeout(r, 5000));
        for (const kid of rateLimitedKeyIds) {
          await supabase.from('api_keys_pool').update({ is_exhausted: false }).eq('id', kid);
        }
        rateLimitedKeyIds.length = 0;
        continue;
      }
      // Truly no keys — restore any we temporarily exhausted before returning
      for (const kid of rateLimitedKeyIds) {
        await supabase.from('api_keys_pool').update({ is_exhausted: false }).eq('id', kid);
      }
      return {
        data: null,
        error: `No API keys available for ${provider} (all pool keys exhausted or none configured)`,
        keyUsed: null,
        source: null
      };
    }

    console.log(`[ApiKeyRotation] Attempt ${attempt + 1}: Using ${keyResult.keyName} (source: ${keyResult.source})`);

    try {
      const result = await apiCallFn(keyResult.apiKey);

      // 429 = temporary rate limit → mark exhausted to rotate, but track for restoration
      if (result.status === 429) {
        console.warn(`[ApiKeyRotation] ${keyResult.keyName} hit RATE LIMIT (429) - rotating to next key`);
        if (keyResult.keyId) {
          await markExhausted(supabase, keyResult.keyId);
          rateLimitedKeyIds.push(keyResult.keyId);
        }
        lastError = `API rate limited (429)`;
        continue;
      }

      // 402 = quota/payment exhausted → mark exhausted permanently (daily reset)
      if (result.status === 402) {
        console.warn(`[ApiKeyRotation] ${keyResult.keyName} hit PAYMENT REQUIRED (402) - marking exhausted`);
        if (keyResult.keyId) {
          await markExhausted(supabase, keyResult.keyId);
        }
        lastError = `API payment required (402)`;
        continue;
      }

      // Check for auth errors (401/403)
      if (result.status === 401 || result.status === 403) {
        const errorMsg = (result.data as any)?.error?.message || '';
        console.warn(`[ApiKeyRotation] ${keyResult.keyName} returned AUTH ERROR (${result.status}): ${errorMsg}`);

        // 403 with "leaked" = permanently broken key → deactivate
        if (result.status === 403 && (errorMsg.toLowerCase().includes('leaked') || errorMsg.toLowerCase().includes('compromised'))) {
          console.warn(`[ApiKeyRotation] Key ${keyResult.keyName} reported as LEAKED - deactivating permanently`);
          if (keyResult.keyId) {
            await deactivateKey(supabase, keyResult.keyId);
          }
        }

        lastError = `API auth error (${result.status}): ${errorMsg}`;
        continue;
      }

      // Success - increment usage and restore any rate-limited keys
      if (keyResult.keyId) {
        await incrementUsage(supabase, keyResult.keyId);
      }
      // Restore rate-limited keys so they're available for future requests
      for (const kid of rateLimitedKeyIds) {
        await supabase.from('api_keys_pool').update({ is_exhausted: false }).eq('id', kid);
      }

      return {
        data: result.data,
        error: null,
        keyUsed: keyResult.keyName,
        source: keyResult.source
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error';

      // 429 / rate limit = temporary → mark exhausted to rotate, track for restoration
      if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
        console.warn(`[ApiKeyRotation] Rate limit error on ${keyResult.keyName} - rotating to next key`);
        if (keyResult.keyId) {
          await markExhausted(supabase, keyResult.keyId);
          rateLimitedKeyIds.push(keyResult.keyId);
        }
        lastError = errorMessage;
        continue;
      }

      // 402 / quota / payment = exhausted → mark exhausted permanently
      if (errorMessage.includes('402') || errorMessage.toLowerCase().includes('quota exceeded') || errorMessage.toLowerCase().includes('payment required')) {
        console.warn(`[ApiKeyRotation] Quota/payment error on ${keyResult.keyName} - marking exhausted`);
        if (keyResult.keyId) {
          await markExhausted(supabase, keyResult.keyId);
        }
        lastError = errorMessage;
        continue;
      }

      // Check if error indicates LEAKED key - deactivate permanently
      if (errorMessage.toLowerCase().includes('leaked') || errorMessage.toLowerCase().includes('compromised')) {
        console.warn(`[ApiKeyRotation] Leaked key error on ${keyResult.keyName} - deactivating permanently`);
        if (keyResult.keyId) {
          await deactivateKey(supabase, keyResult.keyId);
        }
        lastError = errorMessage;
        continue;
      }

      // Check if error is INVALID/EXPIRED key - skip, don't mark exhausted
      if (errorMessage.toLowerCase().includes('expired') ||
          errorMessage.toLowerCase().includes('invalid') ||
          errorMessage.toLowerCase().includes('api_key_invalid') ||
          errorMessage.includes('401') ||
          errorMessage.includes('403')) {
        console.warn(`[ApiKeyRotation] Invalid/expired key error on ${keyResult.keyName} - NOT marking exhausted`);
        lastError = errorMessage;
        continue;
      }

      // Other error - don't exhaust, report and stop
      console.error(`[ApiKeyRotation] Unexpected error on ${keyResult.keyName}: ${errorMessage}`);
      lastError = errorMessage;
      break;
    }
  }

  // Restore any rate-limited keys before returning failure
  for (const kid of rateLimitedKeyIds) {
    await supabase.from('api_keys_pool').update({ is_exhausted: false }).eq('id', kid);
  }

  return {
    data: null,
    error: lastError || 'All keys exhausted',
    keyUsed: null,
    source: null
  };
}

// ============================================================================
// Provider-specific Helpers
// ============================================================================

/**
 * Call Tavily Search API (pool-based key rotation)
 */
export async function callTavilyHybrid(
  supabase: SupabaseClient,
  query: string,
  options: {
    searchDepth?: 'basic' | 'advanced';
    maxResults?: number;
    includeAnswer?: boolean;
  } = {}
): Promise<{ data: any; error: string | null; source: 'pool' | null }> {
  const result = await callWithRotationHybrid(supabase, 'tavily', async (apiKey) => {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: options.searchDepth || 'basic',
        max_results: options.maxResults || 10,
        include_answer: options.includeAnswer ?? true,
        include_raw_content: false,
        include_images: false
      })
    });

    const data = await response.json();
    return { data, status: response.status };
  });

  return {
    data: result.data,
    error: result.error,
    source: result.source
  };
}

/**
 * Call OpenRouter Chat API (pool-based key rotation)
 */
export async function callOpenRouterHybrid(
  supabase: SupabaseClient,
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<{ data: any; error: string | null; tokensUsed?: number; source: 'pool' | null }> {
  const result = await callWithRotationHybrid(supabase, 'openrouter', async (apiKey) => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://sparkfluence.com',
        'X-Title': 'Sparkfluence'
      },
      body: JSON.stringify({
        model: options.model || 'google/gemini-2.5-flash-lite',
        messages,
        temperature: options.temperature ?? 0.8,
        max_tokens: options.maxTokens || 2048
      })
    });

    const data = await response.json();
    return { data, status: response.status };
  });

  const tokensUsed = result.data?.usage?.total_tokens;

  return {
    data: result.data,
    error: result.error,
    tokensUsed,
    source: result.source
  };
}

/**
 * Call Gemini API (pool-based key rotation)
 * Primary for script generation - FAST!
 */
export async function callGeminiHybrid(
  supabase: SupabaseClient,
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<{ success: boolean; content: string | null; error: string | null; source: 'pool' | null }> {
  const model = options.model || 'gemini-2.0-flash';

  // Combine messages into single prompt for Gemini
  const systemMsg = messages.find(m => m.role === 'system')?.content || '';
  const userMsg = messages.find(m => m.role === 'user')?.content || '';
  const combinedPrompt = systemMsg ? `${systemMsg}\n\n${userMsg}` : userMsg;

  const result = await callWithRotationHybrid(supabase, 'gemini', async (apiKey) => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: combinedPrompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens || 4096
          }
        })
      }
    );

    const data = await response.json();
    return { data, status: response.status };
  });

  // Extract content from Gemini response
  const candidate = result.data?.candidates?.[0];
  const content = candidate?.content?.parts?.[0]?.text || null;
  const finishReason = candidate?.finishReason || null;

  // Check for errors in response
  if (result.data?.error) {
    return {
      success: false,
      content: null,
      error: result.data.error.message || 'Gemini API error',
      source: result.source,
      finishReason
    };
  }

  // Detect truncation — finishReason should be 'STOP' for complete responses
  if (finishReason && finishReason !== 'STOP') {
    console.warn(`[Gemini] Response truncated: finishReason=${finishReason}`)
  }

  return {
    success: !!content,
    content,
    error: result.error || (content ? null : 'No content in response'),
    source: result.source,
    finishReason
  };
}

// ============================================================================
// Legacy exports (for backward compatibility)
// ============================================================================

// These use pool-only mode (original behavior)
export const getApiKey = getApiKeyFromPool;
export const callTavily = callTavilyHybrid;
export const callOpenRouter = callOpenRouterHybrid;
export const callGemini = callGeminiHybrid;
export const callWithRotation = callWithRotationHybrid;
