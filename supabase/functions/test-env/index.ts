import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callLLM, getStats } from '../_shared/apiKeyRotation.ts'
import { handleCors, getCorsHeaders, errorResponse } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Auth check — require authenticated user
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  // Block in production — this endpoint exposes internal diagnostics
  const isProduction = (Deno.env.get('ENVIRONMENT') || '').toLowerCase() === 'production';
  if (isProduction) {
    return errorResponse(
      'FORBIDDEN',
      'test-env endpoint is disabled in production',
      403,
      req
    );
  }

  const results: any = {
    step1_env: {},
    step2_pool_stats: null,
    step3_gemini_pool_test: null,
    errors: [] as string[]
  }

  // Step 1: Check required env vars (only infra secrets, not API keys)
  results.step1_env = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? '✅ SET' : '❌ NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? '✅ SET' : '❌ NOT SET',
    FAL_AI_API_KEY: Deno.env.get('FAL_AI_API_KEY') ? '✅ SET' : '❌ NOT SET',
    GROQ_API_KEY: Deno.env.get('GROQ_API_KEY') ? '✅ SET' : '❌ NOT SET',
    // These should NO LONGER be set (migrated to pool):
    GEMINI_API_KEY_deprecated: Deno.env.get('GEMINI_API_KEY') ? '⚠️ STILL SET (should remove)' : '✅ REMOVED',
    OPENROUTER_API_KEY_deprecated: Deno.env.get('OPENROUTER_API_KEY') ? '⚠️ STILL SET (should remove)' : '✅ REMOVED',
  }

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    results.errors.push('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
    return new Response(
      JSON.stringify(results, null, 2),
      { headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Step 2: Check api_keys_pool stats
  try {
    const stats = await getStats(supabase)
    results.step2_pool_stats = stats.length > 0
      ? stats.map(s => `${s.provider}: ${s.activeKeys}/${s.totalKeys} active, ${s.exhaustedKeys} exhausted, usage ${s.usagePercentage}%`)
      : '❌ No keys in pool'
  } catch (e: any) {
    results.step2_pool_stats = '❌ Error checking pool'
    results.errors.push(e.message)
  }

  // Step 3: Test LLM (Gemini-first mode)
  try {
    const llmResult = await callLLM(supabase, [
      { role: 'user', content: 'Say "Hello" in one word.' }
    ], { geminiFirst: true, maxTokens: 10 })

    if (llmResult.success) {
      results.step3_gemini_pool_test = `✅ LLM works (provider: ${llmResult.provider}): ${llmResult.content}`
    } else {
      results.step3_gemini_pool_test = `❌ LLM error: ${llmResult.error}`
    }
  } catch (e: any) {
    results.step3_gemini_pool_test = '❌ LLM test failed'
    results.errors.push(e.message)
  }

  return new Response(
    JSON.stringify(results, null, 2),
    { headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
  )
})
