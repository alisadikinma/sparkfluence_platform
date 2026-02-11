import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callLLM } from '../_shared/apiKeyRotation.ts';
import { sanitizePromptInput, sanitizeLanguage, sanitizeUserId } from '../_shared/inputSanitizer.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

// ============================================================================
// Robust JSON parser — handles common LLM output issues
// ============================================================================

function robustParseJSON(raw: string): any {
  // Strip markdown fences
  let str = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  // Extract outermost {...} block
  const firstBrace = str.indexOf('{');
  const lastBrace = str.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found in LLM response');
  }
  str = str.substring(firstBrace, lastBrace + 1);

  // Attempt 1: Try as-is (works if LLM respected responseMimeType)
  try { return JSON.parse(str); } catch {}

  // Attempt 2: Fix common issues
  let repaired = str;
  // Fix unquoted known enum values
  repaired = repaired.replace(
    /("trending_source"\s*:\s*)(google|tiktok|youtube|news|ai_creative|ai)(\s*[,}\]])/g,
    '$1"$2"$3'
  );
  // Fix trailing commas before } or ]
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');
  // Fix newlines inside string values (replace literal newlines between quotes)
  repaired = repaired.replace(/\n/g, '\\n');
  // But don't escape newlines between structural chars
  repaired = repaired.replace(/([{}\[\],:])\s*\\n\s*/g, '$1 ');

  try { return JSON.parse(repaired); } catch {}

  // Attempt 3: Extract individual topic objects with regex
  console.log('[Topics] JSON repair failed, trying regex extraction...');
  const topicMatches = str.match(/\{[^{}]*"title"\s*:\s*"[^"]+?"[^{}]*\}/g);
  if (topicMatches && topicMatches.length > 0) {
    const topics: any[] = [];
    for (const m of topicMatches) {
      try {
        // Fix the same issues per-object
        let obj = m.replace(/,\s*\}/g, '}');
        obj = obj.replace(
          /("trending_source"\s*:\s*)(google|tiktok|youtube|news|ai_creative|ai)(\s*[,}])/g,
          '$1"$2"$3'
        );
        topics.push(JSON.parse(obj));
      } catch { /* skip malformed individual objects */ }
    }
    if (topics.length > 0) {
      console.log(`[Topics] Regex extraction recovered ${topics.length} topics`);
      return { topics };
    }
  }

  throw new Error(`JSON parse failed after all repair attempts. Raw (first 200 chars): ${str.slice(0, 200)}`);
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Auth check
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  const startTime = Date.now();
  const DEADLINE_MS = 22000; // Must respond within 22s to avoid Supabase killing us

  try {
    const body = await req.json();

    // Sanitize all user inputs before use in LLM prompts
    const interest = sanitizePromptInput(body.interest, 500);
    const profession = sanitizePromptInput(body.profession, 200);
    const niches = Array.isArray(body.niches)
      ? body.niches.map((n: any) => sanitizePromptInput(String(n), 100)).filter(Boolean).slice(0, 10)
      : [];
    const objectives = Array.isArray(body.objectives)
      ? body.objectives.map((o: any) => sanitizePromptInput(String(o), 100)).filter(Boolean).slice(0, 10)
      : [];
    const dnaStyles = Array.isArray(body.dnaStyles)
      ? body.dnaStyles.map((s: any) => sanitizePromptInput(String(s), 100)).filter(Boolean).slice(0, 10)
      : [];
    const language = sanitizeLanguage(body.language);
    const count = Math.min(Math.max(Number(body.count) || 6, 1), 10);
    const ALLOWED_COUNTRIES = ['ID', 'US', 'IN', 'FR'];
    const country = ALLOWED_COUNTRIES.includes(body.country) ? body.country : 'ID';
    const batch = Math.min(Math.max(Number(body.batch) || 1, 1), 20);
    const exclude_titles = Array.isArray(body.exclude_titles)
      ? body.exclude_titles.map((t: any) => sanitizePromptInput(String(t), 200)).filter(Boolean).slice(0, 50)
      : [];
    const user_id = sanitizeUserId(body.user_id);
    const search_keyword = sanitizePromptInput(body.search_keyword, 300);

    const isKeywordSearch = !!(search_keyword && search_keyword.trim());

    // Default mode requires interest/niches/dna. Keyword search mode doesn't.
    if (!isKeywordSearch && (!interest || !niches?.length || !dnaStyles?.length)) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_PARAMS', message: 'Interest, niches, and DNA styles are required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // ====================================================================
    // 1. Fetch trending + history in parallel
    // ====================================================================
    const [trendingResult, historyResult] = await Promise.all([
      supabase.from('trending_topics').select('keyword, source, volume_score')
        .eq('country', country).gt('expires_at', new Date().toISOString())
        .order('volume_score', { ascending: false }).limit(15)
        .then(({ data }) => data || []).catch(() => []),
      user_id
        ? supabase.from('user_topic_history').select('topic_title')
            .eq('user_id', user_id).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
            .limit(20).then(({ data }) => (data || []).map((r: any) => r.topic_title)).catch(() => [])
        : Promise.resolve([]),
    ]);

    let trendingKeywords = trendingResult as Array<{ keyword: string; source: string; volume_score: number }>;
    let trendingSource = 'database';

    // RSS fallback only for batch 1 and only if DB empty (skip for load-more)
    if (trendingKeywords.length === 0 && batch === 1) {
      try {
        const res = await fetch(`https://trends.google.com/trending/rss?geo=${country}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const xml = await res.text();
          const titles = (xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) || [])
            .map(m => (m.match(/<!\[CDATA\[(.*?)\]\]>/) || [])[1] || '')
            .filter(t => t && t !== 'Daily Search Trends' && t.length > 2)
            .slice(0, 10);
          trendingKeywords = titles.map(k => ({ keyword: k, source: 'google', volume_score: 50 }));
        }
      } catch { /* ignore */ }
      trendingSource = 'rss_fallback';
    }

    const allExclusions = [...new Set([...historyResult, ...exclude_titles])];

    console.log(`[Topics] Setup done in ${Date.now() - startTime}ms. trends=${trendingKeywords.length}, exclusions=${allExclusions.length}`);

    // ====================================================================
    // 2. Build LLM prompt
    // ====================================================================
    const topicCount = Math.min(Math.max(count, 1), 10);
    const langMap: Record<string, string> = { indonesian: 'Bahasa Indonesia', english: 'English', hindi: 'Hindi (Devanagari)', french: 'French' };

    let trendingSection = '';
    if (trendingKeywords.length > 0) {
      trendingSection = `\nTRENDING NOW (${country}):\n` + trendingKeywords.slice(0, 10).map(t => `- [${t.source.toUpperCase()}] ${t.keyword}`).join('\n');
    }

    let exclusionSection = '';
    if (allExclusions.length > 0) {
      exclusionSection = `\nDO NOT repeat: ${allExclusions.slice(0, 15).map(t => `"${t}"`).join(', ')}`;
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (isKeywordSearch) {
      // ── KEYWORD SEARCH MODE: ignore DNA/Niche, focus on keyword ──
      const kw = search_keyword.trim();
      systemPrompt = `You are a viral content strategist. Generate ${topicCount} video topics about "${kw}".
DATE: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
${batch > 1 ? `BATCH ${batch} — generate COMPLETELY DIFFERENT topics.` : ''}${trendingSection}${exclusionSection}

RULES:
1. ALL ${topicCount} topics MUST be about "${kw}" — explore different angles, perspectives, subtopics
2. Do NOT limit to any specific niche — be creative and broad
3. If trending keywords relate to "${kw}", incorporate them and tag their source
4. Each needs hook angle + 2-3 hashtags
5. trending_source MUST be one of these exact strings: "google", "tiktok", "youtube", "news", "ai_creative"
6. If topic uses a trending keyword, set trending_source to its origin. Otherwise use "ai_creative"
7. Language: ${langMap[language] || 'English'}
8. Return ONLY valid JSON

EXAMPLE:
{"topics":[{"title":"Example Title","description":"Short desc","trending_source":"ai_creative","trending_keyword":null,"hashtags":["#tag1","#tag2"]}]}`;

      userPrompt = `${topicCount} topics about: "${kw}"`;
      if (batch > 1) userPrompt += `. Batch ${batch}, different angles.`;
      userPrompt += ' JSON only.';
    } else {
      // ── DEFAULT MODE: use DNA + Niche preferences ──
      const trendingCount = Math.min(Math.ceil(topicCount * 0.5), trendingKeywords.length);

      systemPrompt = `You are a viral content strategist. Generate EXACTLY ${topicCount} video topics.
DATE: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
${batch > 1 ? `BATCH ${batch} — generate COMPLETELY DIFFERENT topics.` : ''}${trendingSection}${exclusionSection}

MANDATORY STRUCTURE — follow this EXACTLY:
- Topics 1-${trendingCount}: MUST use a trending keyword from the list above. Set "trending_source" to the keyword's source (google/tiktok/youtube/news). Set "trending_keyword" to the keyword used. Creatively connect it to the niche.
- Topics ${trendingCount + 1}-${topicCount}: Pure niche topics. Set "trending_source" to "ai_creative". Set "trending_keyword" to null.

NICHE CONNECTION EXAMPLES:
- Niche "Technology" + trending "Champions League" → "AI Prediksi Juara UCL 2026 — Siapa yang Menang?" (trending_source: "google", trending_keyword: "Champions League")
- Niche "Business" + trending "livebringfans" → "Cara Monetisasi Live TikTok — Fans Jadi Customer" (trending_source: "tiktok", trending_keyword: "livebringfans")

RULES:
1. ALL topics MUST be relevant to these niches: ${niches.join(', ')}
2. Interest: ${interest}. Tone: ${dnaStyles.join(', ')}
3. Each needs hook angle + 2-3 hashtags
4. trending_source MUST be one of: "google", "tiktok", "youtube", "news", "ai_creative"
5. Language: ${langMap[language] || 'English'}
6. Return ONLY valid JSON, EXACTLY ${topicCount} topics

OUTPUT FORMAT:
{"topics":[{"title":"...","description":"...","trending_source":"google","trending_keyword":"Champions League","hashtags":["#tag1","#tag2"]},{"title":"...","description":"...","trending_source":"ai_creative","trending_keyword":null,"hashtags":["#tag1","#tag2"]}]}`;

      userPrompt = `${topicCount} topics for: ${interest} (${niches.join(', ')}), style: ${dnaStyles.join(', ')}`;
      if (profession) userPrompt += `, profession: ${profession}`;
      if (batch > 1) userPrompt += `. Batch ${batch}, different angles.`;
      userPrompt += ' JSON only.';
    }

    // ====================================================================
    // 3. Call LLM (OR primary → Gemini fallback, auto rotation)
    // ====================================================================
    const msgs = [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }];

    const llmResult = await callLLM(supabase, msgs, { temperature: 0.85, maxTokens: 2500 });

    if (!llmResult.success || !llmResult.content) {
      throw new Error(`All providers failed (${Date.now() - startTime}ms): ${llmResult.error}`);
    }

    const content = llmResult.content;
    console.log(`[Topics] LLM done in ${Date.now() - startTime}ms via ${llmResult.provider}`);

    // ====================================================================
    // 4. Parse JSON (with robust repair)
    // ====================================================================
    const parsed = robustParseJSON(content);
    if (!parsed.topics || !Array.isArray(parsed.topics)) throw new Error('Invalid response: no topics array');

    const validSources = ['google', 'tiktok', 'youtube', 'news', 'ai_creative', 'ai'];

    // Build keyword→source lookup for post-processing correction
    const keywordSourceMap = new Map<string, string>();
    for (const tk of trendingKeywords) {
      keywordSourceMap.set(tk.keyword.toLowerCase(), tk.source);
    }

    const topics = parsed.topics.map((t: any) => {
      let source = validSources.includes(t.trending_source) ? t.trending_source : 'ai_creative';
      let keyword = t.trending_keyword || null;

      // Post-processing: if LLM specified a trending_keyword, match it to actual source from DB
      if (keyword) {
        const dbSource = keywordSourceMap.get(keyword.toLowerCase());
        if (dbSource) source = dbSource;
      }

      // Post-processing: if LLM said ai/ai_creative but title/description contains a trending keyword, fix it
      if (source === 'ai_creative' || source === 'ai') {
        const titleLower = (t.title || '').toLowerCase();
        const descLower = (t.description || '').toLowerCase();
        for (const [kw, kwSource] of keywordSourceMap) {
          if (titleLower.includes(kw) || descLower.includes(kw)) {
            source = kwSource;
            keyword = kw;
            break;
          }
        }
      }

      return {
        title: t.title || '',
        description: t.description || '',
        trending_source: source,
        trending_keyword: keyword,
        hashtags: Array.isArray(t.hashtags) ? t.hashtags.slice(0, 3).map((h: string) => h.startsWith('#') ? h : `#${h}`) : [],
      };
    });

    const sourceDist = topics.reduce((acc: Record<string, number>, t: any) => { acc[t.trending_source] = (acc[t.trending_source] || 0) + 1; return acc; }, {} as Record<string, number>);
    console.log(`[Topics] Source distribution: ${JSON.stringify(sourceDist)}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: { topics, batch, language, provider: llmResult.provider, generated_at: new Date().toISOString(),
          trending_source: trendingSource, trending_count: trendingKeywords.length, exclusion_count: allExclusions.length,
          search_keyword: isKeywordSearch ? search_keyword.trim() : null,
          timing_ms: Date.now() - startTime },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`Error (${Date.now() - startTime}ms):`, error);
    return new Response(
      JSON.stringify({ success: false, error: { code: 'GENERATION_ERROR', message: error.message || 'Failed to generate topics' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
