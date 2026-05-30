import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callLLM, callTavilyHybrid } from '../_shared/apiKeyRotation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * validate-slide-content
 *
 * Smart 2-step verification:
 *   Step 1: LLM vision classifies slide → decides if web search is needed
 *   Step 2: Tavily web search (ONLY for factual claims that need verification)
 *
 * Slide types that auto-pass (no Tavily needed):
 *   - Hook slides (curiosity gap, emotional grab)
 *   - Bridging/foreshadow slides (FOMO, teaser)
 *   - CTA slides (action-focused)
 *   - Opinion, experience, common knowledge
 *   - List titles, section headers
 *
 * Slides that require Tavily verification:
 *   - Statistics, numbers, percentages
 *   - Named entity claims (product specs, company data)
 *   - Historical facts and dates
 *   - Scientific or technical claims
 *   - Direct quotes attributed to someone
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image_url } = await req.json();

    if (!image_url) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_IMAGE_URL', message: 'image_url is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Step 1: LLM vision — classify slide + extract claim if needed ────
    console.log(`[validate-slide-content] Step 1: Classifying slide content...`);

    const extractResult = await callLLM(
      supabase,
      [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: image_url },
            },
            {
              type: 'text',
              text: `Analyze this carousel slide image. Classify what type of content it is and whether it contains verifiable factual claims.

Return JSON only (no markdown, no code blocks):
{
  "slide_type": "hook|foreshadow|body|peak|cta|opinion",
  "needs_verification": true/false,
  "reason": "brief explanation why verification is/isn't needed",
  "claim": "the specific factual statement (null if no claim)",
  "claim_type": "statistic|named_entity|date|scientific|product_spec|quote|none",
  "search_query": "search query to verify (null if needs_verification=false)"
}

SLIDE TYPE CLASSIFICATION:
- "hook": Pattern interrupt, curiosity gap, emotional grab, attention-catching headline. Example: "I FOUND A GLITCH IN INSTAGRAM'S SYSTEM"
- "foreshadow": Bridge/teaser slide creating FOMO, "wait until you see...", "most people don't know..."
- "body": Main content slide with information, data, facts, explanations
- "peak": Data-heavy slide with statistics, comparisons, charts
- "cta": Call-to-action, engagement prompt, "follow for more", "save this"
- "opinion": Personal experience, tips, advice, subjective statements

NEEDS_VERIFICATION = true ONLY when slide contains:
- Specific statistics, numbers, percentages
- Named entity claims about a real company/product/person
- Historical facts with specific dates
- Scientific or technical claims
- Direct quotes attributed to a real person

NEEDS_VERIFICATION = false when:
- Hook/attention slide with no specific data
- Bridging/foreshadow slide (teaser, no facts delivered)
- CTA slide (action-focused, no facts)
- Opinion, personal experience, advice, tips
- Common knowledge ("AI is getting smarter")
- Exaggeration for effect ("this tool replaced my $5000 employee")
- List titles, section headers
- Branded content showing tools/products WITHOUT specific unverifiable claims`,
            },
          ],
        },
      ],
      { temperature: 0.1, maxTokens: 400 },
    );

    console.log(`[validate-slide-content] Step 1 provider: ${extractResult.provider}`);

    if (!extractResult.success) {
      console.log(`[validate-slide-content] Step 1 FAILED: ${extractResult.error}`);
      return jsonResponse({
        status: 'valid',
        slide_type: 'unknown',
        claim: null,
        claim_type: null,
        needs_verification: false,
        reason: 'Could not analyze image — auto-passing',
        evidence: null,
        source_url: null,
        confidence: 0,
        provider: extractResult.provider,
      });
    }

    // Parse LLM response
    let extracted: any = {};
    try {
      const cleaned = extractResult.content!.replace(/```json\n?|\n?```/g, '').trim();
      extracted = JSON.parse(cleaned);
    } catch {
      console.log(`[validate-slide-content] Step 1 parse failed. Raw: ${extractResult.content?.slice(0, 200)}`);
      return jsonResponse({
        status: 'valid',
        slide_type: 'unknown',
        claim: null,
        claim_type: null,
        needs_verification: false,
        reason: 'Could not parse analysis — auto-passing',
        evidence: null,
        source_url: null,
        confidence: 0,
        provider: extractResult.provider,
      });
    }

    // ── Auto-pass: no verification needed ────────────────────────────────
    if (!extracted.needs_verification) {
      console.log(`[validate-slide-content] Auto-pass: ${extracted.slide_type} — ${extracted.reason}`);
      return jsonResponse({
        status: 'valid',
        slide_type: extracted.slide_type || 'unknown',
        claim: extracted.claim || null,
        claim_type: extracted.claim_type || null,
        needs_verification: false,
        reason: extracted.reason || `${extracted.slide_type} slide — no factual verification needed`,
        evidence: null,
        source_url: null,
        confidence: 1,
        provider: extractResult.provider,
      });
    }

    // ── Step 2: Tavily web search — only for slides that need it ─────────
    console.log(`[validate-slide-content] Step 2: Verifying "${extracted.search_query}" via Tavily...`);

    const searchResult = await callTavilyHybrid(supabase, extracted.search_query, {
      maxResults: 5,
      searchDepth: 'basic',
    });

    console.log(`[validate-slide-content] Step 2 provider: tavily | results: ${searchResult.results?.length || 0} | error: ${searchResult.error || 'none'}`);

    if (searchResult.error || !searchResult.success || searchResult.results.length === 0) {
      console.log(`[validate-slide-content] No search results — marking unverifiable`);
      return jsonResponse({
        status: 'unverifiable',
        slide_type: extracted.slide_type || 'body',
        claim: extracted.claim,
        claim_type: extracted.claim_type || null,
        needs_verification: true,
        reason: extracted.reason || 'Contains factual claim',
        evidence: searchResult.error ? `Search error: ${searchResult.error}` : 'Web search returned no results for this claim.',
        source_url: null,
        confidence: 0,
        provider: extractResult.provider,
      });
    }

    // ── Confidence scoring ───────────────────────────────────────────────
    const results = searchResult.results;
    const topResult = results[0];

    const evidenceParts: string[] = [];
    for (let i = 0; i < Math.min(3, results.length); i++) {
      const r = results[i];
      if (r.title || r.content) {
        evidenceParts.push(r.title + (r.content ? ' — ' + r.content.slice(0, 150) : ''));
      }
    }
    const evidence = evidenceParts[0] || '';

    let confidence = 0;
    if (results.length >= 1) confidence += 0.3;
    if (results.length >= 2) confidence += 0.2;
    if (results.length >= 3) confidence += 0.1;
    if (topResult.score && topResult.score > 0.5) confidence += 0.2;
    if (topResult.content && topResult.content.length > 50) confidence += 0.2;
    confidence = Math.min(1, Math.round(confidence * 100) / 100);

    const status = confidence >= 0.3 ? 'valid' : 'unverifiable';

    console.log(`[validate-slide-content] Verdict: ${status} | confidence: ${confidence} | claim: "${extracted.claim?.slice(0, 80)}"`);

    return jsonResponse({
      status,
      slide_type: extracted.slide_type || 'body',
      claim: extracted.claim,
      claim_type: extracted.claim_type || null,
      needs_verification: true,
      reason: extracted.reason || 'Contains factual claim',
      evidence,
      source_url: topResult.url,
      confidence,
      provider: extractResult.provider,
    });

  } catch (err: any) {
    console.error('[validate-slide-content] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

function jsonResponse(data: Record<string, any>) {
  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
