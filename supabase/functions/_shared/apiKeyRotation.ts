/**
 * API Key Rotation Helper (Hybrid Mode)
 * 
 * Supports both:
 * 1. Pool Table (api_keys_pool) - for rotation across multiple accounts
 * 2. Environment Secrets - as fallback when pool is empty/exhausted
 * 
 * Flow:
 * 1. Try to get key from pool table
 * 2. If pool empty/exhausted → fallback to Deno.env secret
 * 3. If secret also missing → return error
 * 
 * Usage:
 * ```typescript
 * import { getApiKeyHybrid, callTavilyHybrid } from '../_shared/apiKeyRotation.ts';
 * 
 * // Auto-handles pool → secrets fallback
 * const result = await callTavilyHybrid(supabase, 'AI niche ideas');
 * ```
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Types
// ============================================================================

export interface ApiKeyResult {
  keyId: string | null;      // null if from secrets
  apiKey: string;
  keyName: string;
  usageCount: number;
  usageLimit: number;
  source: 'pool' | 'secret'; // Track where key came from
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
// Secret name mapping for fallback
// ============================================================================

const SECRET_NAMES: Record<string, string> = {
  'tavily': 'TAVILY_API_KEY',
  'openrouter': 'OPENROUTER_API_KEY',
  'huggingface': 'HUGGINGFACE_API_KEY',
  'gemini': 'GEMINI_API_KEY',
  'openai': 'OPENAI_API_KEY',
  'pexels': 'PEXELS_API_KEY',
  'veo': 'VEO_API_KEY',
};

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
 * Get API key from environment secrets (fallback)
 */
export function getApiKeyFromSecret(provider: string): ApiKeyResult | null {
  const secretName = SECRET_NAMES[provider];
  if (!secretName) {
    console.warn(`[ApiKeyRotation] No secret name mapping for ${provider}`);
    return null;
  }

  const apiKey = Deno.env.get(secretName);
  if (!apiKey) {
    console.warn(`[ApiKeyRotation] Secret ${secretName} not found`);
    return null;
  }

  console.log(`[ApiKeyRotation] Using ${provider} from secrets (${secretName})`);
  return {
    keyId: null,
    apiKey,
    keyName: `Secret (${secretName})`,
    usageCount: 0,
    usageLimit: 999999, // Unknown limit for secrets
    source: 'secret'
  };
}

/**
 * Get API key with hybrid approach: Pool first, then Secrets fallback
 */
export async function getApiKeyHybrid(
  supabase: SupabaseClient,
  provider: string
): Promise<ApiKeyResult | null> {
  // 1. Try pool first
  const poolKey = await getApiKeyFromPool(supabase, provider);
  if (poolKey) {
    console.log(`[ApiKeyRotation] Using ${provider} from pool: ${poolKey.keyName} (${poolKey.usageCount}/${poolKey.usageLimit})`);
    return poolKey;
  }

  // 2. Fallback to secrets
  const secretKey = getApiKeyFromSecret(provider);
  if (secretKey) {
    return secretKey;
  }

  // 3. No key available
  console.error(`[ApiKeyRotation] No API key available for ${provider} (pool empty, secret missing)`);
  return null;
}

/**
 * Increment usage count (only for pool keys)
 */
export async function incrementUsage(
  supabase: SupabaseClient,
  keyId: string | null,
  increment: number = 1
): Promise<boolean> {
  // Skip if key is from secrets (no tracking)
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
 * Mark key as exhausted (only for pool keys)
 */
export async function markExhausted(
  supabase: SupabaseClient,
  keyId: string | null
): Promise<boolean> {
  // Skip if key is from secrets
  if (!keyId) {
    console.warn(`[ApiKeyRotation] Cannot mark secret as exhausted`);
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
// Call with Rotation (Hybrid)
// ============================================================================

/**
 * Make API call with automatic rotation
 * - Tries pool keys first (with rotation on rate limit)
 * - Falls back to secrets if all pool keys exhausted
 */
export async function callWithRotationHybrid<T>(
  supabase: SupabaseClient,
  provider: string,
  apiCallFn: (apiKey: string) => Promise<{ data: T; status: number }>,
  maxRetries: number = 5
): Promise<{ data: T | null; error: string | null; keyUsed: string | null; source: 'pool' | 'secret' | null }> {
  let lastError = '';
  let triedSecretFallback = false;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Get key (hybrid: pool first, then secret)
    let keyResult: ApiKeyResult | null;
    
    if (!triedSecretFallback) {
      // Try pool first
      keyResult = await getApiKeyFromPool(supabase, provider);
      
      // If pool empty, switch to secret fallback
      if (!keyResult) {
        keyResult = getApiKeyFromSecret(provider);
        triedSecretFallback = true;
      }
    } else {
      // Already tried secret, no more options
      break;
    }
    
    if (!keyResult) {
      return {
        data: null,
        error: `No API keys available for ${provider}`,
        keyUsed: null,
        source: null
      };
    }

    console.log(`[ApiKeyRotation] Attempt ${attempt + 1}: Using ${keyResult.keyName} (source: ${keyResult.source})`);

    try {
      const result = await apiCallFn(keyResult.apiKey);
      
      // Check for rate limit (429) - ONLY THIS should mark as exhausted
      if (result.status === 429) {
        console.warn(`[ApiKeyRotation] ${keyResult.keyName} hit RATE LIMIT (429) - marking exhausted`);
        
        if (keyResult.source === 'pool' && keyResult.keyId) {
          await markExhausted(supabase, keyResult.keyId);
        } else {
          triedSecretFallback = true;
        }
        
        lastError = `API rate limited (429)`;
        continue;
      }
      
      // Check for auth errors (401/403) - DON'T mark exhausted, just skip to next key
      // These are invalid/expired keys, not rate limits
      if (result.status === 401 || result.status === 403) {
        console.warn(`[ApiKeyRotation] ${keyResult.keyName} returned AUTH ERROR (${result.status}) - skipping, NOT marking exhausted`);
        
        // Check if error message indicates expired/invalid key
        const errorMsg = result.data?.error?.message || '';
        console.warn(`[ApiKeyRotation] Error message: ${errorMsg}`);
        
        // For secrets, no more fallback
        if (keyResult.source === 'secret') {
          triedSecretFallback = true;
        }
        
        lastError = `API auth error (${result.status}): ${errorMsg}`;
        continue;
      }

      // Success - increment usage (only for pool keys)
      if (keyResult.source === 'pool' && keyResult.keyId) {
        await incrementUsage(supabase, keyResult.keyId);
      }
      
      return {
        data: result.data,
        error: null,
        keyUsed: keyResult.keyName,
        source: keyResult.source
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error';
      
      // Check if error is RATE LIMIT related - ONLY THEN mark exhausted
      if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('quota exceeded')) {
        console.warn(`[ApiKeyRotation] Rate limit error on ${keyResult.keyName} - marking exhausted`);
        
        if (keyResult.source === 'pool' && keyResult.keyId) {
          await markExhausted(supabase, keyResult.keyId);
        } else {
          triedSecretFallback = true;
        }
        
        lastError = errorMessage;
        continue;
      }
      
      // Check if error is INVALID/EXPIRED key - DON'T mark exhausted
      if (errorMessage.toLowerCase().includes('expired') || 
          errorMessage.toLowerCase().includes('invalid') ||
          errorMessage.toLowerCase().includes('api_key_invalid') ||
          errorMessage.includes('401') || 
          errorMessage.includes('403')) {
        console.warn(`[ApiKeyRotation] Invalid/expired key error on ${keyResult.keyName} - NOT marking exhausted`);
        
        if (keyResult.source === 'secret') {
          triedSecretFallback = true;
        }
        
        lastError = errorMessage;
        continue;
      }
      
      // Other error - don't exhaust, report and stop
      console.error(`[ApiKeyRotation] Unexpected error on ${keyResult.keyName}: ${errorMessage}`);
      lastError = errorMessage;
      break;
    }
  }

  return {
    data: null,
    error: lastError || 'All keys exhausted',
    keyUsed: null,
    source: null
  };
}

// ============================================================================
// Provider-specific Helpers (Hybrid Mode)
// ============================================================================

/**
 * Call Tavily Search API (hybrid: pool → secrets)
 */
export async function callTavilyHybrid(
  supabase: SupabaseClient,
  query: string,
  options: {
    searchDepth?: 'basic' | 'advanced';
    maxResults?: number;
    includeAnswer?: boolean;
  } = {}
): Promise<{ data: any; error: string | null; source: 'pool' | 'secret' | null }> {
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
 * Call OpenRouter Chat API (hybrid: pool → secrets)
 */
export async function callOpenRouterHybrid(
  supabase: SupabaseClient,
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<{ data: any; error: string | null; tokensUsed?: number; source: 'pool' | 'secret' | null }> {
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
        model: options.model || 'meta-llama/llama-3.3-70b-instruct:free',
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
 * Call Gemini API (hybrid: pool → secrets)
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
): Promise<{ success: boolean; content: string | null; error: string | null; source: 'pool' | 'secret' | null }> {
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
  const content = result.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  
  // Check for errors in response
  if (result.data?.error) {
    return {
      success: false,
      content: null,
      error: result.data.error.message || 'Gemini API error',
      source: result.source
    };
  }

  return {
    success: !!content,
    content,
    error: result.error || (content ? null : 'No content in response'),
    source: result.source
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
