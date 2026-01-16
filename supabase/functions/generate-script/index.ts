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
import { getCorsHeaders } from '../_shared/cors.ts'

// Legacy corsHeaders for backward compatibility (will be replaced with dynamic CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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
      const shortenPrompt = shortenLang === 'indonesian'
        ? `Tulis ulang script berikut menjadi TEPAT ${target_words} kata. Pertahankan pesan utama dan konteks penting. Gunakan gaya bahasa casual Gen-Z Indonesia (gue/lo, BUKAN saya/kamu). Buat sepadat dan seimpactful mungkin dalam ${target_words} kata.

PENTING: Output HARUS tepat ${target_words} kata, tidak kurang tidak lebih. Hitung kata dengan teliti.

Script asli:
"${script}"

Script baru (TEPAT ${target_words} kata):`
        : `Rewrite the following script to EXACTLY ${target_words} words. Keep the main message and important context. Make it as impactful and engaging as possible within ${target_words} words.

IMPORTANT: Output MUST be exactly ${target_words} words, no more no less. Count words carefully.

Original script:
"${script}"

New script (EXACTLY ${target_words} words):`;

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
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
            { model: 'gemini-1.5-flash', temperature: 0.7, maxTokens: 500 }
          )

          if (geminiRetryResult.success && geminiRetryResult.content) {
            const shortenedScript = geminiRetryResult.content.trim().replace(/^["']|["']$/g, '')
            return new Response(
              JSON.stringify({ success: true, shortened_script: shortenedScript }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        console.error('[Shorten] All providers failed')
        return new Response(
          JSON.stringify({ success: false, error: 'All API providers failed. Please try again later.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (err) {
        console.error('[Shorten] Error:', err)
        return new Response(
          JSON.stringify({ success: false, error: 'Shorten failed: ' + (err instanceof Error ? err.message : 'Unknown') }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
            { model: 'gemini-1.5-flash', temperature: 0.7, maxTokens: 4000 }
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
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            } catch (parseErr) {
              console.error('[Translate] Gemini retry JSON parse error:', parseErr)
            }
          }
        }

        console.error('[Translate] All providers failed')
        return new Response(
          JSON.stringify({ success: false, error: 'All API providers failed. Please try again later.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (err) {
        console.error('[Translate] Error:', err)
        return new Response(
          JSON.stringify({ success: false, error: 'Translate failed: ' + (err instanceof Error ? err.message : 'Unknown') }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (!content || !input_type) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing required fields' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================
    // SECURITY: Sanitize all user inputs before processing
    // ============================================================
    const sanitizedContent = sanitizePromptInput(content, 5000)
    if (!sanitizedContent) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Content is empty or invalid' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================
    // BUILD PROMPTS WITH STATIC KNOWLEDGE (NO DB QUERIES!)
    // ============================================================

    // Build DNA style guide if enabled
    const dnaStyles = use_dna_tone && creative_dna && Array.isArray(creative_dna) ? creative_dna : null
    console.log(`[Script] DNA Tone: ${use_dna_tone ? 'ENABLED' : 'disabled'}${dnaStyles ? ` (${dnaStyles.length} styles)` : ''}`)

    const baseSystemPrompt = buildSystemPrompt(selectedLanguage, selectedDuration, dnaStyles, selectedVideoModel)
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
    // CALL LLM (Gemini PRIMARY, OpenRouter FALLBACK, Gemini RETRY)
    // ============================================================

    let generatedText: string = ''
    let llmSource = 'unknown'
    let lastError = ''

    // Try Gemini first (FAST - ~3-8 seconds)
    console.log('[LLM] Trying Gemini 2.0 Flash (primary)...')
    const geminiResult = await callGeminiHybrid(
      supabase,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        model: 'gemini-2.0-flash',
        temperature: 0.6,
        maxTokens: 4096
      }
    )

    if (geminiResult.success && geminiResult.content) {
      console.log(`[LLM] Gemini success (source: ${geminiResult.source})`)
      generatedText = geminiResult.content
      llmSource = `gemini-${geminiResult.source}`
    } else {
      // Fallback to OpenRouter if Gemini fails
      console.log('[LLM] Gemini failed:', geminiResult.error)
      lastError = geminiResult.error || 'Gemini failed'
      console.log('[LLM] Trying OpenRouter fallback...')

      const openRouterResult = await callOpenRouterHybrid(
        supabase,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        {
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          temperature: 0.6,
          maxTokens: 4096
        }
      )

      if (openRouterResult.data?.choices?.[0]?.message?.content) {
        console.log(`[LLM] OpenRouter success (source: ${openRouterResult.source})`)
        generatedText = openRouterResult.data.choices[0].message.content
        llmSource = `openrouter-${openRouterResult.source}`
      } else {
        // OpenRouter also failed - try Gemini one more time with different model
        console.log('[LLM] OpenRouter failed:', openRouterResult.error)
        lastError = openRouterResult.error || 'OpenRouter failed'
        console.log('[LLM] Retrying with Gemini 1.5 Flash...')

        const geminiRetry = await callGeminiHybrid(
          supabase,
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          {
            model: 'gemini-1.5-flash',  // Try different model
            temperature: 0.6,
            maxTokens: 4096
          }
        )

        if (geminiRetry.success && geminiRetry.content) {
          console.log(`[LLM] Gemini retry success (source: ${geminiRetry.source})`)
          generatedText = geminiRetry.content
          llmSource = `gemini-retry-${geminiRetry.source}`
        } else {
          // All providers failed
          console.error('[LLM] All providers failed')
          console.error('[LLM] Gemini error:', geminiResult.error)
          console.error('[LLM] OpenRouter error:', openRouterResult.error)
          console.error('[LLM] Gemini retry error:', geminiRetry.error)
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================================
// PROMPT BUILDERS (Using Static Knowledge)
// ============================================================================

function buildSystemPrompt(language: string, duration: string, dnaStyles: string[] | null = null, videoModel: string = 'sora-2'): string {
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
    // Sora 2.0: Fewer segments with longer durations (max 15s/segment)
    segmentCount = duration === '30s' ? 4 : duration === '60s' ? 5 : 7
  }
  
  const structureGuide = getStructureByDuration(duration, videoModel, language)
  
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
   - CREATOR: HOOK, CTA, LOOP-END (creator talking to camera)
   - B-ROLL: FORE, BODY-1, BODY-2, BODY-3, PEAK (illustrative visuals)

4. EACH SEGMENT MUST HAVE:
   - segment_id: "VIDEO-001", "VIDEO-002", etc.
   - type: HOOK/FORE/BODY-1/BODY-2/BODY-3/PEAK/CTA
   - timing: "0-5s", "5-10s", etc.
   - duration_seconds: integer
   - shot_type: "CREATOR" or "B-ROLL"
   - emotion: Curiosity/Shock/Intrigue/Awe/Tension/Resolution/Urgency
   - transition: Cut/Jump-Cut/Zoom-In/Zoom-Out/Flash-Cut/Whip-Pan
   - script_text: The actual spoken script
   - visual_direction: 50-80 words describing the visual (MANDATORY LENGTH!)
   - creator_costume: (ONLY FOR CREATOR SHOTS) Outfit/clothing that matches the topic theme
   - creator_appearance: (ONLY FOR CREATOR SHOTS) Generic face description matching country + topic profession

5. SCRIPT LANGUAGE: ${langConfig.name}
   Style: ${langConfig.style}
   Example tone: "${langConfig.example}"

6. HOOK REQUIREMENTS (MOST IMPORTANT):
   - Must stop the scroll in first 3 seconds
   - Use pattern interrupt, curiosity gap, or shocking statement
   - Include contrast (before/after, problem/solution)

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

9. VISUAL DIRECTION REQUIREMENTS (50-80 WORDS EACH):
   - For CREATOR: facial expression, gesture, energy level, eye contact, background
   - For B-ROLL: main subject, composition, lighting mood, motion, text overlays

10. CREATOR COSTUME REQUIREMENTS (MANDATORY FOR CREATOR SHOTS):
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

11. CREATOR APPEARANCE (FALLBACK FOR NO-AVATAR USERS):
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
3. Each visual_direction MUST be 50-80 words
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
    
    // Find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      let parsed: any
      
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch (jsonError) {
        // JSON might be truncated - try to fix it
        console.log('[Parser] JSON parse failed, attempting to fix truncated JSON...')
        let fixedJson = jsonMatch[0]
        
        // Count open/close braces and brackets
        const openBraces = (fixedJson.match(/\{/g) || []).length
        const closeBraces = (fixedJson.match(/\}/g) || []).length
        const openBrackets = (fixedJson.match(/\[/g) || []).length
        const closeBrackets = (fixedJson.match(/\]/g) || []).length
        
        // Add missing closing brackets/braces
        fixedJson += ']'.repeat(Math.max(0, openBrackets - closeBrackets))
        fixedJson += '}'.repeat(Math.max(0, openBraces - closeBraces))
        
        // Try parsing again
        try {
          parsed = JSON.parse(fixedJson)
        } catch {
          // Still failing - try more aggressive fix
          // Find last complete segment and close the JSON
          const lastCompleteSegment = fixedJson.lastIndexOf('},"VIDEO-')
          if (lastCompleteSegment > 0) {
            fixedJson = fixedJson.substring(0, lastCompleteSegment + 1) + '}'
            parsed = JSON.parse(fixedJson)
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
- visual_direction MUST be 50-80 words
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
    "visual_direction": "50-80 words describing the visual scene in detail..."
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
        model: 'meta-llama/llama-3.3-70b-instruct:free',
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
