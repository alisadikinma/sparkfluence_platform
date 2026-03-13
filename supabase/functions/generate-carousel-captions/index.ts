import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { callLLM } from '../_shared/apiKeyRotation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Platform-specific constraints
const PLATFORM_SPECS: Record<string, {
  name: string;
  charLimit: number;
  hashtagLimit: number;
  tone: string;
  guidelines: string;
}> = {
  instagram: {
    name: 'Instagram',
    charLimit: 2200,
    hashtagLimit: 30,
    tone: 'engaging, visual-first, emoji-rich',
    guidelines: `
- Start with a hook line (question, bold statement, or emoji opener)
- Use line breaks for readability (max 5 paragraphs)
- Place hashtags at the end, separated by a line break
- Mix popular + niche hashtags (15-20 recommended)
- Include CTA: "Save this", "Share with someone who needs this", "Follow for more"
- Use 3-5 relevant emojis throughout (not excessive)`,
  },
  tiktok: {
    name: 'TikTok',
    charLimit: 4000,
    hashtagLimit: 5,
    tone: 'casual, trendy, Gen-Z friendly',
    guidelines: `
- Short and punchy — first line IS the hook
- Use trending phrases and casual language
- Only 3-5 hashtags (quality over quantity)
- Include #fyp or #foryou if relevant
- Conversational tone, like talking to a friend
- Can reference "swiping" through the carousel`,
  },
  linkedin: {
    name: 'LinkedIn',
    charLimit: 3000,
    hashtagLimit: 5,
    tone: 'professional, insightful, value-driven',
    guidelines: `
- Open with a thought-provoking statement or statistic
- Use professional language but avoid jargon
- Structure: Hook → Story/Insight → Takeaway → CTA
- 3-5 hashtags max (industry-specific)
- End with a question to drive engagement
- No emojis or minimal (1-2 max, professional ones like 💡📊)`,
  },
  threads: {
    name: 'Threads',
    charLimit: 500,
    hashtagLimit: 3,
    tone: 'conversational, authentic, brief',
    guidelines: `
- Ultra-concise — get to the point fast
- Conversational and authentic voice
- 1-3 hashtags max (or none)
- Think "tweet-style" but slightly longer
- Encourage replies with open-ended questions
- Raw/unfiltered tone works best`,
  },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const body = await req.json()
    const { project_id, slides, branding, language = 'english', platforms } = body

    if (!project_id || !slides?.length) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'project_id and slides are required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Determine which platforms to generate for
    const targetPlatforms = platforms || ['instagram', 'tiktok', 'linkedin', 'threads']

    // Build slide context for the LLM
    const slideContext = slides.map((s: { slide_type: string; topic: string; text_content: string[] }, i: number) => {
      return `Slide ${i + 1} (${s.slide_type}): Topic: "${s.topic}". Text: ${s.text_content?.join(' | ') || 'visual only'}`
    }).join('\n')

    // Build branding context
    const brandingContext = branding ? `
Brand handle: ${branding.handle || 'N/A'}
Preferred hashtags: ${branding.hashtags?.join(', ') || 'N/A'}` : ''

    // Build platform instructions
    const platformInstructions = targetPlatforms.map((p: string) => {
      const spec = PLATFORM_SPECS[p]
      if (!spec) return ''
      return `
### ${spec.name} (key: "${p}")
- Character limit: ${spec.charLimit}
- Hashtag limit: ${spec.hashtagLimit}
- Tone: ${spec.tone}
- Guidelines:${spec.guidelines}`
    }).join('\n')

    const systemPrompt = `You are an expert social media copywriter specializing in carousel content.
Generate platform-specific captions for a carousel post based on the slide content below.

SLIDE CONTENT:
${slideContext}

BRANDING:
${brandingContext}

LANGUAGE: Write all captions in ${language}.

PLATFORM SPECIFICATIONS:
${platformInstructions}

OUTPUT FORMAT:
Return a valid JSON object with this exact structure:
{
  "captions": {
    "<platform_key>": {
      "caption": "The full caption text including any emojis and line breaks",
      "hashtags": ["hashtag1", "hashtag2"]
    }
  }
}

RULES:
1. Each caption MUST respect the character limit for its platform
2. Each caption MUST have a different style/tone appropriate for the platform
3. Hashtags should be returned WITHOUT the # symbol (we add it in the UI)
4. Do NOT repeat the same caption across platforms — adapt the message
5. Reference the carousel content naturally (e.g., "swipe through", "each slide shows")
6. If a brand handle is provided, incorporate it naturally (not forced)
7. Return ONLY the JSON object, no markdown fences or explanation`

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `Generate ${targetPlatforms.length} platform-specific captions for this ${slides.length}-slide carousel.` },
    ]

    const result = await callLLM(supabase, messages, {
      temperature: 0.8,
      maxTokens: 2048,
    })

    if (!result.success || !result.content) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'LLM_ERROR', message: result.error || 'Failed to generate captions' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Parse LLM response — strip markdown fences if present
    let parsed: { captions: Record<string, { caption: string; hashtags: string[] }> }
    try {
      const cleaned = result.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'PARSE_ERROR', message: 'Failed to parse LLM response as JSON' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Validate and enforce limits
    const captions: Record<string, { caption: string; hashtags: string[] }> = {}
    for (const platform of targetPlatforms) {
      const spec = PLATFORM_SPECS[platform]
      const generated = parsed.captions?.[platform]
      if (!spec || !generated) continue

      // Truncate caption if over limit
      let caption = generated.caption || ''
      if (caption.length > spec.charLimit) {
        caption = caption.substring(0, spec.charLimit - 3) + '...'
      }

      // Limit hashtags
      const hashtags = (generated.hashtags || []).slice(0, spec.hashtagLimit)

      captions[platform] = { caption, hashtags }
    }

    // Persist captions in project settings JSONB
    try {
      const { data: projectRow } = await supabase
        .from('carousel_projects')
        .select('settings')
        .eq('id', project_id)
        .single()

      const currentSettings = projectRow?.settings || {}
      await supabase
        .from('carousel_projects')
        .update({ settings: { ...currentSettings, captions } })
        .eq('id', project_id)
    } catch {
      // Non-blocking — captions still returned in response
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          captions,
          provider: result.provider,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: String(err) } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
