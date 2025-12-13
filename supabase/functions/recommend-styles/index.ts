import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Available creative DNA styles
const AVAILABLE_STYLES = [
  "chill-humorist",
  "energetic-storyteller", 
  "informative-expert",
  "authentic-relatable",
  "bold-provocative",
  "minimalist-aesthetic",
  "motivational-coach",
  "quirky-creative",
  "professional-polished",
  "community-builder"
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { interest, profession, platforms, objectives, niches, language } = await req.json()

    console.log('[RECOMMEND-STYLES] Request:', { interest, profession, platforms, niches })

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!geminiApiKey) {
      // Fallback to random recommendations if no API key
      console.log('[RECOMMEND-STYLES] No API key, using fallback')
      const shuffled = [...AVAILABLE_STYLES].sort(() => 0.5 - Math.random())
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            recommended: shuffled.slice(0, 3),
            source: 'fallback'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build prompt for Gemini
    const prompt = buildPrompt({ interest, profession, platforms, objectives, niches, language })

    // Call Gemini 2.0 Flash
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 256
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[RECOMMEND-STYLES] Gemini error:', errorText)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    console.log('[RECOMMEND-STYLES] Gemini response:', text)

    // Parse recommended style IDs from response
    const recommended = parseRecommendedStyles(text)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          recommended,
          source: 'gemini'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[RECOMMEND-STYLES] Error:', error)
    
    // Fallback on error
    const shuffled = [...AVAILABLE_STYLES].sort(() => 0.5 - Math.random())
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          recommended: shuffled.slice(0, 3),
          source: 'fallback'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function buildPrompt(params: {
  interest?: string
  profession?: string
  platforms?: string[]
  objectives?: string[]
  niches?: string[]
  language?: string
}): string {
  const { interest, profession, platforms, objectives, niches } = params

  return `You are a content creator style advisor.

Based on this creator's profile, recommend exactly 3 creative DNA styles that would best suit their content.

CREATOR PROFILE:
- Interest/Passion: ${interest || 'Not specified'}
- Profession: ${profession || 'Not specified'}
- Target Platforms: ${platforms?.join(', ') || 'Not specified'}
- Content Objectives: ${objectives?.join(', ') || 'Not specified'}
- Selected Niches: ${niches?.join(', ') || 'Not specified'}

AVAILABLE STYLES (choose exactly 3 from this list):
1. chill-humorist - Relaxed, humorous, but still relevant
2. energetic-storyteller - Enthusiastic and inspiring
3. informative-expert - Educational and authoritative
4. authentic-relatable - Genuine and down-to-earth
5. bold-provocative - Daring and thought-provoking
6. minimalist-aesthetic - Clean and visually refined
7. motivational-coach - Uplifting and empowering
8. quirky-creative - Unique and unconventional
9. professional-polished - Sophisticated and refined
10. community-builder - Collaborative and inclusive

RULES:
- Return ONLY the 3 style IDs, one per line
- No explanations, no numbering, no extra text
- Most suitable style first

RESPONSE FORMAT (exactly like this):
motivational-coach
energetic-storyteller
authentic-relatable`
}

function parseRecommendedStyles(text: string): string[] {
  // Extract style IDs from response
  const lines = text.trim().split('\n').map(line => line.trim().toLowerCase())
  
  const recommended: string[] = []
  
  for (const line of lines) {
    // Check if line matches any available style
    const matchedStyle = AVAILABLE_STYLES.find(style => 
      line.includes(style) || line === style
    )
    
    if (matchedStyle && !recommended.includes(matchedStyle)) {
      recommended.push(matchedStyle)
    }
    
    if (recommended.length >= 3) break
  }

  // Fallback if parsing failed
  if (recommended.length < 2) {
    console.log('[RECOMMEND-STYLES] Parsing failed, using defaults')
    return ['authentic-relatable', 'energetic-storyteller', 'informative-expert']
  }

  return recommended
}
