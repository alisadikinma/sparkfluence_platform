import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sanitizePromptInput, sanitizeLanguage, sanitizeUserId } from '../_shared/inputSanitizer.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

// ============================================================================
// Direct LLM calls
// ============================================================================

async function callGemini(prompt: string, apiKey: string, timeoutMs: number): Promise<{ content: string | null; error: string | null }> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.85, maxOutputTokens: 2500 },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return { content: null, error: `HTTP ${res.status}: ${errBody.slice(0, 150)}` };
    }
    const data = await res.json();
    return { content: data?.candidates?.[0]?.content?.parts?.[0]?.text || null, error: null };
  } catch (e: any) {
    return { content: null, error: e.name === 'TimeoutError' || e.name === 'AbortError' ? 'timeout' : e.message };
  }
}

async function callOpenRouter(msgs: Array<{ role: string; content: string }>, apiKey: string, model: string, timeoutMs: number): Promise<{ content: string | null; error: string | null }> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://sparkfluence.studio',
        'X-Title': 'Sparkfluence',
      },
      body: JSON.stringify({ model, messages: msgs, temperature: 0.85, max_tokens: 2500 }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return { content: null, error: `HTTP ${res.status}: ${errBody.slice(0, 150)}` };
    }
    const data = await res.json();
    return { content: data?.choices?.[0]?.message?.content || null, error: null };
  } catch (e: any) {
    return { content: null, error: e.name === 'TimeoutError' || e.name === 'AbortError' ? 'timeout' : e.message };
  }
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
    // 1. Fetch EVERYTHING in parallel: trending, history, and ALL API keys
    // ====================================================================
    const [trendingResult, historyResult, geminiPoolRows, orPoolRows] = await Promise.all([
      supabase.from('trending_topics').select('keyword, source, volume_score')
        .eq('country', country).gt('expires_at', new Date().toISOString())
        .order('volume_score', { ascending: false }).limit(15)
        .then(({ data }) => data || []).catch(() => []),
      user_id
        ? supabase.from('user_topic_history').select('topic_title')
            .eq('user_id', user_id).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
            .limit(20).then(({ data }) => (data || []).map((r: any) => r.topic_title)).catch(() => [])
        : Promise.resolve([]),
      // Fetch ALL active keys directly (faster than RPC, gets all keys)
      supabase.from('api_keys_pool').select('api_key')
        .eq('provider', 'gemini').eq('is_active', true).eq('is_exhausted', false)
        .order('priority').order('usage_count')
        .then(({ data }) => (data || []).map((r: any) => r.api_key)).catch(() => []),
      supabase.from('api_keys_pool').select('api_key')
        .eq('provider', 'openrouter').eq('is_active', true).eq('is_exhausted', false)
        .order('priority').order('usage_count')
        .then(({ data }) => (data || []).map((r: any) => r.api_key)).catch(() => []),
    ]);

    // Collect keys: Gemini from pool only (env key is compromised), OpenRouter pool + env
    const orEnvKey = Deno.env.get('OPENROUTER_API_KEY') || null;
    const geminiKeys = geminiPoolRows as string[];
    const orKeys = [...new Set([...orPoolRows, orEnvKey].filter(Boolean))] as string[];

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

    console.log(`[Topics] Setup done in ${Date.now() - startTime}ms. Keys: gemini=${geminiKeys.length}, or=${orKeys.length}, trends=${trendingKeywords.length}`);

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
3. If trending keywords relate to "${kw}", incorporate them (tag source)
4. Each needs hook angle + 2-3 hashtags
5. Tag source: google/tiktok/youtube/news/ai_creative
6. Language: ${langMap[language] || 'English'}
7. Return ONLY JSON

FORMAT: {"topics":[{"title":"...","description":"...","trending_source":"google|tiktok|youtube|news|ai_creative","trending_keyword":"...|null","hashtags":["#tag1","#tag2"]}]}`;

      userPrompt = `${topicCount} topics about: "${kw}"`;
      if (batch > 1) userPrompt += `. Batch ${batch}, different angles.`;
      userPrompt += ' JSON only.';
    } else {
      // ── DEFAULT MODE: use DNA + Niche preferences ──
      systemPrompt = `You are a viral content strategist. Generate ${topicCount} video topics.
DATE: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
${batch > 1 ? `BATCH ${batch} — generate COMPLETELY DIFFERENT topics.` : ''}${trendingSection}${exclusionSection}

CRITICAL RULES:
1. EVERY topic MUST be DIRECTLY relevant to these niches: ${niches.join(', ')}
2. Interest: ${interest}. Tone: ${dnaStyles.join(', ')}
3. ONLY use trending keywords if they MATCH the user's niches. IGNORE trending keywords that are unrelated to the niches (e.g. if niche is "Technology", ignore fitness/travel/food trends)
4. If no trending keyword matches the niches, generate ALL topics as "ai" source — do NOT force irrelevant trends
5. Each needs hook angle + 2-3 hashtags relevant to the niche
6. Tag source: google/tiktok/youtube/news (ONLY if trending keyword is relevant) or ai_creative
7. Language: ${langMap[language] || 'English'}
8. Return ONLY JSON

FORMAT: {"topics":[{"title":"...","description":"...","trending_source":"google|tiktok|youtube|news|ai_creative","trending_keyword":"...|null","hashtags":["#tag1","#tag2"]}]}`;

      userPrompt = `${topicCount} topics for: ${interest} (${niches.join(', ')}), style: ${dnaStyles.join(', ')}`;
      if (profession) userPrompt += `, profession: ${profession}`;
      if (batch > 1) userPrompt += `. Batch ${batch}, different angles.`;
      userPrompt += ' JSON only.';
    }

    // ====================================================================
    // 3. Call LLM with deadline awareness
    // ====================================================================
    let content: string | null = null;
    let usedProvider = 'unknown';
    const errors: string[] = [];
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    const msgs = [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }];

    const remainingMs = () => DEADLINE_MS - (Date.now() - startTime);

    // Try Gemini keys (403 errors are instant, real calls ~5-10s)
    for (const key of geminiKeys) {
      if (content || remainingMs() < 5000) break;
      const timeout = Math.min(10000, remainingMs() - 3000);
      if (timeout < 3000) break;
      const r = await callGemini(fullPrompt, key, timeout);
      if (r.content) { content = r.content; usedProvider = 'gemini'; }
      else errors.push(`Gemini: ${r.error}`);
    }
    if (geminiKeys.length === 0) errors.push('Gemini: no keys');

    // Try OpenRouter — use fast model first (8B), fallback to 70B
    const orModels = ['meta-llama/llama-3.1-8b-instruct', 'meta-llama/llama-3.3-70b-instruct'];
    if (!content && remainingMs() > 5000) {
      outer: for (const model of orModels) {
        for (const key of orKeys) {
          if (content || remainingMs() < 4000) break outer;
          const timeout = Math.min(12000, remainingMs() - 2000);
          if (timeout < 3000) break outer;
          const r = await callOpenRouter(msgs, key, model, timeout);
          if (r.content) { content = r.content; usedProvider = `openrouter:${model.split('/')[1]}`; break outer; }
          else errors.push(`OR(${model.split('/')[1]}): ${r.error}`);
        }
      }
      if (orKeys.length === 0) errors.push('OpenRouter: no keys');
    }

    if (!content) {
      throw new Error(`All providers failed (${Date.now() - startTime}ms): ${errors.join(' | ')}`);
    }

    console.log(`[Topics] LLM done in ${Date.now() - startTime}ms via ${usedProvider}`);

    // ====================================================================
    // 4. Parse JSON
    // ====================================================================
    // Strip markdown fences, then extract the outermost {...} block
    let jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) throw new Error('No JSON object in response');
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonStr);
    if (!parsed.topics || !Array.isArray(parsed.topics)) throw new Error('Invalid response');

    const validSources = ['google', 'tiktok', 'youtube', 'news', 'ai_creative', 'ai'];
    const topics = parsed.topics.map((t: any) => ({
      title: t.title || '',
      description: t.description || '',
      trending_source: validSources.includes(t.trending_source) ? t.trending_source : 'ai_creative',
      trending_keyword: t.trending_keyword || null,
      hashtags: Array.isArray(t.hashtags) ? t.hashtags.slice(0, 3).map((h: string) => h.startsWith('#') ? h : `#${h}`) : [],
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: { topics, batch, language, provider: usedProvider, generated_at: new Date().toISOString(),
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
