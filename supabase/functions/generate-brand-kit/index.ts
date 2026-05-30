import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callLLM } from '../_shared/apiKeyRotation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { niche, audience, vibe, color_preference } = await req.json();

    if (!niche) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_NICHE', message: 'Niche is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!vibe || !Array.isArray(vibe) || vibe.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_VIBE', message: 'At least 1 vibe is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const colorNote = color_preference
      ? `User has a preference for colors in the ${color_preference} family. Use this as inspiration for at least the "Safe" variant.`
      : 'No color preference — choose colors that fit the niche and vibe.';

    const systemPrompt = `You are a brand identity designer. Generate 3 brand kit options for a social media content creator.

RULES:
- Output STRICT JSON only (no markdown, no code blocks, no explanation)
- Each kit has: variant, label, description, colors (5-color palette), fontFamily (from curated list), fontWeight, watermark config, text presets
- The 3 variants MUST be: "safe" (industry standard), "bold" (high contrast, daring), "contrast" (unexpected twist)
- Colors must be valid hex (#RRGGBB)
- fontFamily MUST be one of: Inter, Poppins, Montserrat, DM Sans, Nunito, Space Grotesk, Oswald, Open Sans, Roboto, Quicksand, Playfair Display, Lora, Cormorant, Merriweather, Bebas Neue, Righteous, Anton, Archivo Black, Russo One, Teko

COLOR PALETTE (5 colors per kit):
- primary: headlines, main brand color
- secondary: background/cards
- accent: text/contrast
- highlight: CTAs/badges
- muted: subtitles, secondary text

WATERMARK:
- opacity: 10-50 (number, default 30)
- position: "center" | "bottom-right" | "bottom-left" | "top-right"
- icon_size: "small" | "medium" | "large"

TEXT PRESETS:
- headline: { fontSize: 48, fontWeight: 900, color: <accent>, shadow: true, strokeWidth: 0, strokeColor: "#000000" }
- subtitle: { fontSize: 24, fontWeight: 600, color: <muted>, shadow: false }
- cta: { fontSize: 28, fontWeight: 800, bgColor: <highlight>, textColor: <secondary>, color: <secondary>, borderRadius: 8 }
- pagination: { fontSize: 14, fontWeight: 400, color: <muted>, format: "[N]/[TOTAL]" }

Ensure headline.color uses the accent from the SAME kit's palette, subtitle.color uses muted, cta.bgColor uses highlight, cta.textColor uses secondary.`;

    const userPrompt = `Generate 3 brand kits for:
- Niche: ${niche}
- Target Audience: Age=${audience?.ageGroup || 'millennial'}, Gender=${audience?.gender || 'all'}, Income=${audience?.income || 'mid'}
- Vibe: ${vibe.join(', ')}
- ${colorNote}

Output format (STRICT JSON, no markdown):
{
  "kits": [
    {
      "variant": "safe",
      "label": "Kit Name",
      "description": "One-sentence description",
      "colors": { "primary": "#...", "secondary": "#...", "accent": "#...", "highlight": "#...", "muted": "#..." },
      "fontFamily": "Inter",
      "fontWeight": "700",
      "watermark": { "opacity": 30, "position": "center", "icon_size": "medium" },
      "textPresets": {
        "headline": { "fontSize": 48, "fontWeight": 900, "color": "#...", "shadow": true, "strokeWidth": 0, "strokeColor": "#000000" },
        "subtitle": { "fontSize": 24, "fontWeight": 600, "color": "#...", "shadow": false },
        "cta": { "fontSize": 28, "fontWeight": 800, "bgColor": "#...", "textColor": "#...", "color": "#...", "borderRadius": 8 },
        "pagination": { "fontSize": 14, "fontWeight": 400, "color": "#...", "format": "[N]/[TOTAL]" }
      }
    },
    { "variant": "bold", ... },
    { "variant": "contrast", ... }
  ]
}`;

    const result = await callLLM(supabase, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.8, maxTokens: 4096 });

    if (!result.success || !result.content) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'LLM_ERROR', message: result.error || 'AI generation failed' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Parse JSON from LLM response (strip markdown fences if any)
    let parsed;
    try {
      let cleaned = result.content.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'PARSE_ERROR', message: 'Failed to parse AI response as JSON' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!parsed.kits || !Array.isArray(parsed.kits) || parsed.kits.length < 3) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_RESPONSE', message: 'AI returned invalid kit structure' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, kits: parsed.kits, provider: result.provider }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
