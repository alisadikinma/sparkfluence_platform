import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const results = {
    step1_env: {},
    step2_openrouter: null,
    step3_gemini_embedding: null,
    errors: []
  }

  // Step 1: Check env vars
  results.step1_env = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? '✅ SET' : '❌ NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? '✅ SET' : '❌ NOT SET',
    GEMINI_API_KEY: Deno.env.get('GEMINI_API_KEY') ? '✅ SET' : '❌ NOT SET',
    OPENROUTER_API_KEY: Deno.env.get('OPENROUTER_API_KEY') ? '✅ SET' : '❌ NOT SET',
  }

  // Step 2: Test OpenRouter API
  const openrouterKey = Deno.env.get('OPENROUTER_API_KEY')
  if (openrouterKey) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'https://sparkfluence.com',
          'X-Title': 'Sparkfluence'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'user', content: 'Say "Hello"' }],
          max_tokens: 10
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        results.step2_openrouter = '✅ OpenRouter works: ' + data.choices[0].message.content
      } else {
        const errorText = await response.text()
        results.step2_openrouter = '❌ OpenRouter error: ' + response.status
        results.errors.push(errorText)
      }
    } catch (e) {
      results.step2_openrouter = '❌ OpenRouter fetch error'
      results.errors.push(e.message)
    }
  } else {
    results.step2_openrouter = '⏭️ Skipped (no API key)'
  }

  // Step 3: Test Gemini Embedding
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (geminiKey) {
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
          body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text: 'test' }] } })
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        results.step3_gemini_embedding = '✅ Gemini Embedding works: ' + data.embedding.values.length + ' dimensions'
      } else {
        const errorText = await response.text()
        results.step3_gemini_embedding = '❌ Gemini Embedding error: ' + response.status
        results.errors.push(errorText)
      }
    } catch (e) {
      results.step3_gemini_embedding = '❌ Gemini Embedding fetch error'
      results.errors.push(e.message)
    }
  } else {
    results.step3_gemini_embedding = '⏭️ Skipped (no API key)'
  }

  return new Response(
    JSON.stringify(results, null, 2),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
