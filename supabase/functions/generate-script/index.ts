import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { callGeminiHybrid, callOpenRouterHybrid, getApiKeyFromPool, incrementUsage } from '../_shared/apiKeyRotation.ts'
import { 
  PROJECT_INSTRUCTION, 
  CORE_FRAMEWORKS, 
  INDONESIAN_GENZ_PLAYBOOK, 
  TOP_HOOK_TEMPLATES,
  CINEMATIC_VISUAL_GUIDE,
  getStructureByDuration,
  getMaxWordsForDuration 
} from '../_shared/prompts/viralScriptKnowledge.ts'
import { 
  validateSlangUsage, 
  getSlangKnowledge 
} from '../_shared/prompts/slangValidator.ts'
// P0 Improvements (Jan 2026)
import {
  detectContentType,
  getFilteredHooksForPrompt,
  validateItemCoverage,
  ContentTypeResult
} from '../_shared/prompts/contentTypeDetector.ts'
import {
  validateAndFixScript,
  checkViralityFactors,
  ScriptValidationResult
} from '../_shared/prompts/scriptValidator.ts'
import {
  enhanceAllVisuals,
  addFFmpegSpecs
} from '../_shared/prompts/visualEnhancer.ts'
// P0: Product Naming - Entity Check & Fix
import { injectProductNamingRule } from '../_shared/prompts/productNamingRule.ts'
import { checkAndFixEntities } from '../_shared/entityCheck.ts'
// Security: Input sanitization
import { sanitizePromptInput, sanitizePlatform, sanitizeLanguage, sanitizeDuration } from '../_shared/inputSanitizer.ts'
import { getCorsHeaders, handleCors } from '../_shared/cors.ts'

// Supported languages with their script generation styles
const LANGUAGE_CONFIG: Record<string, { 
  name: string; 
  style: string; 
  example: string;
  foreshadow: { tease: string; urgency: string; example: string };
  hook: { pattern: string; example: string };
}> = {
  indonesian: {
    name: 'Indonesian',
    style: 'Indonesian Gen-Z style - casual, code-mixed with English slang (lo/gue, literally, vibes, banget, gila, anjay), rhetorical hooks, hyperbolic reactions',
    example: 'Gue dulu juga gitu, tapi setelah nemu cara ini—literally game changer banget!',
    foreshadow: {
      tease: '...dan yang terakhir ini yang paling [gila/penting/game-changer]',
      urgency: 'Tonton sampai habis / Stay sampai akhir',
      example: 'Gue bakal kasih tau 3 cara, dan yang ketiga ini literally yang paling gila. Tonton sampai habis!'
    },
    hook: {
      pattern: 'Curiosity gap + hyperbolic reaction',
      example: 'Lo tau nggak kenapa 90% orang gagal di [X]? Ternyata masalahnya cuma satu...'
    }
  },
  english: {
    name: 'English',
    style: 'Modern English - conversational, engaging, uses trending phrases and hooks common on TikTok/Instagram',
    example: 'I used to struggle with this too, but this ONE trick changed everything for me.',
    foreshadow: {
      tease: '...and the last one is the most [insane/important/game-changing]',
      urgency: 'Watch until the end / Stay till the end',
      example: "I'm gonna show you 3 methods, and the third one is absolutely insane. Watch until the end!"
    },
    hook: {
      pattern: 'Curiosity gap + bold claim',
      example: "Here's why 90% of people fail at [X]—and it's not what you think..."
    }
  },
  hindi: {
    name: 'Hindi',
    style: 'Hindi in Devanagari script (हिंदी) - casual Gen-Z tone, mix with English tech/trending terms allowed but Hindi words MUST be in Devanagari script',
    example: 'यार, मैंने भी ये try किया और literally लाइफ change हो गई!',
    foreshadow: {
      tease: '...और last वाला सबसे [crazy/important/game-changer] है',
      urgency: 'End तक देखो / Last तक रुको',
      example: 'मैं तुम्हें 3 तरीके बताऊंगा, और तीसरा वाला सबसे crazy है। End तक देखो!'
    },
    hook: {
      pattern: 'Relatable problem + solution tease',
      example: 'यार, 90% लोग [X] में fail क्यों होते हैं? Reason सिर्फ एक है...'
    }
  },
  french: {
    name: 'French',
    style: 'Modern French - conversational, engaging, uses trending phrases common on TikTok/Instagram France, casual tu/vous mix',
    example: "J'avais le même problème, mais cette astuce a tout changé pour moi !",
    foreshadow: {
      tease: '...et le dernier est le plus [fou/important/game-changer]',
      urgency: 'Regardez jusqu\'à la fin / Restez jusqu\'à la fin',
      example: "Je vais vous montrer 3 méthodes, et la troisième est absolument folle. Regardez jusqu'à la fin !"
    },
    hook: {
      pattern: 'Curiosity gap + bold claim',
      example: "Voici pourquoi 90% des gens échouent à [X]—et ce n'est pas ce que vous pensez..."
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Get dynamic CORS headers for this request
  const requestCorsHeaders = getCorsHeaders(req.headers.get('origin'));

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const requestBody = await req.json()
    const {
      input_type,
      content,
      duration,
      aspect_ratio,
      resolution,
      platform,
      language,
      user_id,
      segment_type,
      // DNA Tone parameters (from TopicSelection)
      use_dna_tone,
      creative_dna,
      // Video model for segment duration constraints
      video_model,
      // LOOP-END toggle (seamless video loop trick)
      enable_loop_end,
      // Shorten mode parameters
      mode,
      script,
      target_words,
      // Translate mode parameters
      scripts
      // NOTE: character_description is handled by VideoEditor -> generate-images
      // No need to pass avatar URL here anymore
    } = requestBody

    // ============================================================
    // SHORTEN MODE - Quick script shortening with AI
    // ============================================================
    if (mode === 'shorten' && script && target_words) {
      console.log(`[Script] Shorten mode - target: ${target_words} words`)

      const shortenLang = sanitizeLanguage(language)

      // Build language-specific shorten prompt
      let shortenPrompt: string
      if (shortenLang === 'indonesian') {
        shortenPrompt = `Tulis ulang script berikut menjadi TEPAT ${target_words} kata. Pertahankan pesan utama dan konteks penting. Gunakan gaya bahasa casual Gen-Z Indonesia (gue/lo, BUKAN saya/kamu). Buat sepadat dan seimpactful mungkin dalam ${target_words} kata.

PENTING: Output HARUS tepat ${target_words} kata, tidak kurang tidak lebih. Hitung kata dengan teliti.

Script asli:
"${script}"

Script baru (TEPAT ${target_words} kata):`
      } else if (shortenLang === 'hindi') {
        shortenPrompt = `इस स्क्रिप्ट को ठीक ${target_words} शब्दों में दोबारा लिखें। मुख्य संदेश और महत्वपूर्ण संदर्भ को बनाए रखें। Casual Hinglish style में लिखें (tum/yaar का उपयोग करें)। ${target_words} शब्दों में maximum impact बनाएं।

महत्वपूर्ण: Output में ठीक ${target_words} शब्द होने चाहिए, न कम न ज्यादा। शब्दों को ध्यान से गिनें।

Original script:
"${script}"

New script (EXACTLY ${target_words} words in Hindi/Hinglish):`
      } else {
        // Default: English
        shortenPrompt = `Rewrite the following script to EXACTLY ${target_words} words. Keep the main message and important context. Make it as impactful and engaging as possible within ${target_words} words.

IMPORTANT: Output MUST be exactly ${target_words} words, no more no less. Count words carefully.

Original script:
"${script}"

New script (EXACTLY ${target_words} words):`
      }

      try {
        // Get API key from pool only (no secrets fallback)
        const geminiKey = await getApiKeyFromPool(supabase, 'gemini')

        if (geminiKey) {
          console.log(`[Shorten] Using Gemini from pool: ${geminiKey.keyName}`)

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: shortenPrompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
              })
            }
          )

          if (response.ok) {
            const data = await response.json()
            const content = data?.candidates?.[0]?.content?.parts?.[0]?.text

            if (content) {
              // Increment usage
              await incrementUsage(supabase, geminiKey.keyId, 1)

              const shortenedScript = content.trim().replace(/^["']|["']$/g, '')
              return new Response(
                JSON.stringify({ success: true, shortened_script: shortenedScript }),
                { headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
              )
            }
          } else {
            console.log(`[Shorten] Gemini returned ${response.status}`)
          }
        }

        console.log('[Shorten] Gemini failed/unavailable, trying OpenRouter from pool...')

        // Fallback to OpenRouter from pool
        const openRouterKey = await getApiKeyFromPool(supabase, 'openrouter')
        let openRouterSuccess = false

        if (openRouterKey) {
          console.log(`[Shorten] Using OpenRouter from pool: ${openRouterKey.keyName}`)

          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openRouterKey.apiKey}`,
              'HTTP-Referer': 'https://sparkfluence.com',
              'X-Title': 'Sparkfluence'
            },
            body: JSON.stringify({
              model: 'meta-llama/llama-3.3-70b-instruct',
              messages: [{ role: 'user', content: shortenPrompt }],
              temperature: 0.7,
              max_tokens: 500
            })
          })

          if (response.ok) {
            const data = await response.json()
            const orContent = data?.choices?.[0]?.message?.content

            if (orContent) {
              // Increment usage
              await incrementUsage(supabase, openRouterKey.keyId, 1)

              const shortenedScript = orContent.trim().replace(/^["']|["']$/g, '')
              return new Response(
                JSON.stringify({ success: true, shortened_script: shortenedScript }),
                { headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
              )
            }
          } else {
            console.log(`[Shorten] OpenRouter returned ${response.status}`)
          }
        }

        // OpenRouter also failed - try Gemini 1.5 Flash as final retry
        if (!openRouterSuccess) {
          console.log('[Shorten] OpenRouter failed, retrying with Gemini 1.5 Flash...')

          const geminiRetryResult = await callGeminiHybrid(
            supabase,
            [{ role: 'user', content: shortenPrompt }],
            { model: 'gemini-2.0-flash-lite', temperature: 0.7, maxTokens: 500 }
          )

          if (geminiRetryResult.success && geminiRetryResult.content) {
            const shortenedScript = geminiRetryResult.content.trim().replace(/^["']|["']$/g, '')
            return new Response(
              JSON.stringify({ success: true, shortened_script: shortenedScript }),
              { headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        console.error('[Shorten] All providers failed')
        return new Response(
          JSON.stringify({ success: false, error: 'All API providers failed. Please try again later.' }),
          { status: 500, headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (err) {
        console.error('[Shorten] Error:', err)
        return new Response(
          JSON.stringify({ success: false, error: 'Shorten failed: ' + (err instanceof Error ? err.message : 'Unknown') }),
          { status: 500, headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ============================================================
    // TRANSLATE MODE - Translate all scripts to target language
    // ============================================================
    if (mode === 'translate' && scripts && language) {
      const scriptsArray = scripts as { segmentId: string; script: string; targetWords: number }[]
      const targetLang = sanitizeLanguage(language)

      console.log(`[Script] Translate mode - ${scriptsArray.length} segments to ${targetLang}`)

      const langConfig = LANGUAGE_CONFIG[targetLang] || LANGUAGE_CONFIG['indonesian']

      const translatePrompt = `You are a professional translator specializing in viral short-form video scripts.

TARGET LANGUAGE: ${langConfig.name}
STYLE: ${langConfig.style}
EXAMPLE TONE: "${langConfig.example}"

Translate the following scripts to ${langConfig.name}. Each script has a word limit - you MUST keep the translated script within that limit.

CRITICAL RULES:
1. Maintain the viral, engaging tone of the original
2. Keep each script WITHIN its word limit (not exact, but must not exceed)
3. Preserve the emotional impact and hooks
4. Use natural ${langConfig.name} expressions, not literal translation
${targetLang === 'indonesian' ? '5. Use gue/lo pronouns, NOT saya/kamu\n6. Mix with English slang naturally (literally, vibes, game-changer)' : ''}
${targetLang === 'hindi' ? '5. Use Devanagari script for Hindi words\n6. Mix with English tech/trending terms naturally' : ''}

INPUT SCRIPTS (JSON):
${JSON.stringify(scriptsArray.map(s => ({ id: s.segmentId, script: s.script, maxWords: s.targetWords })), null, 2)}

OUTPUT FORMAT (JSON only, no markdown):
{
  "translations": [
    { "id": "segment_id", "script": "translated script here" }
  ]
}

Return ONLY valid JSON, no explanations.`

      try {
        const geminiKey = await getApiKeyFromPool(supabase, 'gemini')

        if (geminiKey) {
          console.log(`[Translate] Using Gemini from pool: ${geminiKey.keyName}`)

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: translatePrompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
              })
            }
          )

          if (response.ok) {
            const data = await response.json()
            let content = data?.candidates?.[0]?.content?.parts?.[0]?.text

            if (content) {
              await incrementUsage(supabase, geminiKey.keyId, scriptsArray.length)

              // Clean JSON from markdown if present
              content = content.trim()
              if (content.startsWith('```json')) {
                content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '')
              } else if (content.startsWith('```')) {
                content = content.replace(/```\n?/g, '')
              }

              try {
                const parsed = JSON.parse(content)
                return new Response(
                  JSON.stringify({ success: true, translations: parsed.translations }),
                  { headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
                )
              } catch (parseErr) {
                console.error('[Translate] JSON parse error:', parseErr, 'Content:', content)
              }
            }
          } else {
            console.log(`[Translate] Gemini returned ${response.status}`)
          }
        }

        console.log('[Translate] Gemini failed/unavailable, trying OpenRouter...')

        const openRouterKey = await getApiKeyFromPool(supabase, 'openrouter')
        let openRouterSuccess = false

        if (openRouterKey) {
          console.log(`[Translate] Using OpenRouter from pool: ${openRouterKey.keyName}`)

          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openRouterKey.apiKey}`,
              'HTTP-Referer': 'https://sparkfluence.com',
              'X-Title': 'Sparkfluence'
            },
            body: JSON.stringify({
              model: 'meta-llama/llama-3.3-70b-instruct',
              messages: [{ role: 'user', content: translatePrompt }],
              temperature: 0.7,
              max_tokens: 4000
            })
          })

          if (response.ok) {
            const data = await response.json()
            let orContent = data?.choices?.[0]?.message?.content

            if (orContent) {
              await incrementUsage(supabase, openRouterKey.keyId, scriptsArray.length)
              openRouterSuccess = true

              orContent = orContent.trim()
              if (orContent.startsWith('```json')) {
                orContent = orContent.replace(/```json\n?/g, '').replace(/```\n?/g, '')
              } else if (orContent.startsWith('```')) {
                orContent = orContent.replace(/```\n?/g, '')
              }

              try {
                const parsed = JSON.parse(orContent)
                return new Response(
                  JSON.stringify({ success: true, translations: parsed.translations }),
                  { headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
                )
              } catch (parseErr) {
                console.error('[Translate] JSON parse error:', parseErr)
                openRouterSuccess = false  // JSON parse failed, try next provider
              }
            }
          }
        }

        // OpenRouter also failed - try Gemini 1.5 Flash as final retry
        if (!openRouterSuccess) {
          console.log('[Translate] OpenRouter failed, retrying with Gemini 1.5 Flash...')

          const geminiRetryResult = await callGeminiHybrid(
            supabase,
            [{ role: 'user', content: translatePrompt }],
            { model: 'gemini-2.0-flash-lite', temperature: 0.7, maxTokens: 4000 }
          )

          if (geminiRetryResult.success && geminiRetryResult.content) {
            let content = geminiRetryResult.content.trim()
            if (content.startsWith('```json')) {
              content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '')
            } else if (content.startsWith('```')) {
              content = content.replace(/```\n?/g, '')
            }

            try {
              const parsed = JSON.parse(content)
              return new Response(
                JSON.stringify({ success: true, translations: parsed.translations }),
                { headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
              )
            } catch (parseErr) {
              console.error('[Translate] Gemini retry JSON parse error:', parseErr)
            }
          }
        }

        console.error('[Translate] All providers failed')
        return new Response(
          JSON.stringify({ success: false, error: 'All API providers failed. Please try again later.' }),
          { status: 500, headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (err) {
        console.error('[Translate] Error:', err)
        return new Response(
          JSON.stringify({ success: false, error: 'Translate failed: ' + (err instanceof Error ? err.message : 'Unknown') }),
          { status: 500, headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (!content || !input_type) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing required fields' } }),
        { status: 400, headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================
    // SECURITY: Sanitize all user inputs before processing
    // ============================================================
    const sanitizedContent = sanitizePromptInput(content, 5000)
    if (!sanitizedContent) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Content is empty or invalid' } }),
        { status: 400, headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Set defaults with sanitization
    const selectedDuration = sanitizeDuration(duration)
    const selectedAspectRatio = aspect_ratio || '9:16'
    const selectedResolution = resolution || '1080p'
    const selectedPlatform = sanitizePlatform(platform)
    const selectedLanguage = sanitizeLanguage(language)
    const selectedVideoModel = video_model || 'sora-2' // Default to Sora for backward compatibility
    
    console.log('[Script] Starting generation - NO DB QUERIES for knowledge')
    console.log(`[Script] Duration: ${selectedDuration}, Language: ${selectedLanguage}, VideoModel: ${selectedVideoModel}`)

    // Handle regenerate_segment differently
    if (input_type === 'regenerate_segment') {
      const result = await regenerateSegment(supabase, sanitizedContent, segment_type, selectedLanguage)
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================
    // BUILD PROMPTS WITH STATIC KNOWLEDGE (NO DB QUERIES!)
    // ============================================================

    // Build DNA style guide if enabled
    const dnaStyles = use_dna_tone && creative_dna && Array.isArray(creative_dna) ? creative_dna : null
    console.log(`[Script] DNA Tone: ${use_dna_tone ? 'ENABLED' : 'disabled'}${dnaStyles ? ` (${dnaStyles.length} styles)` : ''}`)

    const enableLoopEnd = enable_loop_end === true
    console.log(`[Script] LOOP-END: ${enableLoopEnd ? 'ENABLED' : 'disabled'}`)
    const baseSystemPrompt = buildSystemPrompt(selectedLanguage, selectedDuration, dnaStyles, selectedVideoModel, enableLoopEnd)
    // P0: Inject product naming rule for tech topics
    const systemPrompt = injectProductNamingRule(baseSystemPrompt)
    const userPrompt = buildUserPrompt(
      input_type,
      sanitizedContent, // Use sanitized content
      selectedDuration,
      selectedAspectRatio,
      selectedResolution,
      selectedPlatform,
      selectedLanguage
    )

    // ============================================================
    // CALL LLM (OpenRouter PRIMARY, Gemini FALLBACK, Gemini-lite RETRY)
    // ============================================================

    let generatedText: string = ''
    let llmSource = 'unknown'
    let lastError = ''

    // Try OpenRouter first (paid model — reliable, no free-tier rate limits)
    console.log('[LLM] Trying OpenRouter gemini-2.5-flash-lite (primary)...')
    const openRouterResult = await callOpenRouterHybrid(
      supabase,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        model: 'google/gemini-2.5-flash-lite',
        temperature: 0.6,
        maxTokens: 8192
      }
    )

    if (openRouterResult.data?.choices?.[0]?.message?.content) {
      console.log(`[LLM] OpenRouter success (source: ${openRouterResult.source})`)
      generatedText = openRouterResult.data.choices[0].message.content
      llmSource = `openrouter-${openRouterResult.source}`
    } else {
      // Fallback to Gemini direct if OpenRouter fails
      console.log('[LLM] OpenRouter failed:', openRouterResult.error)
      lastError = openRouterResult.error || 'OpenRouter failed'
      console.log('[LLM] Trying Gemini 2.0 Flash (fallback)...')

      const geminiResult = await callGeminiHybrid(
        supabase,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        {
          model: 'gemini-2.0-flash',
          temperature: 0.6,
          maxTokens: 8192
        }
      )

      if (geminiResult.success && geminiResult.content) {
        console.log(`[LLM] Gemini success (source: ${geminiResult.source})`)
        generatedText = geminiResult.content
        llmSource = `gemini-${geminiResult.source}`
      } else {
        // Gemini also failed - try Gemini lite one more time
        console.log('[LLM] Gemini failed:', geminiResult.error)
        lastError = geminiResult.error || 'Gemini failed'
        console.log('[LLM] Retrying with Gemini 2.0 Flash Lite...')

        const geminiRetry = await callGeminiHybrid(
          supabase,
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          {
            model: 'gemini-2.0-flash-lite',
            temperature: 0.6,
            maxTokens: 8192
          }
        )

        if (geminiRetry.success && geminiRetry.content) {
          console.log(`[LLM] Gemini lite retry success (source: ${geminiRetry.source})`)
          generatedText = geminiRetry.content
          llmSource = `gemini-lite-${geminiRetry.source}`
        } else {
          // All providers failed
          console.error('[LLM] All providers failed')
          console.error('[LLM] OpenRouter error:', openRouterResult.error)
          console.error('[LLM] Gemini error:', geminiResult.error)
          console.error('[LLM] Gemini lite error:', geminiRetry.error)
          throw new Error(`All LLM providers failed. Last error: ${lastError}`)
        }
      }
    }

    console.log(`[LLM] Final source: ${llmSource}`)

    // ============================================================
    // P0: ENTITY CHECK & FIX (Product names)
    // ============================================================
    
    // Create a simple LLM wrapper for entity fix
    const callLLMForFix = async (prompt: string): Promise<string> => {
      const result = await callGeminiHybrid(
        supabase,
        [{ role: 'user', content: prompt }],
        { model: 'gemini-2.0-flash', temperature: 0.3, maxTokens: 4096 }
      )
      if (result.success && result.content) {
        return result.content
      }
      throw new Error(result.error || 'LLM call failed')
    }
    
    // Check and fix incomplete product names (e.g., "M4 Pro" → "POCO M4 Pro")
    const entityCheckResult = await checkAndFixEntities(generatedText, callLLMForFix)
    
    if (entityCheckResult.wasFixed) {
      console.log(`[EntityCheck] Fixed ${entityCheckResult.issuesFound} incomplete product names:`)
      entityCheckResult.issuesFixed.forEach(fix => console.log(`  - ${fix}`))
      generatedText = entityCheckResult.script
    }

    // ============================================================
    // PARSE OUTPUT
    // ============================================================
    
    let scriptData = parseScriptOutput(generatedText, selectedDuration, content, selectedLanguage)

    // Check for parse failure — retry once before giving up
    if (!scriptData.segments || scriptData.segments.length === 0) {
      console.warn('[Script] Parse resulted in empty segments — retrying LLM call...')

      // Retry with Gemini (potentially different key from rotation)
      const retryResult = await callGeminiHybrid(
        supabase,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        {
          model: 'gemini-2.0-flash',
          temperature: 0.5,  // Slightly lower temperature for more deterministic output
          maxTokens: 8192
        }
      )

      if (retryResult.success && retryResult.content) {
        console.log(`[Script] Retry LLM success (finishReason: ${retryResult.finishReason})`)
        generatedText = retryResult.content
        llmSource = `gemini-retry-parse-${retryResult.source}`
        scriptData = parseScriptOutput(generatedText, selectedDuration, content, selectedLanguage)
      }

      // Still empty after retry — return error
      if (!scriptData.segments || scriptData.segments.length === 0) {
        console.error('[Script] Parse still empty after retry — returning error to client')
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'PARSE_ERROR',
              message: 'AI output was truncated or malformed. Please try again.',
              raw_preview: generatedText.substring(0, 500)
            }
          }),
          { status: 500, headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Add entity check metadata
    if (entityCheckResult.wasFixed && scriptData.metadata) {
      scriptData.metadata.entity_fixes = entityCheckResult.issuesFixed
    }

    // Add video settings to metadata
    if (scriptData.metadata) {
      scriptData.metadata.aspect_ratio = selectedAspectRatio
      scriptData.metadata.resolution = selectedResolution
      scriptData.metadata.llm_source = llmSource
    }

    // ============================================================
    // P0 #2.0: WORD LIMIT POST-PROCESSING (Auto-fix)
    // ============================================================
    if (scriptData.segments && scriptData.segments.length > 0) {
      console.log('[PostProcess] Running word limit auto-fix...')

      const postProcessResult = await postProcessWordLimits(scriptData.segments, selectedLanguage, supabase)

      // Replace segments with post-processed version
      scriptData.segments = postProcessResult.segments

      // Add post-processing report to quality_report
      scriptData.quality_report = {
        ...scriptData.quality_report,
        post_processing: {
          hook_adjusted: postProcessResult.hook_adjusted,
          body_splits: postProcessResult.body_splits,
          strict_violations: postProcessResult.strict_violations,
          strict_violations_count: postProcessResult.strict_violations.length,
        },
      }

      console.log(`[PostProcess] Complete - ${postProcessResult.body_splits} splits, ${postProcessResult.strict_violations.length} strict violations`)
    }

    // ============================================================
    // P0 #2: VALIDATION & AUTO-FIX
    // ============================================================
    if (scriptData.segments && scriptData.segments.length > 0) {
      console.log('[Validation] Running P0 validation layer...')
      
      const validationResult = validateAndFixScript(
        scriptData.segments,
        content,
        selectedLanguage
      )
      
      // Replace segments with validated/fixed version
      scriptData.segments = validationResult.segments
      
      // Add validation report to quality_report
      scriptData.quality_report = {
        ...scriptData.quality_report,
        validation: {
          valid: validationResult.valid,
          score: validationResult.score,
          issues_count: validationResult.issues.length,
          auto_fixes_applied: validationResult.auto_fixes_applied,
          virality_factors: validationResult.virality_check.factors_found,
          virality_passed: validationResult.virality_check.passed,
        },
        issues: validationResult.issues,
      }
      
      console.log(`[Validation] Score: ${validationResult.score}/100, Fixes: ${validationResult.auto_fixes_applied}`)
      console.log(`[Validation] Virality: ${validationResult.virality_check.factors_count}/2 factors (${validationResult.virality_check.passed ? 'PASS' : 'WARN'})`)
      
      if (validationResult.issues.length > 0) {
        console.log(`[Validation] Issues found: ${validationResult.issues.length}`)
        validationResult.issues.forEach(issue => {
          console.log(`  - [${issue.severity}] ${issue.segment_id}/${issue.field}: ${issue.message}`)
        })
      }
    }

    // ============================================================
    // P0 #2.5: WORD COUNT VALIDATION (Critical for TTS/Video timing)
    // ============================================================
    if (scriptData.segments && scriptData.segments.length > 0) {
      console.log('[WordCount] Running word count validation...')
      
      const wordCountResult = validateWordCounts(
        scriptData.segments,
        selectedLanguage
      )
      
      // Add word count report to quality_report
      scriptData.quality_report = {
        ...scriptData.quality_report,
        word_count: {
          total_segments: wordCountResult.total_segments,
          segments_over_limit: wordCountResult.segments_over_limit,
          segments_warning: wordCountResult.segments_warning,
          all_passed: wordCountResult.all_passed,
          details: wordCountResult.details,
        },
      }
      
      // Log summary
      if (wordCountResult.all_passed) {
        console.log(`[WordCount] ✅ All ${wordCountResult.total_segments} segments within word limits`)
      } else {
        console.warn(`[WordCount] ⚠️ ${wordCountResult.segments_over_limit} segments OVER limit, ${wordCountResult.segments_warning} at warning level`)
        wordCountResult.details
          .filter((d: any) => d.status !== 'ok')
          .forEach((d: any) => {
            console.warn(`  - ${d.segment_id} (${d.type}): ${d.actual_words}/${d.max_words} words (${d.status.toUpperCase()})`)
          })
      }
    }

    // ============================================================
    // P0 #3: VISUAL ENHANCEMENT
    // ============================================================
    if (scriptData.segments && scriptData.segments.length > 0) {
      console.log('[Visual] Running P0 visual enhancement...')
      
      const enhancementResult = enhanceAllVisuals(
        scriptData.segments,
        selectedLanguage
      )
      
      // Replace segments with enhanced version
      scriptData.segments = enhancementResult.segments
      
      // Add enhancement report
      scriptData.quality_report = {
        ...scriptData.quality_report,
        visual_enhancement: {
          segments_enhanced: enhancementResult.total_enhanced,
          specs_added: enhancementResult.specs_summary,
        },
      }
      
      console.log(`[Visual] Enhanced ${enhancementResult.total_enhanced}/${scriptData.segments.length} segments`)
      if (Object.keys(enhancementResult.specs_summary).length > 0) {
        console.log(`[Visual] Specs added: ${JSON.stringify(enhancementResult.specs_summary)}`)
      }
    }

    // ============================================================
    // P1 #5: ADD FFMPEG SPECS (Preview)
    // ============================================================
    if (scriptData.segments && scriptData.segments.length > 0) {
      scriptData.segments = addFFmpegSpecs(scriptData.segments)
      console.log('[FFmpeg] Added transition and subtitle specs to all segments')
    }

    // ============================================================
    // FINAL QUALITY SCORE
    // ============================================================
    if (scriptData.quality_report) {
      const slangScore = scriptData.quality_report.slang_validation?.score || 70
      const validationScore = scriptData.quality_report.validation?.score || 70
      
      // Weighted average: Validation 60%, Slang 40%
      scriptData.quality_report.final_score = Math.round(
        (validationScore * 0.6) + (slangScore * 0.4)
      )
      
      console.log(`[Quality] Final Score: ${scriptData.quality_report.final_score}/100`)
    }

    return new Response(
      JSON.stringify({ success: true, data: scriptData }),
      { headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }),
      { status: 500, headers: { ...requestCorsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================================
// PROMPT BUILDERS (Using Static Knowledge)
// ============================================================================

function buildSystemPrompt(language: string, duration: string, dnaStyles: string[] | null = null, videoModel: string = 'sora-2', enableLoopEnd: boolean = false): string {
  const langConfig = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG['indonesian']
  
  // VIDEO MODEL AWARE: Adjust segment count based on model constraints
  // VEO 3.1: max 8s/segment → more segments needed
  // Sora 2.0: max 15s/segment → fewer segments
  const isVEO = videoModel?.toLowerCase()?.includes('veo') || videoModel?.toLowerCase()?.includes('3.1')
  
  let segmentCount: number
  if (isVEO) {
    // VEO 3.1: More segments with shorter durations (max 8s/segment)
    segmentCount = duration === '30s' ? 5 : duration === '60s' ? 8 : 12
  } else {
    // WAN/Kling: Fewer segments with longer durations (max 10s/segment)
    segmentCount = duration === '30s' ? 4 : duration === '60s' ? 6 : 9
  }

  // LOOP-END adds 1 segment for 60s, and for WAN 90s
  if (enableLoopEnd && (duration === '60s' || duration === '90s')) {
    if (duration === '60s') segmentCount += 1
    if (duration === '90s' && !isVEO) segmentCount += 1 // WAN 90s: 9→10 (VEO 90s stays 12)
  }
  
  const structureGuide = getStructureByDuration(duration, videoModel, language, enableLoopEnd)
  
  // Get slang knowledge for language
  const slangGuide = getSlangKnowledge(language)
  
  return `You are an elite Viral Script Engineer specializing in short-form video content that gets millions of views.

═══════════════════════════════════════════════════════════════
🚨 CONTENT COMPLETENESS RULES (ABSOLUTELY CRITICAL)
═══════════════════════════════════════════════════════════════

**IF THE TOPIC CONTAINS A NUMBER (e.g., "5 masakan", "3 tips", "7 cara"), YOU MUST:**

1. **COVER ALL ITEMS** - If topic says "5 masakan Italy", script MUST explain ALL 5 dishes
2. **ONE BODY SEGMENT PER ITEM** - Each numbered item gets its own BODY segment
3. **NO SKIPPING** - Never skip items to rush to CTA
4. **COMPLETE STORYLINE** - Each item must have:
   - Name/title of the item
   - Why it's relevant/viral/important
   - Key details or tips

**CONTENT DISTRIBUTION FOR NUMBERED TOPICS:**

| Topic Items | Video Duration | Distribution |
|-------------|----------------|---------------|
| 3 items | 30s | BODY-1, BODY-2, BODY-3 (1 item each) |
| 5 items | 60s | BODY-1 to BODY-4 + PEAK (distribute 5 items) |
| 7 items | 90s | BODY-1 to BODY-7 (1 item each) |

**EXAMPLE - "5 Masakan Italy yang VIRAL":**
- HOOK: "Lo wajib coba 5 masakan Italy ini sebelum mati!"
- FORE: "Gue bakal kasih tau 5 masakan, dan yang kelima ini literally game changer. Stay sampai akhir!"
- BODY-1: Masakan #1 (Carbonara) - kenapa viral, tips
- BODY-2: Masakan #2 (Cacio e Pepe) - kenapa viral, tips  
- BODY-3: Masakan #3 (Amatriciana) - kenapa viral, tips
- BODY-4: Masakan #4 (Risotto) - kenapa viral, tips
- PEAK: Masakan #5 (Tiramisu) - THE BEST ONE, payoff dari foreshadow
- CTA: "Follow buat rekomendasi kuliner lainnya!"

**VALIDATION BEFORE OUTPUT:**
- [ ] Count items mentioned in topic
- [ ] Verify ALL items are covered in BODY segments
- [ ] Ensure PEAK contains the "best" item (teased in FORE)
- [ ] Storyline flows logically from #1 to #N

═══════════════════════════════════════════════════════════════
🚨 CRITICAL OUTPUT RULES (MUST FOLLOW EXACTLY)
═══════════════════════════════════════════════════════════════

1. OUTPUT FORMAT: Return ONLY a valid JSON object. NO markdown, NO explanations, NO text before/after JSON.

2. SEGMENT STRUCTURE: Generate exactly ${segmentCount} segments for ${duration} video:
${structureGuide}

3. SHOT TYPES:
   - CREATOR: HOOK, CTA${enableLoopEnd ? ', LOOP-END' : ''} (creator talking to camera)
   - B-ROLL: FORE, BODY-1, BODY-2, BODY-3, PEAK (illustrative visuals)

4. EACH SEGMENT MUST HAVE:
   - segment_id: "VIDEO-001", "VIDEO-002", etc.
   - type: HOOK/FORE/BODY-1/BODY-2/BODY-3/PEAK/CTA${enableLoopEnd ? '/LOOP-END' : ''}
   - timing: "0-5s", "5-10s", etc.
   - duration_seconds: integer
   - shot_type: "CREATOR" or "B-ROLL"
   - emotion: Curiosity/Shock/Intrigue/Awe/Tension/Resolution/Urgency
   - transition: Cut/Jump-Cut/Zoom-In/Zoom-Out/Flash-Cut/Whip-Pan
   - script_text: The actual spoken script
   - visual_direction: Structured visual direction using EXACTLY this pipe-separated format:
     "Scene: [setting/location/props/subject] | Camera: [shot type, lens, angle, movement] | Lighting: [key/fill/rim, color temp, contrast] | Color: [grade, palette, saturation] | Mood: [atmosphere, energy, style] | FX: [text overlay, lens flare, particles, bokeh, etc.]"
     Each category 8-15 words. Total 50-80 words. ALL 6 categories MANDATORY.
   - creator_costume: (ONLY FOR CREATOR SHOTS) Outfit/clothing that matches the topic theme
   - creator_appearance: (ONLY FOR CREATOR SHOTS) Generic face description matching country + topic profession

5. SCRIPT LANGUAGE: ${langConfig.name}
   Style: ${langConfig.style}
   Example tone: "${langConfig.example}"

6. HOOK REQUIREMENTS (MOST IMPORTANT):
   **A. SCRIPT HOOK:**
   - Must stop the scroll in first 3 seconds
   - Use pattern interrupt, curiosity gap, or shocking statement
   - Include contrast (before/after, problem/solution)

   **B. VISUAL HOOK (CRITICAL — visual_direction for HOOK must include at least 2 of these):**
   - 🎬 UNEXPECTED MOVEMENT: Creator performs attention-grabbing gesture (lean into camera, hand wave,
     point at viewer, throw/catch object, sudden head turn). NOT just standing still!
   - 😱 EXTREME EXPRESSION: Exaggerated facial expression that creates curiosity (wide eyes + raised
     eyebrows for shock, leaning in with squinted eyes for intrigue, jaw drop, excited pointing)
   - 📱 TEXT OVERLAY CUE: Include a bold text overlay concept in visual_direction (e.g., "BOLD TEXT:
     'Jangan beli ini!' in red/yellow"). Text must tease the content.
   - 🔥 VISUAL ODDITY: Something unusual/unexpected in frame (unusual prop, contrasting background,
     dramatic lighting shift, holding product/item that triggers curiosity)
   - 🎯 RESULT FIRST: If topic is a tutorial/recipe/transformation, show the result preview in the
     background while creator reacts to it

   **HOOK visual_direction EXAMPLE (GOOD — structured format):**
   "Scene: Creator leans in suddenly with wide shocked eyes, left hand pointing at viewer, blurred topic preview in background | Camera: MCU low-angle 35mm f/2.0, slight push-in dolly | Lighting: Dramatic Rembrandt 4:1 ratio, warm key 3200K, blue rim separation | Color: High-contrast teal-orange grade, crushed blacks | Mood: Scroll-stopping intensity, authoritative energy, urgent | FX: BOLD TEXT 'Lo WAJIB tau ini!' bright yellow top-center, subtle lens flare"

   **HOOK visual_direction EXAMPLE (BAD — missing categories, no structure):**
   "Creator standing in front of camera talking about the topic. Normal expression. Clean background."

7. FORESHADOW (FORE) REQUIREMENTS:
   - MUST tease the ending: "${langConfig.foreshadow.tease}"
   - MUST include urgency: "${langConfig.foreshadow.urgency}"
   - Creates FOMO if viewer skips
   - Example in ${langConfig.name}: "${langConfig.foreshadow.example}"

8. ⚠️ SCRIPT WORD LIMIT (CRITICAL - COUNT YOUR WORDS!):
   - Each script_text MUST stay UNDER the MAX WORDS in structure table above
   - COUNT words BEFORE finalizing - if over limit, REWRITE SHORTER
   - Short + impactful > Long + rushed
   - Video generation will FAIL if script exceeds word limit!
   
   Example for 5s segment (max 9 words):
   ❌ WRONG (15 words): "Jadi, lo sudah siap untuk menjelajahi kota tersembunyi di Indonesia yang viral ini?"
   ✅ RIGHT (8 words): "Lo wajib tau kota tersembunyi viral ini!"
   
   Example for 8s segment (max 14 words):
   ❌ WRONG (24 words): "Share pengalaman serupa di comment below, dan jangan lupa follow buat rekomendasi travel lainnya!"
   ✅ RIGHT (12 words): "Share di comment, follow gue buat rekomendasi travel seru lainnya!"

9. ⚠️ MINIMUM CONTENT PER SEGMENT (NO FILLER SEGMENTS!):
   - EVERY BODY segment MUST carry substantive content (new info, argument, or storytelling)
   - MINIMUM 5 words for 5s segments, MINIMUM 8 words for 8s segments, MINIMUM 10 words for 10s segments
   - ❌ NEVER create reaction-only segments like "Gila, anjay!" or "Wow banget!" as standalone BODY segments
   - ❌ NEVER waste an entire segment on just an exclamation or filler phrase
   - ✅ Merge short reactions INTO the preceding or following segment's script
   - ✅ Each BODY segment should advance the narrative with real content

   Example (BAD — filler segment wastes 5s):
   BODY-5: "Gila, anjay!" (2 words, 5s = WASTE!)
   BODY-6: "Kolaborasi jadi lebih efektif, semua orang on the same page." (10 words, 8s)

   Example (GOOD — merged into one richer segment):
   BODY-5: "Gila anjay, kolaborasi jadi lebih efektif semua orang on the same page!" (12 words, 8s)

10. VISUAL DIRECTION REQUIREMENTS (50-80 WORDS EACH):
   - For CREATOR: facial expression, gesture, energy level, eye contact, background
   - For B-ROLL: main subject, composition, lighting mood, motion, text overlays

11. CREATOR COSTUME REQUIREMENTS (MANDATORY FOR CREATOR SHOTS):
   - For HOOK/CTA segments, add "creator_costume" field with topic-appropriate outfit
   - Examples by topic:
     * Agriculture/Farming → "farmer outfit with straw hat, plaid shirt, denim overalls"
     * Technology/Coding → "casual tech hoodie, modern minimalist style"
     * Fitness/Health → "athletic wear, sports jersey, gym outfit"
     * Business/Finance → "professional blazer, smart casual business attire"
     * Cooking/Food → "chef apron, kitchen attire, food blogger casual"
     * Travel → "explorer outfit, casual travel wear with backpack"
     * Fashion/Beauty → "trendy fashionable outfit matching current season"
   - Costume should enhance credibility and match topic theme
   - Keep description concise: 10-20 words max

12. CREATOR APPEARANCE (FALLBACK FOR NO-AVATAR USERS):
   - For CREATOR shots, ALWAYS add "creator_appearance" field
   - This describes a GENERIC FACE matching the target audience country + topic profession
   - Format: "[ethnicity] [gender], [age], [profession-related appearance]"
   - Country/ethnicity based on script language:
     * Indonesian → "Southeast Asian Indonesian"
     * Hindi → "South Asian Indian"
     * English → "diverse/mixed ethnicity" (neutral)
   - Profession based on topic:
     * Agriculture → "farmer with weathered friendly face"
     * Medical/Health → "doctor/nurse with caring professional look"
     * Technology → "tech professional with modern casual look"
     * Fitness → "athletic trainer with energetic expression"
     * Business → "business professional with confident demeanor"
     * Cooking → "chef with warm approachable smile"
   - Example for Indonesian farming topic:
     "Southeast Asian Indonesian male, late 30s, experienced farmer with friendly weathered face, warm smile"
   - Keep description 15-25 words, focus on FACE characteristics only
${enableLoopEnd ? `
═══════════════════════════════════════════════════════════════
🔄 LOOP-END RULES (SEAMLESS VIDEO LOOP TRICK)
═══════════════════════════════════════════════════════════════

**WHAT IS LOOP-END?**
LOOP-END is the LAST segment of the video. Its purpose is to make viewers
UNKNOWINGLY loop back to the HOOK. The video appears to never end — viewers
get tricked into re-watching without realizing it.

**LOOP-END IS NOT A CTA!**
- ❌ WRONG: "Follow gue buat part 2!" (this is CTA, not LOOP-END)
- ❌ WRONG: "Share ke temen lo!" (this is CTA, not LOOP-END)
- ✅ RIGHT: "Tapi yang paling gila sih..." (creates curiosity → loops to HOOK)
- ✅ RIGHT: "Eh bentar, lo tau ga..." (mirrors HOOK opening → seamless loop)

**LOOP-END RULES:**
1. MUST visually mirror the HOOK — same pose, same angle, same energy
2. Script MUST create a curiosity gap that connects to the HOOK opening line
3. The viewer should NOT realize the video has ended
4. LOOP-END is a CREATOR shot (talking head), same as HOOK
5. Duration: 5s max
6. Emotion should match HOOK (usually Curiosity)

**LOOP-END EXAMPLES (Indonesian):**
- HOOK: "Lo tau ga, ada 5 makanan yang..." → LOOP-END: "Oh iya, lo tau ga sih ada yang lebih gila..."
- HOOK: "Ini rahasia yang..." → LOOP-END: "Eh tapi ada satu rahasia lagi yang..."
- HOOK: "Jangan pernah..." → LOOP-END: "Tapi yang paling bahaya tuh sebenernya..."

**LOOP-END EXAMPLES (English):**
- HOOK: "Did you know that..." → LOOP-END: "But wait, there's actually something crazier..."
- HOOK: "Nobody talks about..." → LOOP-END: "Oh and one more thing nobody mentions..."

**VISUAL DIRECTION FOR LOOP-END (use structured format):**
- Scene: Same background as HOOK, creator leans in with curious/teasing expression
- Camera: Same angle as HOOK (mirror exact framing)
- Lighting: Same setup as HOOK
- Color: Same grade as HOOK
- Mood: Mirrors HOOK energy, creates seamless loop feeling
- FX: Subtle curiosity cue (e.g., text tease or visual callback to HOOK)
- Transition: use "Whip-Pan" or "Flash-Cut" that flows into HOOK start
` : ''}
═══════════════════════════════════════════════════════════════
📚 KNOWLEDGE BASE (Apply these principles)
═══════════════════════════════════════════════════════════════

${CORE_FRAMEWORKS}

${language === 'indonesian' ? INDONESIAN_GENZ_PLAYBOOK : ''}

${TOP_HOOK_TEMPLATES}

═══════════════════════════════════════════════════════════════
🗣️ SLANG & LANGUAGE AUTHENTICITY (2026 UPDATED)
═══════════════════════════════════════════════════════════════

${slangGuide}

**CRITICAL SLANG RULES:**
1. Use ≥2 current slang terms from Top 20 list (virality score 8-10/10)
2. AVOID all outdated terms listed in the guide
3. Include filler words/particles for natural flow
${language === 'indonesian' ? '4. Use gue/lo pronouns (NEVER saya/kamu - sounds corporate)' : ''}
${language === 'indonesian' ? '5. Include particles: sih, tuh, gitu, dong (≥2 per script)' : ''}
${language === 'hindi' ? '4. Use tum pronouns (avoid excessive aap/ji - sounds too formal)' : ''}
${language === 'hindi' ? '5. Include fillers: yaar, na, matlab, arre (≥2 per script)' : ''}
${language === 'english' ? '4. Use UNIVERSAL slang only (no regional: "no cap", "innit", "finna")' : ''}
${language === 'english' ? '5. Avoid outdated emoji: 😂 is CRINGE (use 💀 or 😭 for laughing)' : ''}

${dnaStyles && dnaStyles.length > 0 ? `
═══════════════════════════════════════════════════════════════
🧬 CREATOR DNA STYLE (APPLY TO ALL SCRIPTS)
═══════════════════════════════════════════════════════════════

The creator has defined their unique voice/style. APPLY these characteristics:

${dnaStyles.map((style, i) => `${i + 1}. **${style}**`).join('\n')}

**HOW TO APPLY DNA:**
- Hook should reflect these style traits
- Script tone should match the DNA personality
- Visual direction should complement the DNA vibe
- CTA should feel authentic to this creator's style

` : ''}
═══════════════════════════════════════════════════════════════
🎬 CINEMATIC VISUAL DIRECTION (CRITICAL FOR QUALITY)
═══════════════════════════════════════════════════════════════

${CINEMATIC_VISUAL_GUIDE}

DO NOT deviate from this structure. Output ONLY the JSON.`;
}

// Helper: Extract number from topic (e.g., "5 masakan" -> 5)
function extractTopicItemCount(topic: string): number | null {
  // Match patterns like "5 masakan", "3 tips", "7 cara", "10 fakta"
  const patterns = [
    /(\d+)\s*(masakan|makanan|minuman|resep|menu|hidangan)/i,
    /(\d+)\s*(tips?|trik|cara|langkah|step|hack)/i,
    /(\d+)\s*(fakta|hal|alasan|reason|thing)/i,
    /(\d+)\s*(produk|brand|merek|item|barang)/i,
    /(\d+)\s*(tempat|lokasi|destinasi|spot)/i,
    /(\d+)\s*(film|movie|series|anime|game)/i,
    /(\d+)\s*(artis|seleb|influencer|creator)/i,
    /top\s*(\d+)/i,
    /(\d+)\s*(best|terbaik|teratas)/i
  ]
  
  for (const pattern of patterns) {
    const match = topic.match(pattern)
    if (match) {
      // Extract the number (could be in group 1 or 2 depending on pattern)
      const num = parseInt(match[1]) || parseInt(match[2])
      if (num && num > 0 && num <= 10) return num
    }
  }
  return null
}

function buildUserPrompt(
  inputType: string,
  content: string,
  duration: string,
  aspectRatio: string,
  resolution: string,
  platform: string,
  language: string
): string {
  const langConfig = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG['indonesian']
  const compositionGuide = aspectRatio === '16:9' 
    ? 'LANDSCAPE - wide shots, horizontal framing'
    : 'VERTICAL 9:16 - tight framing, center-focused, mobile-optimized'
  
  // P0 #1: Content Type Detection - filter hooks to reduce context
  const contentTypeDetection = detectContentType(content, language)
  const filteredHooks = getFilteredHooksForPrompt(content, language)
  console.log(`[ContentType] Detected: ${contentTypeDetection.primary_type} (${contentTypeDetection.confidence}%)`)
  
  // Detect if topic has numbered items
  const itemCount = extractTopicItemCount(content) || contentTypeDetection.item_count
  const numberedTopicInstructions = itemCount ? `
═══════════════════════════════════════════════════════════════
⚠️ NUMBERED TOPIC DETECTED: ${itemCount} ITEMS
═══════════════════════════════════════════════════════════════

Your topic mentions **${itemCount} items**. You MUST:

1. **COVER ALL ${itemCount} ITEMS** in the BODY segments
2. **Distribution plan:**
   - BODY-1: Item #1 (with name + why it's special)
   - BODY-2: Item #2 (with name + why it's special)
   ${itemCount >= 3 ? '- BODY-3: Item #3 (with name + why it\'s special)' : ''}
   ${itemCount >= 4 ? '- BODY-4: Item #4 (with name + why it\'s special)' : ''}
   ${itemCount >= 5 ? '- PEAK: Item #5 - THE BEST ONE (teased in FORE as "yang terakhir paling gila")' : ''}
   ${itemCount >= 6 ? '- Additional items distributed across remaining BODY segments' : ''}
3. **FORE must tease**: "...dan yang ke-${itemCount} ini yang paling [gila/penting]"
4. **NO SKIPPING** - Do NOT jump to CTA before covering all ${itemCount} items!

❌ WRONG: Topic "5 masakan" but only covers 2, then jumps to CTA
✅ CORRECT: Topic "5 masakan" covers all 5 across BODY-1, BODY-2, BODY-3, BODY-4, PEAK
` : ''

  return `
═══════════════════════════════════════════════════════════════
🎯 GENERATE VIRAL SCRIPT NOW
═══════════════════════════════════════════════════════════════

TOPIC: ${content}

VIDEO SPECS:
- Duration: ${duration}
- Aspect Ratio: ${aspectRatio} (${compositionGuide})
- Platform: ${platform}
- Language: ${langConfig.name} (${langConfig.style})

═══════════════════════════════════════════════════════════════
🎣 CONTENT-SPECIFIC HOOKS (Filtered for this topic)
═══════════════════════════════════════════════════════════════
${filteredHooks}
${numberedTopicInstructions}
═══════════════════════════════════════════════════════════════
⚡ GENERATE NOW - OUTPUT JSON ONLY
═══════════════════════════════════════════════════════════════

CRITICAL REMINDERS:
1. HOOK must stop scroll with curiosity/shock pattern. Example: "${langConfig.hook.example}"
2. FORE must tease ending: "${langConfig.foreshadow.example}"
3. Each visual_direction MUST use structured format: "Scene: ... | Camera: ... | Lighting: ... | Color: ... | Mood: ... | FX: ..." (50-80 words total, ALL 6 categories)
4. ALL script_text MUST be in ${langConfig.name} ONLY - NO mixing languages!
5. Return ONLY valid JSON, no other text
${itemCount ? `6. ⚠️ COVER ALL ${itemCount} ITEMS - Do NOT skip any! Each item gets its own BODY segment.
7. PEAK segment = Item #${itemCount} (the BEST one, teased in FORE)` : ''}

Generate the complete viral script JSON now:`;
}

// ============================================================================
// OUTPUT PARSER (Enhanced with validation)
// ============================================================================

function parseScriptOutput(generatedText: string, duration: string, topic?: string, language?: string): any {
  try {
    // Try to extract JSON from the response
    let jsonStr = generatedText.trim()
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }
    
    // Find JSON — try object first, then array
    const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/)
    const jsonArrMatch = jsonStr.match(/\[[\s\S]*\]/)
    // Prefer whichever starts earlier in the string (array format: [...], object format: {...})
    let jsonMatch: string | null = null
    if (jsonObjMatch && jsonArrMatch) {
      jsonMatch = (jsonStr.indexOf(jsonArrMatch[0]) < jsonStr.indexOf(jsonObjMatch[0]))
        ? jsonArrMatch[0] : jsonObjMatch[0]
    } else {
      jsonMatch = jsonObjMatch?.[0] || jsonArrMatch?.[0] || null
    }

    // If no complete JSON found, try to find start of truncated JSON
    if (!jsonMatch) {
      const arrStart = jsonStr.indexOf('[')
      const objStart = jsonStr.indexOf('{')
      if (arrStart >= 0 || objStart >= 0) {
        const start = (arrStart >= 0 && objStart >= 0) ? Math.min(arrStart, objStart)
          : arrStart >= 0 ? arrStart : objStart
        jsonMatch = jsonStr.substring(start)
      }
    }

    if (jsonMatch) {
      let parsed: any

      try {
        parsed = JSON.parse(jsonMatch)
      } catch (jsonError) {
        // JSON might be truncated - try to fix it
        console.log('[Parser] JSON parse failed, attempting to fix truncated JSON...')

        // Strategy: find the last complete segment object and close the structure
        // A complete segment ends with "}" followed by "," or "]" or end-of-string
        let fixedJson = jsonMatch

        // Step 1: Trim trailing incomplete key-value pair
        // Remove trailing content after the last complete property
        // Look for last `}` that closes a segment object
        const lastClosingBrace = fixedJson.lastIndexOf('}')
        if (lastClosingBrace > 0) {
          fixedJson = fixedJson.substring(0, lastClosingBrace + 1)
        }

        // Step 2: Close any remaining open brackets/braces
        const openBrackets = (fixedJson.match(/\[/g) || []).length
        const closeBrackets = (fixedJson.match(/\]/g) || []).length
        const openBraces = (fixedJson.match(/\{/g) || []).length
        const closeBraces = (fixedJson.match(/\}/g) || []).length

        // Remove trailing comma before closing
        fixedJson = fixedJson.replace(/,\s*$/, '')

        fixedJson += '}'.repeat(Math.max(0, openBraces - closeBraces))
        fixedJson += ']'.repeat(Math.max(0, openBrackets - closeBrackets))

        // Try parsing
        try {
          parsed = JSON.parse(fixedJson)
          console.log('[Parser] Successfully repaired truncated JSON')
        } catch {
          // Step 3: More aggressive — find last complete segment by looking for pattern
          // Array format: }, { "segment_id" — find last complete object
          const lastSegmentEnd = fixedJson.lastIndexOf('},')
          if (lastSegmentEnd > 0) {
            let truncated = fixedJson.substring(0, lastSegmentEnd + 1)
            // Close array/object structure
            const ob = (truncated.match(/\[/g) || []).length - (truncated.match(/\]/g) || []).length
            const oc = (truncated.match(/\{/g) || []).length - (truncated.match(/\}/g) || []).length
            truncated += '}'.repeat(Math.max(0, oc))
            truncated += ']'.repeat(Math.max(0, ob))
            try {
              parsed = JSON.parse(truncated)
              console.log(`[Parser] Repaired by truncating to last complete segment`)
            } catch {
              throw jsonError
            }
          } else {
            throw jsonError
          }
        }
      }
      
      // ================================================================
      // HANDLE DIFFERENT LLM OUTPUT FORMATS
      // ================================================================
      
      let segments: any[] = []
      
      // Format 1: Already has segments array
      if (parsed.segments && Array.isArray(parsed.segments)) {
        segments = parsed.segments
      }
      // Format 2: Object with VIDEO-XXX keys (e.g., { "VIDEO-001": {...}, "VIDEO-002": {...} })
      else if (parsed['VIDEO-001'] || Object.keys(parsed).some(k => k.startsWith('VIDEO-'))) {
        console.log('[Parser] Detected VIDEO-XXX object format, converting to array...')
        const videoKeys = Object.keys(parsed)
          .filter(k => k.startsWith('VIDEO-'))
          .sort() // Ensure order
        
        segments = videoKeys.map(key => ({
          segment_id: key,
          ...parsed[key]
        }))
      }
      // Format 3: Object with segment_X keys
      else if (Object.keys(parsed).some(k => k.match(/^segment_?\d+$/i))) {
        console.log('[Parser] Detected segment_X object format, converting to array...')
        const segmentKeys = Object.keys(parsed)
          .filter(k => k.match(/^segment_?\d+$/i))
          .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''))
            const numB = parseInt(b.replace(/\D/g, ''))
            return numA - numB
          })
        
        segments = segmentKeys.map((key, index) => ({
          segment_id: `VIDEO-${String(index + 1).padStart(3, '0')}`,
          ...parsed[key]
        }))
      }
      // Format 4: Direct array at root
      else if (Array.isArray(parsed)) {
        console.log('[Parser] Detected root array format')
        segments = parsed
      }
      
      if (segments.length === 0) {
        console.error('[Parser] Could not extract segments from:', Object.keys(parsed))
        throw new Error('Could not extract segments from LLM output')
      }
      
      console.log(`[Parser] Extracted ${segments.length} segments`)

      // Validate and enhance segments
      segments = segments.map((segment: any, index: number) => {
        // Ensure segment_id exists
        if (!segment.segment_id) {
          segment.segment_id = `VIDEO-${String(index + 1).padStart(3, '0')}`
        }
        
        // Ensure emotion exists
        if (!segment.emotion) {
          segment.emotion = index === 0 ? 'Curiosity' : 'Intrigue'
        }
        
        // Ensure transition exists
        if (!segment.transition) {
          segment.transition = 'Cut'
        }
        
        // ============================================================
        // CRITICAL: Auto-assign shot_type based on segment type
        // This ensures HOOK/CTA always get CREATOR, others get B-ROLL
        // Even if LLM forgets to return shot_type field
        // ============================================================
        const segmentType = (segment.type || '').toUpperCase()
        const CREATOR_SEGMENTS = ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA', 'ENDING']
        
        // Auto-assign if missing OR if LLM returned wrong value
        if (!segment.shot_type || segment.shot_type === '') {
          segment.shot_type = CREATOR_SEGMENTS.includes(segmentType) ? 'CREATOR' : 'B-ROLL'
          console.log(`[Parser] Auto-assigned shot_type: ${segment.type} → ${segment.shot_type}`)
        } else {
          // Validate LLM's shot_type - override if incorrect
          const shouldBeCreator = CREATOR_SEGMENTS.includes(segmentType)
          const isCreator = segment.shot_type.toUpperCase() === 'CREATOR'
          
          if (shouldBeCreator && !isCreator) {
            console.log(`[Parser] Correcting shot_type: ${segment.type} was ${segment.shot_type} → CREATOR`)
            segment.shot_type = 'CREATOR'
          } else if (!shouldBeCreator && isCreator) {
            console.log(`[Parser] Correcting shot_type: ${segment.type} was ${segment.shot_type} → B-ROLL`)
            segment.shot_type = 'B-ROLL'
          }
        }
        
        return segment
      })

      // Build result object
      const result: any = {
        segments,
        metadata: parsed.metadata || {
          total_duration: parseInt(duration),
          language: language || 'english',
          platform: 'tiktok'
        }
      }
      
      // ========================================================
      // SLANG VALIDATION (NEW - 2026)
      // ========================================================
      if (language && segments.length > 0) {
        // Extract all script text from segments
        const allScriptText = segments
          .map((s: any) => s.script_text || '')
          .filter(Boolean)
          .join(' ')
        
        if (allScriptText.length > 0) {
          console.log(`[Slang] Validating ${allScriptText.length} characters in ${language}...`)
          const slangValidation = validateSlangUsage(allScriptText, language)
          
          result.quality_report = {
            slang_validation: slangValidation,
            quality_score: slangValidation.score,
            timestamp: new Date().toISOString()
          }
          
          console.log(`[Slang] Score: ${slangValidation.score}/100`)
          console.log(`[Slang] Current slang: ${slangValidation.current_slang.join(', ')}` )
          if (slangValidation.outdated_slang.length > 0) {
            console.warn(`[Slang] Outdated: ${slangValidation.outdated_slang.join(', ')}`)
          }
          if (slangValidation.warnings.length > 0) {
            console.warn(`[Slang] Warnings: ${slangValidation.warnings.join('; ')}`)
          }
        }
      }
      
      // ========================================================
      // CONTENT COMPLETENESS VALIDATION
      // ========================================================
      if (topic) {
        const expectedItemCount = extractTopicItemCount(topic)
        if (expectedItemCount) {
          // Count BODY segments (where content items should be)
          const bodySegments = segments.filter((s: any) => 
            s.type?.toUpperCase().startsWith('BODY') || 
            s.type?.toUpperCase() === 'PEAK'
          )
          
          result.metadata.expected_items = expectedItemCount
          result.metadata.body_segment_count = bodySegments.length
          
          if (bodySegments.length < expectedItemCount) {
            result.metadata.content_warning = `Topic mentions ${expectedItemCount} items but only ${bodySegments.length} BODY segments generated. Some items may be missing.`
            console.warn(`[Parser] ⚠️ Content mismatch: Expected ${expectedItemCount} items, got ${bodySegments.length} BODY segments`)
          } else {
            result.metadata.content_complete = true
            console.log(`[Parser] ✅ Content complete: ${expectedItemCount} items covered in ${bodySegments.length} BODY segments`)
          }
        }
      }

      console.log(`[Parser] Successfully parsed ${segments.length} segments`)
      return result
    }

    throw new Error('No JSON found in response')

  } catch (parseError) {
    console.error('[Parser] Failed to parse LLM output:', parseError)
    console.error('[Parser] Raw output:', generatedText.substring(0, 1000))
    
    return {
      segments: [],
      metadata: {
        total_duration: parseInt(duration),
        parse_error: true,
        raw_output: generatedText.substring(0, 2000)
      },
      error: 'Failed to parse script output'
    }
  }
}

// ============================================================================
// REGENERATE SINGLE SEGMENT (Simplified)
// ============================================================================

async function regenerateSegment(
  supabase: any, 
  feedback: string, 
  segmentType: string, 
  language: string
) {
  const langConfig = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG['indonesian']
  const isCreatorShot = ['HOOK', 'CTA', 'LOOP-END'].includes(segmentType?.toUpperCase())

  const systemPrompt = `You are a Viral Script Engineer. Regenerate a SINGLE video segment based on user feedback.

SEGMENT TYPE: ${segmentType || 'BODY'}
SHOT TYPE: ${isCreatorShot ? 'CREATOR' : 'B-ROLL'}
LANGUAGE: ${langConfig.name} - ${langConfig.style}

CRITICAL:
- visual_direction MUST use structured format: "Scene: ... | Camera: ... | Lighting: ... | Color: ... | Mood: ... | FX: ..." (50-80 words total, ALL 6 categories)
- script_text in ${langConfig.name} Gen-Z style
- Output ONLY valid JSON`

  const userPrompt = `Regenerate this segment with the following feedback:

${feedback}

Return JSON:
{
  "segment": {
    "segment_id": "REGEN-001",
    "type": "${segmentType}",
    "timing": "0-8s",
    "duration_seconds": 8,
    "shot_type": "${isCreatorShot ? 'CREATOR' : 'B-ROLL'}",
    "emotion": "...",
    "transition": "Cut",
    "script_text": "... (${langConfig.name} Gen-Z style)",
    "visual_direction": "Scene: [setting/subject] | Camera: [shot/lens/movement] | Lighting: [setup/temp/contrast] | Color: [grade/palette] | Mood: [atmosphere/energy] | FX: [overlays/effects]"
  }
}`

  // Try Gemini first (FAST)
  let generatedText: string = ''
  
  console.log('[Regenerate] Trying Gemini (primary)...')
  const geminiResult = await callGeminiHybrid(
    supabase,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    {
      model: 'gemini-2.0-flash',
      temperature: 0.7,
      maxTokens: 1024
    }
  )

  if (geminiResult.success && geminiResult.content) {
    console.log('[Regenerate] Gemini success')
    generatedText = geminiResult.content
  } else {
    // Fallback to OpenRouter
    console.log('[Regenerate] Gemini failed:', geminiResult.error)
    console.log('[Regenerate] Trying OpenRouter...')
    
    const openRouterResult = await callOpenRouterHybrid(
      supabase,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        model: 'google/gemini-2.5-flash-lite',
        temperature: 0.7,
        maxTokens: 1024
      }
    )

    if (openRouterResult.error || !openRouterResult.data?.choices?.[0]?.message?.content) {
      throw new Error(openRouterResult.error || 'All LLM providers failed')
    }
    generatedText = openRouterResult.data.choices[0].message.content
  }

  // Parse JSON
  let jsonStr = generatedText.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  }
  
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
  const result = JSON.parse(jsonMatch ? jsonMatch[0] : jsonStr)
  
  return result
}

// ============================================================================
// WORD COUNT VALIDATION (P0 #2.5 - Critical for TTS/Video timing)
// ============================================================================

interface WordCountDetail {
  segment_id: string
  type: string
  duration_seconds: number
  max_words: number
  actual_words: number
  percentage: number
  status: 'ok' | 'warning' | 'over'
}

interface WordCountResult {
  total_segments: number
  segments_over_limit: number
  segments_warning: number
  all_passed: boolean
  details: WordCountDetail[]
}

/**
 * Count words in a text string
 * Handles mixed Indonesian/English text and filters out punctuation-only tokens
 */
function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0
  
  // Split by whitespace and filter out empty strings and punctuation-only tokens
  const words = text
    .trim()
    .split(/\s+/)
    .filter(word => {
      // Remove punctuation-only tokens like "..." or "!"
      const cleaned = word.replace(/[^\w\u0900-\u097F\u00C0-\u024F]/g, '')
      return cleaned.length > 0
    })
  
  return words.length
}

/**
 * Validate word counts for all segments against their duration-based limits
 *
 * Thresholds:
 * - OK: ≤100% of max words
 * - WARNING: 80-100% of max words (close to limit)
 * - OVER: >100% of max words (will cause rushed speech)
 */
function validateWordCounts(segments: any[], language: string = 'indonesian'): WordCountResult {
  const details: WordCountDetail[] = []
  let segmentsOverLimit = 0
  let segmentsWarning = 0

  for (const segment of segments) {
    const scriptText = segment.script_text || ''
    const durationSeconds = segment.duration_seconds || 8

    // Get max words for this segment's duration
    const maxWords = getMaxWordsForDuration(durationSeconds, language)
    const actualWords = countWords(scriptText)
    const percentage = maxWords > 0 ? Math.round((actualWords / maxWords) * 100) : 0

    // Determine status
    let status: 'ok' | 'warning' | 'over' = 'ok'
    if (actualWords > maxWords) {
      status = 'over'
      segmentsOverLimit++
    } else if (percentage >= 80) {
      status = 'warning'
      segmentsWarning++
    }

    details.push({
      segment_id: segment.segment_id || 'unknown',
      type: segment.type || 'unknown',
      duration_seconds: durationSeconds,
      max_words: maxWords,
      actual_words: actualWords,
      percentage,
      status
    })
  }

  return {
    total_segments: segments.length,
    segments_over_limit: segmentsOverLimit,
    segments_warning: segmentsWarning,
    all_passed: segmentsOverLimit === 0,
    details
  }
}

// ============================================================================
// WORD LIMIT POST-PROCESSING (P0 #2.6 - Auto-fix over-limit segments)
// ============================================================================

interface PostProcessingResult {
  segments: any[]
  hook_adjusted: boolean
  body_splits: number
  strict_violations: string[]
}

/**
 * Adjust HOOK duration if word count exceeds 5s limit but fits in 8s
 * HOOK can only be 5s or 8s (supported video durations)
 */
function adjustHookDuration(segments: any[], language: string): { segments: any[], adjusted: boolean } {
  let adjusted = false

  const result = segments.map(segment => {
    const segmentType = (segment.type || '').toUpperCase()
    if (segmentType !== 'HOOK') return segment

    const actualWords = countWords(segment.script_text || '')
    const max5s = getMaxWordsForDuration(5, language)  // ~9 words (Indonesian), ~10 (English), ~9 (French)
    const max8s = getMaxWordsForDuration(8, language)  // ~14 words (Indonesian), ~16 (English), ~15 (French)

    if (actualWords <= max5s) {
      // Fits in 5s, use 5s
      return { ...segment, duration_seconds: 5, timing: '0-5s' }
    } else if (actualWords <= max8s) {
      // Needs 8s (only supported option above 5s)
      console.log(`[HookAdjust] HOOK has ${actualWords} words (>${max5s}), extending to 8s`)
      adjusted = true

      return {
        ...segment,
        duration_seconds: 8,
        timing: '0-8s'
      }
    } else {
      // Over 8s max - cap at 8s, log warning
      console.warn(`[HookAdjust] ⚠️ HOOK has ${actualWords} words (max ${max8s}). Needs manual edit.`)
      adjusted = true

      return {
        ...segment,
        duration_seconds: 8,
        timing: '0-8s',
        _word_limit_warning: `Over limit: ${actualWords}/${max8s} words`
      }
    }
  })

  return { segments: result, adjusted }
}

/**
 * Snap duration to nearest supported video duration
 * Supported durations: 5s, 8s (VEO), 10s (WAN)
 */
function snapToSupportedDuration(duration: number): number {
  const SUPPORTED_DURATIONS = [5, 8, 10]

  // Find nearest supported duration
  let nearest = SUPPORTED_DURATIONS[0]
  let minDiff = Math.abs(duration - nearest)

  for (const supported of SUPPORTED_DURATIONS) {
    const diff = Math.abs(duration - supported)
    if (diff < minDiff) {
      minDiff = diff
      nearest = supported
    }
  }

  return nearest
}

/**
 * Auto-split BODY segments that exceed word limit
 * BODY segments are splittable - content can be divided into multiple visuals
 * FORE, PEAK, CTA are NOT splittable - they have fixed purposes
 *
 * IMPORTANT: Split segments use only supported durations (5s, 8s, 10s)
 */
function autoSplitOverlimitSegments(
  segments: any[],
  language: string
): { segments: any[], splits_applied: number } {
  const result: any[] = []
  let splitsApplied = 0

  for (const segment of segments) {
    const segmentType = (segment.type || '').toUpperCase()

    // Only BODY segments are splittable
    const isSplittable = segmentType.startsWith('BODY')

    if (!isSplittable) {
      // HOOK, FORE, PEAK, CTA, LOOP-END - cannot split, add as-is
      result.push(segment)
      continue
    }

    const scriptText = segment.script_text || ''
    const duration = segment.duration_seconds || 8
    const maxWords = getMaxWordsForDuration(duration, language)
    const actualWords = countWords(scriptText)

    if (actualWords <= maxWords) {
      // Within limit, no split needed
      result.push(segment)
      continue
    }

    // SPLIT NEEDED
    console.log(`[AutoSplit] ${segment.segment_id} (${segment.type}) has ${actualWords}/${maxWords} words, splitting...`)
    splitsApplied++

    // Split script text by sentences
    const sentences = scriptText.match(/[^.!?]+[.!?]+/g) || [scriptText]

    if (sentences.length < 2) {
      // Can't split - single long sentence, just log warning and add as-is
      console.warn(`[AutoSplit] Cannot split ${segment.type} - single sentence. Needs manual edit.`)
      result.push({
        ...segment,
        _word_limit_warning: `Cannot auto-split: ${actualWords}/${maxWords} words in single sentence`
      })
      continue
    }

    // Split roughly in half by sentences
    const midpoint = Math.ceil(sentences.length / 2)
    const part1 = sentences.slice(0, midpoint).join(' ').trim()
    const part2 = sentences.slice(midpoint).join(' ').trim()

    // Calculate word counts for each part
    const words1 = countWords(part1)
    const words2 = countWords(part2)

    // Use supported durations only (5s, 8s, 10s)
    // Each split segment gets 5s minimum, or 8s if original was 8s+
    const baseSplitDuration = duration >= 8 ? 5 : 5  // Default to 5s per split

    // Check if 5s is enough for each part, otherwise use 8s
    const max5s = getMaxWordsForDuration(5, language)
    const duration1 = words1 <= max5s ? 5 : 8
    const duration2 = words2 <= max5s ? 5 : 8

    // Create two segments
    const baseType = segment.type
    const segmentA = {
      ...segment,
      segment_id: `${segment.segment_id}a`,
      type: `${baseType}a`,
      duration_seconds: duration1,
      script_text: part1,
      visual_direction: segment.visual_direction, // Keep original - will need image gen for both
    }

    const segmentB = {
      ...segment,
      segment_id: `${segment.segment_id}b`,
      type: `${baseType}b`,
      duration_seconds: duration2,
      script_text: part2,
      visual_direction: `Continuation of ${baseType}: ${segment.visual_direction?.substring(0, 100) || 'similar visual'}...`,
    }

    result.push(segmentA, segmentB)

    console.log(`[AutoSplit] Split ${baseType} into ${segmentA.type}(${words1}w/${duration1}s) + ${segmentB.type}(${words2}w/${duration2}s)`)
  }

  return { segments: result, splits_applied: splitsApplied }
}

/**
 * Recalculate all segment timings after adjustments/splits
 * Ensures timing fields are consecutive and accurate
 */
function recalculateTimings(segments: any[]): any[] {
  let currentTime = 0

  return segments.map((segment, index) => {
    const duration = segment.duration_seconds || 8
    const startTime = currentTime
    const endTime = currentTime + duration
    currentTime = endTime

    return {
      ...segment,
      segment_id: `VIDEO-${String(index + 1).padStart(3, '0')}`,
      timing: `${startTime}-${endTime}s`
    }
  })
}

/**
 * Check for strict limit violations (FORE, PEAK, CTA that are still over limit)
 * These cannot be auto-fixed and need manual attention
 */
function checkStrictViolations(segments: any[], language: string): string[] {
  const violations: string[] = []
  const STRICT_SEGMENTS = ['FORE', 'PEAK', 'CTA', 'LOOP-END']

  for (const segment of segments) {
    const segmentType = (segment.type || '').toUpperCase()

    // Only check strict segments (non-splittable)
    if (!STRICT_SEGMENTS.some(s => segmentType.includes(s))) continue

    const scriptText = segment.script_text || ''
    const duration = segment.duration_seconds || 8
    const maxWords = getMaxWordsForDuration(duration, language)
    const actualWords = countWords(scriptText)

    if (actualWords > maxWords) {
      violations.push(`${segment.type}: ${actualWords}/${maxWords} words (+${actualWords - maxWords} over)`)
    }
  }

  return violations
}

/**
 * Normalize all segment durations to supported values (5s, 8s, 10s)
 * This ensures no segment has an unsupported duration like 3s, 4s, 6s, etc.
 */
function normalizeDurations(segments: any[]): any[] {
  return segments.map(segment => {
    const currentDuration = segment.duration_seconds || 8

    // If already a supported duration, keep it
    if ([5, 8, 10].includes(currentDuration)) {
      return segment
    }

    // Snap to nearest supported duration
    const normalizedDuration = snapToSupportedDuration(currentDuration)

    if (normalizedDuration !== currentDuration) {
      console.log(`[NormalizeDuration] ${segment.type}: ${currentDuration}s → ${normalizedDuration}s`)
    }

    return {
      ...segment,
      duration_seconds: normalizedDuration
    }
  })
}

/**
 * Auto-shorten over-limit segments using Gemini (single batch call)
 * Rewrites all segments that exceed their word limit to fit exactly.
 */
async function autoShortenOverlimitSegments(
  segments: any[],
  language: string,
  supabase: any
): Promise<{ segments: any[]; shortened_count: number }> {
  // Collect all over-limit segments
  const overLimit: { index: number; segment: any; maxWords: number; actualWords: number }[] = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const scriptText = seg.script_text || ''
    if (!scriptText.trim()) continue
    const duration = seg.duration_seconds || 8
    const maxWords = getMaxWordsForDuration(duration, language)
    const actualWords = countWords(scriptText)
    if (actualWords > maxWords) {
      overLimit.push({ index: i, segment: seg, maxWords, actualWords })
    }
  }

  if (overLimit.length === 0) {
    return { segments, shortened_count: 0 }
  }

  console.log(`[AutoShorten] ${overLimit.length} segments over limit, calling Gemini to shorten...`)

  // Build a batch prompt for all over-limit segments
  const langInstructions: Record<string, string> = {
    indonesian: 'Gunakan gaya bahasa casual Gen-Z Indonesia (gue/lo, BUKAN saya/kamu). Padat dan impactful.',
    hindi: 'Casual Hinglish style (tum/yaar). Concise and impactful.',
    english: 'Casual, punchy English. Concise and impactful.',
    french: 'Style décontracté, percutant. Concis et impactant.',
  }
  const langInstruction = langInstructions[language] || langInstructions.english

  const batchItems = overLimit.map((item, idx) => (
    `[${idx + 1}] Segment ${item.segment.type || 'UNKNOWN'} (${item.segment.duration_seconds}s):
Current (${item.actualWords} words): "${item.segment.script_text}"
Target: MAX ${item.maxWords} words`
  )).join('\n\n')

  const prompt = `Rewrite each script below to fit within its word limit. Keep the original meaning and tone.
${langInstruction}

Rules:
- Output ONLY the rewritten scripts, numbered [1], [2], etc.
- Each MUST be AT or UNDER its MAX word count
- Do NOT add any explanations, just the rewritten text
- Maintain the same emotional tone and key message

${batchItems}`

  try {
    const result = await callGeminiHybrid(supabase, [
      { role: 'user', content: prompt }
    ], { temperature: 0.5, maxTokens: 2048 })

    if (!result.success || !result.content) {
      console.warn(`[AutoShorten] ⚠️ Gemini call failed: ${result.error}`)
      return { segments, shortened_count: 0 }
    }

    // Parse response — expect numbered lines like [1] text here
    const responseLines = result.content.trim().split('\n')
    const shortened: Record<number, string> = {}

    let currentNum = -1
    let currentText = ''

    for (const line of responseLines) {
      const match = line.match(/^\[(\d+)\]\s*(.*)/)
      if (match) {
        // Save previous if any
        if (currentNum >= 0 && currentText.trim()) {
          shortened[currentNum] = currentText.trim()
        }
        currentNum = parseInt(match[1])
        currentText = match[2] || ''
      } else if (currentNum >= 0) {
        // Continuation line
        currentText += ' ' + line.trim()
      }
    }
    // Save last one
    if (currentNum >= 0 && currentText.trim()) {
      shortened[currentNum] = currentText.trim()
    }

    // Apply shortened scripts
    const updatedSegments = [...segments]
    let appliedCount = 0

    for (let idx = 0; idx < overLimit.length; idx++) {
      const shortenedText = shortened[idx + 1]
      if (!shortenedText) continue

      const newWordCount = countWords(shortenedText)
      const item = overLimit[idx]

      // Only apply if actually shorter or within limit
      if (newWordCount <= item.maxWords) {
        updatedSegments[item.index] = {
          ...updatedSegments[item.index],
          script_text: shortenedText
        }
        appliedCount++
        console.log(`[AutoShorten] ✅ ${item.segment.type}: ${item.actualWords} → ${newWordCount} words (max ${item.maxWords})`)
      } else {
        console.warn(`[AutoShorten] ⚠️ ${item.segment.type}: Gemini returned ${newWordCount} words (max ${item.maxWords}), skipping`)
      }
    }

    console.log(`[AutoShorten] Applied ${appliedCount}/${overLimit.length} shortenings`)
    return { segments: updatedSegments, shortened_count: appliedCount }

  } catch (err) {
    console.error(`[AutoShorten] Error: ${err}`)
    return { segments, shortened_count: 0 }
  }
}

/**
 * Main post-processing function that applies all word limit fixes
 */
async function postProcessWordLimits(segments: any[], language: string, supabase?: any): Promise<PostProcessingResult> {
  console.log('[PostProcess] Starting word limit post-processing...')

  // Step 0: Normalize all durations to supported values first
  let processedSegments = normalizeDurations(segments)

  // Step 1: Adjust HOOK duration if needed (will use 5s or 8s only)
  const hookResult = adjustHookDuration(processedSegments, language)
  processedSegments = hookResult.segments

  // Step 1.5: Merge thin BODY segments (< 5 words) into adjacent segments
  let mergedCount = 0
  const MIN_WORDS_PER_SEGMENT = 5
  let mergedSegments: any[] = []
  for (let i = 0; i < processedSegments.length; i++) {
    const seg = processedSegments[i]
    const segType = (seg.type || '').toUpperCase()
    const wordCount = countWords(seg.script_text || '')
    const isBodySegment = segType.startsWith('BODY') || segType === 'FORE' || segType === 'PEAK'

    // Only merge thin BODY/FORE/PEAK segments, never merge HOOK/CTA/LOOP-END
    if (isBodySegment && wordCount < MIN_WORDS_PER_SEGMENT && wordCount > 0) {
      // Try to merge into the NEXT body segment, or PREVIOUS if no next
      const nextIdx = processedSegments.findIndex((s, j) => j > i && ['BODY', 'FORE', 'PEAK'].some(t => (s.type || '').toUpperCase().startsWith(t)))
      const prevBodyIdx = [...mergedSegments].reverse().findIndex(s => ['BODY', 'FORE', 'PEAK'].some(t => (s.type || '').toUpperCase().startsWith(t)))
      const prevIdx = prevBodyIdx >= 0 ? mergedSegments.length - 1 - prevBodyIdx : -1

      if (nextIdx >= 0) {
        // Prepend thin segment's script to next segment
        const nextSeg = processedSegments[nextIdx]
        nextSeg.script_text = `${seg.script_text} ${nextSeg.script_text}`.trim()
        // Add thin segment's duration to next segment (cap at 10s)
        nextSeg.duration_seconds = Math.min(10, (nextSeg.duration_seconds || 5) + (seg.duration_seconds || 5))
        console.log(`[PostProcess] Merged thin segment ${seg.segment_id} (${wordCount}w) → next ${nextSeg.segment_id}`)
        mergedCount++
        continue // Skip adding this segment
      } else if (prevIdx >= 0) {
        // Append thin segment's script to previous body segment
        const prevSeg = mergedSegments[prevIdx]
        prevSeg.script_text = `${prevSeg.script_text} ${seg.script_text}`.trim()
        prevSeg.duration_seconds = Math.min(10, (prevSeg.duration_seconds || 5) + (seg.duration_seconds || 5))
        console.log(`[PostProcess] Merged thin segment ${seg.segment_id} (${wordCount}w) → prev ${prevSeg.segment_id}`)
        mergedCount++
        continue // Skip adding this segment
      }
    }
    mergedSegments.push(seg)
  }
  if (mergedCount > 0) {
    processedSegments = mergedSegments
    // Renumber segment IDs after merge
    processedSegments = recalculateTimings(processedSegments)
    console.log(`[PostProcess] Merged ${mergedCount} thin segments (< ${MIN_WORDS_PER_SEGMENT} words)`)
  }

  // Step 2: Auto-split over-limit BODY segments (will use 5s or 8s per split)
  const splitResult = autoSplitOverlimitSegments(processedSegments, language)
  processedSegments = splitResult.segments

  // Step 3: Recalculate timings after all adjustments
  processedSegments = recalculateTimings(processedSegments)

  // Step 4: Final normalization to ensure all durations are valid
  processedSegments = normalizeDurations(processedSegments)

  // Step 5: Auto-shorten remaining over-limit segments via Gemini
  let shortenedCount = 0
  if (supabase) {
    const shortenResult = await autoShortenOverlimitSegments(processedSegments, language, supabase)
    processedSegments = shortenResult.segments
    shortenedCount = shortenResult.shortened_count
  }

  // Step 6: Deterministic hard-trim — guaranteed enforcement (no LLM needed)
  let hardTrimCount = 0
  processedSegments = processedSegments.map((segment: any) => {
    const scriptText = segment.script_text || ''
    const duration = segment.duration_seconds || 5
    const maxWords = getMaxWordsForDuration(duration, language)
    const wordCount = countWords(scriptText)

    if (wordCount > maxWords && scriptText.length > 0) {
      // Split into words (preserving original spacing/punctuation)
      const words = scriptText.trim().split(/\s+/)
      // Keep only maxWords words
      let trimmed = words.slice(0, maxWords).join(' ')
      // Clean trailing punctuation fragments
      trimmed = trimmed.replace(/[,;:\-–—]\s*$/, '').trim()
      // Ensure ends with proper punctuation
      if (!/[.!?]$/.test(trimmed)) {
        trimmed += '!'
      }
      console.log(`[PostProcess] Hard-trim ${segment.segment_id}: ${wordCount} → ${countWords(trimmed)} words (max ${maxWords})`)
      segment.script_text = trimmed
      hardTrimCount++
    }
    return segment
  })
  if (hardTrimCount > 0) {
    console.log(`[PostProcess] Hard-trimmed ${hardTrimCount} segments to enforce word limits`)
  }

  // Step 7: Check for remaining strict violations
  const strictViolations = checkStrictViolations(processedSegments, language)

  // Log summary
  console.log(`[PostProcess] Summary:`)
  console.log(`  - Thin segments merged: ${mergedCount}`)
  console.log(`  - HOOK adjusted: ${hookResult.adjusted}`)
  console.log(`  - BODY splits: ${splitResult.splits_applied}`)
  console.log(`  - Auto-shortened: ${shortenedCount}`)
  console.log(`  - Strict violations: ${strictViolations.length}`)
  if (strictViolations.length > 0) {
    console.warn(`[PostProcess] ⚠️ Strict limit violations (need manual fix):`)
    strictViolations.forEach(v => console.warn(`    - ${v}`))
  }

  return {
    segments: processedSegments,
    hook_adjusted: hookResult.adjusted,
    body_splits: splitResult.splits_applied,
    strict_violations: strictViolations
  }
}
