# Sparkfluence - Claude Project Instructions

## ⚠️ CRITICAL RULES (NON-NEGOTIABLE)

### 🔒 Permission Required Before Execution
```
❌ NEVER DO WITHOUT EXPLICIT PERMISSION:
├── Access, restart, or modify ANY server (VPS, Supabase, backend)
├── Deploy Edge Functions (supabase functions deploy)
├── Run database migrations (supabase db push)
├── Execute npm/pip install commands
├── Start/stop any services
├── Push to git repositories
└── Run any command that affects production

✅ DEFAULT BEHAVIOR:
├── All changes are LOCAL FILES ONLY
├── Propose changes → Wait for approval → Then execute
├── Show command/code → Ask "Mau saya jalankan?" → Wait for "Ya"
└── If unsure, ASK FIRST
```

### 💬 User Confirmation via AskUserQuestion (MANDATORY)
```
RULE: ALWAYS use AskUserQuestion tool for confirmations and decisions.
      NEVER ask confirmation via plain text — use the modal popup instead.

WHEN to use AskUserQuestion:
├── Before executing risky/destructive actions (deploy, push, install, delete)
├── When presenting options for user to choose (A/B/C choices)
├── Design/flow confirmation before implementation
├── Any "Mau saya jalankan?" or "Setuju?" moment
├── Brainstorm results → confirm before proceeding to plan/execute
└── Any decision point that blocks further progress

WHY: AskUserQuestion shows a clean modal popup with checkboxes/options,
     making it easier for the user to respond vs. scrolling through text.
     It also clearly separates decision points from output noise.

FORMAT TIPS:
├── Use clear, concise question titles
├── Provide selectable options when there are discrete choices
├── Include "Something else" option when appropriate
├── Keep descriptions short — user can see the context above
└── For yes/no confirmations, still use AskUserQuestion (not plain text)
```

### 📝 CLAUDE.md Self-Maintenance (MANDATORY)
```
After EVERY code change session, you MUST:
1. Review CLAUDE.md sections affected by the changes
2. Update any outdated information (models, tables, functions, flows, configs)
3. Add new tables/functions/features if they were created
4. Remove references to deleted/deprecated code

WHY: This file is the SINGLE SOURCE OF TRUTH for the next session.
     If CLAUDE.md is outdated, the next session will repeat mistakes,
     use wrong models, miss new features, or break existing logic.

WHEN to update:
├── New table/column added          → Update "Key Tables" + "Database Conventions"
├── New Edge Function               → Update "Key Directories" + "Generation Flow"
├── AI model changed                → Update "AI Model Priority" + "Providers in Pool"
├── New Python source/feature       → Update "Trending Topics System" section
├── New frontend route/component    → Update "v3.0 Chat-Based UI" section
├── Config/env changes              → Update "Environment Variables"
├── New dependency                  → Update relevant section
└── Bug fix with learnings          → Update "Debugging Checklist"

DO NOT skip this step. DO NOT assume "it's a small change".
```

### 🖥️ Windows Environment (Command Prompt)
```
ENVIRONMENT: Windows 11
SHELL: Command Prompt (cmd.exe) — NOT PowerShell
WORKING DIR: D:\Projects\sparkfluence_platform

PATH FORMAT:
✅ D:\Projects\sparkfluence_platform\src\index.tsx
❌ /home/user/projects/sparkfluence_platform/src/index.tsx

COMMAND SYNTAX:
✅ dir /s /b *.tsx          (Windows)
❌ ls -la *.tsx             (Linux)

✅ type file.txt            (Windows)
❌ cat file.txt             (Linux)

✅ copy src.txt dst.txt     (Windows)
❌ cp src.txt dst.txt       (Linux)

✅ del file.txt             (Windows)
❌ rm file.txt              (Linux)

✅ mkdir folder             (Windows - same)
✅ cd folder                (Windows - same)

✅ set VAR=value            (Windows env var)
❌ export VAR=value         (Linux env var)

MULTILINE COMMANDS:
✅ command1 && command2     (Windows)
❌ command1 ; command2      (Linux)
```

---

## Project Overview

**Sparkfluence** — AI-powered SaaS untuk generate video viral (TikTok, Reels, Shorts).

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind + Shadcn UI |
| Backend | Supabase (PostgreSQL + pgvector + Auth + Edge Functions + Storage) |
| Video Processing | Python FastAPI + FFmpeg + Playwright (VPS) |
| AI - Script | **OpenRouter** `google/gemini-2.5-flash-lite` (text) / `google/gemini-2.5-flash` (vision) **(PRIMARY, PAID)** → Gemini 2.5 Flash direct (FREE fallback) |
| AI - Images | fal.ai: Nano Banana Edit (CREATOR) + Seedream v4 / Qwen (B-ROLL) |
| AI - Video | GeminiGen.AI: VEO 3.1 Fast HD (DEFAULT) + Grok 3 (Aurora engine) |
| AI - TTS | fal.ai: Chatterbox Turbo (voice cloning) |
| AI - Music | fal.ai: Minimax Music v2 (AI-generated BGM) |
| AI - Transcription | Groq Whisper (FREE) |

### ⚠️ AI Model Priority (NEVER GET THIS WRONG)
```
🟢 PRIMARY (PAID)  → OpenRouter (auto-detected model):
   Text-only: google/gemini-2.5-flash-lite (cheaper, faster)
   Vision/multimodal: google/gemini-2.5-flash (image_url content auto-detected)
   Used by: ALL AI features — generate-script, generate-topic-suggestions,
   generate-niche-suggestions, analyze-image, generate-video-prompt,
   rewrite-visual-direction, autoShorten, fetch_trending.py, validate-slide-content

🟡 FALLBACK (FREE)  → Gemini Direct: gemini-2.5-flash (via Google API key)
   Used ONLY when: OpenRouter keys exhausted (429/402) or unavailable
   This is a FREE tier fallback — rate limits are strict
   ⚠️ gemini-2.0-flash going away June 1, 2026 — migrated to gemini-2.5-flash

❌ NEVER treat Gemini direct as primary. OpenRouter has PAID credit = always try first.
❌ NEVER write new code that calls Gemini direct without trying OpenRouter first.
```

---

## Knowledge & Data Files Index

> **IMPORTANT:** All knowledge files are `.ts` exports (Deno cannot import `.md`).
> Before creating new knowledge files, check this index to avoid duplication.
> After creating/deleting files, update this index.

### Knowledge Files (`supabase/functions/_shared/knowledge/`)

| File | Lines | Status | Content | Imported By |
|------|-------|--------|---------|-------------|
| `08-indonesian-slang-2026.ts` | 152 | **ACTIVE** | Indonesian Gen-Z slang + particles | `prompts/slangValidator.ts` |
| `09-hindi-slang-2026.ts` | 210 | **ACTIVE** | Hindi/Hinglish slang + particles | `prompts/slangValidator.ts` |
| `10-global-english-slang-2026.ts` | 203 | **ACTIVE** | English Gen-Z slang | `prompts/slangValidator.ts` |
| `11-hook-library-2026.ts` | 300+ | **ACTIVE** | 100 hooks (5 categories), `HOOK_CATEGORY_META` (incl. `curiosity_principle`), `TOPIC_HOOK_MAP` (28 topics) | `prompts/seefluencerFramework.ts`, `prompts/scoringOptimizer.ts` |
| `12-scoring-engine.ts` | 900+ | **ACTIVE** | Retention scoring, power words (EN/ID/HI), pacing rules, benchmarks, `algorithmThresholds`, `SEGMENT_WEIGHT_IN_OVERALL`, sources [A]-[R]. **Recalibrated 2026-02-22:** word density optimal 60-95%, `hasForeshadow()` expanded, cross-segment defaults raised. | Client-side SmartCompanion + Retention Curve |
| `13-emotion-lexicon.ts` | 520 | **ACTIVE** | Word→emotion→intensity (EN/ID/HI, 200+ words each) | Client-side Emotion Arc |
| `__tests__/validate-scoring-engine.ts` | 360 | **TEST** | Validation: 38 tests, 36/38 passing (94.7%) | `npx tsx` runner |
| `ad-studio/01-advertising-psychology.ts` | 275 | **RESERVED** | Cialdini's 6 principles, cognitive biases, emotional triggers | Future: `generate-ad-script` |
| `ad-studio/02-video-ad-frameworks.ts` | 298 | **RESERVED** | AIDA/PAS/BAB/Hook-Story-Offer + timing | Future: `generate-ad-script` |
| `ad-studio/03-platform-specs.ts` | 308 | **RESERVED** | Platform-specific ad specs | Future: `generate-ad-script` |
| `ad-studio/04-audience-psychology-matrix.ts` | 349 | **RESERVED** | Gen Z/Millennial/Gen X/Boomer attention params | Future: `generate-ad-script` |
| `ad-studio/05-b2b-vs-b2c-patterns.ts` | 321 | **RESERVED** | B2B vs B2C advertising patterns | Future: `generate-ad-script` |
| `ad-studio/06-cta-conversion-optimization.ts` | 335 | **RESERVED** | CTA templates, conversion stats, placement | Future: `generate-ad-script` |
| `ad-studio/07-script-templates.ts` | 441 | **RESERVED** | Ad script templates by framework | Future: `generate-ad-script` |
| `tier3/market-intel-q1-2026.md` | 730 | **REFERENCE ONLY** | ID/IN market stats, viral case studies, cultural context | Cannot be imported (.md) |

### Prompt Builders (`supabase/functions/_shared/prompts/`)

| File | Content | Used By |
|------|---------|---------|
| `viralScriptKnowledge.ts` | PROJECT_INSTRUCTION — structural spec (output format, word limits, segment structure tables, CINEMATIC_VISUAL_GUIDE) | `generate-script` |
| `seefluencerFramework.ts` | Hook/Foreshadow/Body/CTA/PEAK strategies | `generate-script` |
| `beastMoziLayer.ts` | MrBeast pacing + Hormozi density + editing cues | `generate-script` |
| `slangValidator.ts` | Slang validation (imports 08/09/10 knowledge) | `generate-script` |
| `scriptValidator.ts` | Script structure validation | `generate-script` |
| `cinematicImageKnowledge.ts` | Image generation prompt knowledge | `generate-images` |
| `cinematicVideoKnowledge.ts` | Video generation prompt knowledge. Grok 3: `buildGrokCreatorPrompt()` (motion-only, `Speech:` lip-sync, ONE camera move) + `buildGrokBrollPrompt()` (environment motion, ambient SFX). VEO: structured cinematic prompt builder. | `generate-videos` |
| `visualEnhancer.ts` | Visual direction enhancement | `generate-images` |
| `productNamingRule.ts` | Product name detection rules | `generate-images` |
| `audioDirective.ts` | Audio/TTS prompt directives + `getLanguageLabel()` (language enforcement) + `getBRollAudioDirective(language, ...)` (off-screen narration + ZERO lip-sync) + `getCreatorAudioDirective()` (lip-sync REQUIRED) | `generate-tts`, `generate-videos` |
| `contentTypeDetector.ts` | Content type classification | `generate-script` |
| `scoringOptimizer.ts` | Scoring rules + hook-topic matching + ANTI_PATTERNS (3 failure modes) + TOPIC_HOOK_SELECTION_RULES + **Power Word Bank** (top words per language) + **Builds-on-hook Rule** (FORE must reference HOOK keywords) + **Triple Hook Coherence Rule** (all 3 hooks must share core topic keywords so FORE connects with any variant) for LLM | `generate-script` |

### Lookups (`supabase/functions/_shared/lookups/`)

| File | Lines | Content | Status |
|------|-------|---------|--------|
| `index.ts` | 145 | Re-export hub for all lookups | **ACTIVE** |
| `cinematographyLookup.ts` | 1,403 | EMOTION_MAP, shot types, camera, lighting | **ACTIVE** |
| `slangLookup.ts` | 434 | Slang arrays with virality scores | **ACTIVE** |
| `videoSpecs.ts` | 419 | Video model specifications | **ACTIVE** |
| `productKeywords.ts` | 525 | Product keyword detection data | **ACTIVE** |
| `metaphorLookup.ts` | 557 | Metaphor generation (disabled Jan 2026) | **DISABLED** |

### Config (`supabase/functions/_shared/config/`)

| File | Lines | Content |
|------|-------|---------|
| `aiModels.ts` | 1,250+ | IMAGE_MODELS, VIDEO_MODELS, TTS endpoints + params. Updated 2026-03-09: nano-banana-2/edit ($0.08), qwen-image-2/pro/edit ($0.075), seedream-v5/lite/edit ($0.035 A-ROLL); seedream-v4.5, seedream-v5-lite, qwen-image-v1 (B-ROLL) |

### Frontend Mirrors (`src/lib/knowledge/`)

| File | Mirror Of | Purpose |
|------|-----------|---------|
| `12-scoring-engine.ts` | `_shared/knowledge/12-scoring-engine.ts` | Client-side SmartCompanion (scoring, retention curve, analysis) |
| `13-emotion-lexicon.ts` | `_shared/knowledge/13-emotion-lexicon.ts` | Client-side Emotion Arc visualization + script analysis |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SPARKFLUENCE STACK                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FRONTEND (React SPA)                                       │
│  └── React 18 + TypeScript + Vite + Tailwind               │
│                         │                                   │
│                         ▼                                   │
│  SUPABASE BACKEND                                           │
│  ├── Edge Functions (Deno)                                  │
│  │   ├── generate-script (Gemini + RAG)                    │
│  │   ├── generate-images (fal.ai multi-model)              │
│  │   ├── generate-videos (VEO 3.1 / Grok 3 via GeminiGen)  │
│  │   ├── generate-tts (Chatterbox Turbo)                   │
│  │   ├── generate-music (Minimax Music v2)                 │
│  │   ├── analyze-voice (Gemini multimodal → voice anchor)  │
│  │   └── autocomplete-keywords (Google Suggest proxy)      │
│  ├── PostgreSQL + pgvector (RAG)                           │
│  └── Storage Buckets                                        │
│                         │                                   │
│                         ▼                                   │
│  PYTHON BACKEND (VPS)                                       │
│  └── FastAPI + FFmpeg + Playwright (video, subtitles, IG)  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Key Rotation System

### Overview
All LLM/API keys are stored in `api_keys_pool` table (NOT environment variables). Keys are rotated automatically with retry, usage tracking, and exhaustion handling.

### Database Table: `api_keys_pool`
```
Columns: id, provider, key_name, api_key, usage_count, usage_limit,
         limit_type, is_active, is_exhausted, priority, reset_period,
         last_reset_at, next_reset_at, notes
Index: idx_api_keys_provider(provider, is_active)
```

### DB Functions (SECURITY DEFINER)
| Function | Purpose |
|----------|---------|
| `get_available_api_key(provider)` | Returns least-used, highest-priority active key |
| `increment_api_key_usage(key_id, increment)` | Increment usage counter after success |
| `mark_api_key_exhausted(key_id)` | Temp disable on 429/402 (resets daily) |
| `deactivate_key(key_id)` | Permanent disable on leaked/compromised |
| `get_api_keys_stats(provider?)` | Usage stats per provider |
| `reset_exhausted_api_keys(provider?)` | Daily cron reset |

### TypeScript: `supabase/functions/_shared/apiKeyRotation.ts`
```typescript
// ✅ Unified LLM caller (handles OR→Gemini fallback + key rotation automatically)
callLLM(supabase, messages, options?)
// → { success, content, provider, error }
// Options: { temperature?, maxTokens?, model?, geminiModel?, geminiFirst? }
// Default: OpenRouter primary → Gemini fallback
// geminiFirst: true → Gemini primary → OpenRouter fallback
// ✅ Smart model selection: auto-detects multimodal content (image_url in messages)
//    Text-only → google/gemini-2.5-flash-lite (cheaper)
//    Vision/multimodal → google/gemini-2.5-flash (image-capable)
//    Manual `model` override always takes precedence
// ✅ Gemini fallback: gemini-2.5-flash (migrated from gemini-2.0-flash, going away June 2026)
// ✅ Supports multimodal messages (image_url content) — toGeminiParts() auto-converts
//    OpenAI-format image_url → Gemini inlineData (fetches image, base64 encodes)
// ✅ Provider logging: logs success/failure + provider used at each step

// Tavily search (auto-rotation)
callTavilyHybrid(supabase, query, options)

// Stock image search (Pexels primary → Unsplash fallback, auto-rotation)
callStockImageSearch(supabase, query, options?)
// → { success, results: StockImageResult[], total, provider }
// Options: { orientation?, perPage?, page? }

// Unsplash download tracking (required by API guidelines)
trackUnsplashDownload(supabase, downloadLocationUrl)

// Groq Whisper transcription (auto-rotation) — Edge Functions only
callGroqTranscribe(supabase, audioBlob, options?)
// → { success, data, provider, error }
```

### Python: `backend/api_key_pool.py`
```python
from api_key_pool import get_pool

pool = get_pool()

# Groq Whisper transcription with pool-based key rotation
result = await pool.transcribe_with_groq(audio_path)

# Low-level key access (for other providers)
key_id, api_key = await pool.get_key('groq')
await pool.increment_usage(key_id)    # After success
await pool.mark_exhausted(key_id)     # On 429/402
```

### Retry Flow
```
429 (Rate Limit) → markExhausted → try next key → restore after all exhausted
402 (Payment)    → markExhausted → try next key → daily reset
403 (Leaked)     → deactivateKey → NEVER use again
401/403 (Other)  → markExhausted → try next key → restore after all exhausted
200 (Success)    → incrementUsage → return result
```

### Providers in Pool
| Provider | Priority | Used By |
|----------|----------|---------|
| `openrouter` | 🟢 **PRIMARY (PAID)** — `google/gemini-2.5-flash-lite` | All edge functions via `callLLM()` (default primary) |
| `gemini` | 🟡 **FALLBACK (FREE)** — `gemini-2.0-flash` | All edge functions via `callLLM()` (auto-fallback, or primary when `geminiFirst: true`) |
| `tavily` | - | keywordExtractor (search enrichment) |
| `pexels` | 🟢 **PRIMARY** — Stock images (200 req/hour) | `callStockImageSearch()` primary, `search-stock-images`, `generate-niche-recommendations` |
| `unsplash` | 🟡 **FALLBACK** — Stock images (50 req/hour demo) | `callStockImageSearch()` fallback (requires download tracking) |
| `groq` | - | Whisper transcription — Edge: `callGroqTranscribe()`, Python: `api_key_pool.transcribe_with_groq()` |

### ⚠️ API Key Source: Pool Table vs Deno.env Secrets
```
RULE: Where a key comes from depends on whether it needs ROTATION.

🗄️ FROM api_keys_pool TABLE (via shared rotation functions):
   Used when: Multiple keys exist, need rotation on 429/402, usage tracking
   ├── openrouter    — callLLM() primary
   ├── gemini        — callLLM() fallback
   ├── tavily        — callTavilyHybrid()
   ├── pexels        — callStockImageSearch() primary (4 keys, 200 req/hr each)
   ├── unsplash      — callStockImageSearch() fallback (4 keys, 50 req/hr each)
   └── groq          — callGroqTranscribe() / api_key_pool.transcribe_with_groq()

🔑 FROM Deno.env.get() SECRETS (set via `supabase secrets set`):
   Used when: Single key, no rotation needed
   ├── FAL_AI_API_KEY         — fal.ai (images, video, TTS, music) — single key
   ├── VEO_API_KEY            — Google Veo video — single key
   ├── YOUTUBE_CLIENT_ID      — YouTube OAuth — single key
   ├── YOUTUBE_CLIENT_SECRET  — YouTube OAuth — single key
   ├── FONNTE_API_TOKEN       — WhatsApp notifications — single key
   ├── META_APP_ID            — Instagram OAuth App ID — single key
   └── META_APP_SECRET        — Instagram OAuth App Secret — single key

❌ COMMON ERROR: "No OpenRouter API key available"
   → Means: api_keys_pool has NO active openrouter keys (all exhausted or none added)
   → Fix: Check api_keys_pool table → reset_exhausted_api_keys('openrouter')
   → NOT a Deno.env secret issue — OpenRouter keys live in the POOL, not in secrets

❌ NEVER add openrouter/gemini/pexels/unsplash/groq keys to Deno.env secrets (they MUST be in pool)
❌ NEVER add fal.ai keys to api_keys_pool (they use Deno.env secrets)
```

### Migration
- Table: `supabase/baseline/schema_public_20260113.sql`
- Functions: `supabase/migrations/20260117000000_api_key_rotation_functions.sql`

---

## Trending Topics System

### Data Flow
```
External Sources → fetch_trending.py (VPS cron 8h) → trending_topics DB
                                                          ↓
User Request → generate-topic-suggestions (Edge Fn) → LLM + trending data
                                                          ↓
                                                   TopicRecommendations UI
```

### Database Tables
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `trending_topics` | 5-source trending keywords, 8h TTL | source, keyword, country, volume_score (0-100), expires_at |
| `user_topic_history` | Per-user topic selections for dedup | user_id, topic_title, trending_source, action |
| `topic_outfit_cache` | LLM outfit category cache | topic_hash (unique), category, outfit |

### 4 Trending Sources
| Source | Method | Countries |
|--------|--------|-----------|
| Google Trends | JSON API + RSS fallback | ID, US, IN, FR |
| TikTok CC | Creative Center scrape (dehydratedState) | ID, US, FR |
| YouTube | Piped/Invidious API | ID, US, IN, FR |
| Google News | RSS feed | ID, US, IN, FR |

### Backend: `backend/fetch_trending.py`
- Python script with 3-layer deduplication (normalize → fuzzy match ≥65% → merge)
- AI creative angles + trending challenges via **OpenRouter (PRIMARY)** → Gemini direct (fallback)
- Source 6: TikTok Challenges — AI-detected from hashtags + 8 evergreen base challenges → `trending_challenges` table
- CLI: `python fetch_trending.py [--country ID] [--source google|challenges] [--dry-run]`
- Cron: every 8h (00:00, 08:00, 16:00 UTC) via `backend/setup_cron.sh`
- Dependencies: `pytrends`, `feedparser`, `rapidfuzz`

### Edge Function: `generate-topic-suggestions`
- **Input:** interest, niches, objectives, dnaStyles, language, country, count, batch, exclude_titles, search_keyword
- **Modes:** Personalized (niches-based) or Keyword Search
- **LLM Chain:** OpenRouter `google/gemini-2.5-flash-lite` **(PRIMARY, PAID)** → Gemini direct **(FREE fallback)** (22s deadline)
- **Dedup:** Combines user_topic_history (30 days) + exclude_titles from Load More
- **CRITICAL RULE:** "ONLY use trending if matching user niches. IGNORE unrelated trends."
- **Output:** `{ topics: [{ title, description, trending_source, trending_keyword, hashtags }] }`

### Frontend: `TopicRecommendations` Component
- Trending chips: top 15 from DB, color-coded by source
- Autocomplete search (300ms debounce → `autocomplete-keywords` edge function)
- Topic generation: 9 initial + Load More (max 4 batches)
- Rate limiting: max 3 refreshes/60s, 30s cooldown
- Cache: localStorage `sparkfluence_scriptlab_topics_v3` (30-min TTL, niches hash validation)
- Selection recording: INSERT into `user_topic_history`

### Source Badge Colors (Tailwind)
```
google:      blue-500    | tiktok:   pink-500
youtube:     red-500     | news:     emerald-500
ai_creative: amber-500   | ai:       amber-500
```

### Types: `src/types/topic.ts`
```typescript
type TrendingSource = 'google' | 'tiktok' | 'youtube' | 'news' | 'ai_creative' | 'ai';
interface Topic { id, title, description, trending_source?, trending_keyword?, hashtags? }
SOURCE_BADGE_CONFIG: Record<TrendingSource, { label, bg, text, border }>
```

---

## v3.0 Chat-Based UI (`feat/v3-chat-redesign`)

### Layout Architecture
- `ChatLayout` wraps ALL authenticated pages (replaces old Sidebar layout)
- `ChatSidebar` — collapsible left sidebar with nav menu + session list
- `ChatHome` — new session landing page (topic input + ScriptForm + TopicRecommendations)
- `Workspace` — multi-step workspace with 3-column layout

### Route Structure
| Route | Component | Purpose |
|-------|-----------|---------|
| `/script-gen` | ChatHome | New script session |
| `/script-gen/:orderId` | Workspace | Active session |
| `/script-gen/:orderId/:step` | Workspace | Step navigation (script/images/video/studio) |
| `/creator-lab` | ChatHome | New creator session |
| `/creator-lab/:orderId` | Workspace | Active session |
| `/ad-studio` | AdStudio | Ad script tool |
| `/ad-studio/:orderId` | Workspace | Active session |
| `/carousel-images` | CarouselHome | Carousel project listing |
| `/carousel-images/:projectId` | CarouselWorkspace | Active carousel project |
| `/carousel-images/:projectId/:step` | CarouselWorkspace | Step navigation (source/generate/edit/video/publish) |
| `/settings/branding` | BrandingKit | Brand kit editor + AI wizard |
| `/settings/social-accounts` | SocialAccounts | OAuth connect/disconnect per platform |
| `/settings/social-accounts/callback` | ⚠️ **TODO** | OAuth callback handler (not yet created) |

### Workspace 2-Column Layout (1280px+)
```
Center (main workspace)            │ Right Wing — "Smart Companion" (460px)
StepBar                            │ Tab: Overview | Issues | Style
ScriptStep / ImageStep /           │ Overview: ViralityScore + RetentionCurve + EmotionArc
VideoStep / StudioStep             │ Issues: analyzeSegment() weaknesses + quick fixes
                                   │ Style: 3 hook variants (Safe/Bold/Visual) + predicted scores
```

### Smart Companion Panel
- Container: `src/screens/Workspace/components/SmartCompanion/SmartCompanion.tsx`
- 3 tabs with Framer Motion animated transitions (fade + slide, 150ms)
- **Centralized analysis**: `analysisMap` computed ONCE in SmartCompanion, passed to OverviewTab + IssuesTab
- **OverviewTab**: Reuses ViralityScore, RetentionCurve, EmotionArc. Issues banner links to Issues tab. Uses `analysisMap` for worst-segment detection. Passes `precomputedScores` to RetentionCurve for score consistency.
- **IssuesTab**: Shows only **stable** (self-contained) weaknesses — cross-segment features affect scores but NOT issue cards (prevents count flicker on hook switch). Fix preview, Apply Fix, Skip, Fix All, **Undo**. `appliedFixes: Map<string, {originalText}>` / `skippedIssues: Set` state lifted to SmartCompanion (persists across tab switches). `handleFixAll` groups fixes by segment+field, applies only highest-weight fix per group. Undo restores original text and removes ALL applied fixes for that segment (group-aware). Calls `onSaveNow()` after every fix/undo for immediate persistence.
- **StyleTab**: 3 hook variant cards (Safe=emerald, Bold=red, Visual=cyan). Predicted scores via `analyzeSegment()` (independent, scores what-if scenarios).
- **Cross-segment features** (`CROSS_SEGMENT_FEATURES` set in scriptAnalysis.ts): `builds_on_hook`, `matches_hook_category`, `emotional_match`, `mirrors_hook_energy`, `payoff_not_revealed`, `matches_funnel_stage` — these contribute to scores but don't create issue cards
- **Feature dedup**: `has_pattern_interrupt` uses its own regex (caps emphasis, direct address) + `hasForeshadow()`. `has_foreshadow` uses only `hasForeshadow()`. They are NOT identical.
- **RetentionCurve score consistency**: OverviewTab extracts scores from `analysisMap` and passes as `precomputedScores` to RetentionCurve, ensuring bar chart matches IssuesTab scores exactly
- Shared analysis: `src/screens/Workspace/utils/scriptAnalysis.ts` — exports: `analyzeSegment`, `generateQuickFixes`, `extractFeatures`, `CROSS_SEGMENT_FEATURES`
- Quick fixes: internal `smartCondense(prefix, originalText, suffix, maxWords, language)` — sentence-aware condensing that preserves meaning (strips fillers → picks best sentence → combines → fallback truncate)

### Workspace State: `WorkspaceContext.tsx`
- useReducer with 25+ actions (INIT_SESSION, SET_SCRIPT_DATA, SELECT_HOOK, EDIT_SEGMENT, etc.)
- `isDirty` flag triggers auto-save via `useSessionPersistence` (5s debounce)
- `RESTORE_SESSION` action accepts optional `markDirty: boolean` (default false) — used by location.state init to trigger auto-save
- `scriptConfirmed: true` locks all script editing
- `focusedSegmentId` used by SmartCompanion for segment focus mode (set only by explicit user actions, NOT auto-focused on mount)
- Computed helpers: `canProceedToImages`, `canProceedToVideo`, `canProceedToStudio`

### Workspace Initialization (Priority Chain)
- **DB restore** (via `useSessionPersistence`) → **location.state** (from ChatHome navigation) → **mock data** (dev/demo fallback)
- ChatHome passes real data via `navigate(path, { state: { topic, segments, hookOptions, qualityReport, videoSettings, ... } })`
- Workspace reads `location.state` via `useLocation()` — uses `mapEdgeSegments()` to convert snake_case → camelCase
- `LANG_REVERSE_MAP` converts full names ('indonesian') to short codes ('id') for WorkspaceSettings
- `isRestoring` guard (initialized `true`) prevents mock data from loading before DB check completes
- `initRef` prevents double-initialization
- `saveNow()` called immediately after location.state init for persistence

### Session Persistence
- `useChatSessions` — CRUD operations on `chat_sessions` table
- `useSessionPersistence` — auto-save (debounce 5s), restore on mount, flush on unmount. Connected in `Workspace.tsx` via `useSessionPersistence({ orderId, sessionType })`. Exposes `saveNow()` for immediate persistence (used by IssuesTab after applying/undoing fixes, and by Workspace after location.state init). Uses `needsImmediateSave` ref + useEffect to solve React closure race condition (dispatch + saveNow in same tick).
- **New session creation:** When `fetchSession(orderId)` returns null, `useSessionPersistence` auto-creates the DB row via `createSession()` so future `updateSession` calls work. `hasRestoredRef` prevents duplicate creation.
- Sessions identified by `orderId` (not UUID `id`)

### Database: `chat_sessions` Table
```sql
-- Key columns: order_id (unique), session_type, status, topic, settings (JSONB),
--   script_data (JSONB), selected_hook, script_versions (JSONB), script_confirmed,
--   image_data (JSONB), video_data (JSONB)
-- Status: draft → script_ready → images_ready → video_ready → complete
-- RLS: select/insert/update/delete_own_chat_sessions
```

### Workspace Components
| Component | Purpose |
|-----------|---------|
| `StepBar` | Visual step indicator (script → images → video → studio) |
| `SmartCompanion` | Right panel container — 3 tabs, centralized `analysisMap` |
| `OverviewTab` | ViralityScore + RetentionCurve + EmotionArc, uses `analysisMap` |
| `IssuesTab` | Stable-only weaknesses, word-limit-aware quick fixes, Fix All |
| `StyleTab` | 3 hook variant cards with predicted scores, hook switching |
| `ViralityScore` | Compact pill or expanded ring with score breakdown |
| `RetentionCurve` | SVG bar chart of per-segment retention estimate |
| `EmotionArc` | SVG line chart of emotion intensity arc + pattern detection |
| `ScriptComparison` | Word-level LCS diff between script versions |
| `ScriptStep` | Segment cards with retention borders, director chips, waveform bars |
| `ImageStep` | Image generation per segment (stub) |
| `VideoStep` | Video generation: sequential queue (1 job at a time), Supabase Realtime subscription, `syncJobStatusFromDB` on mount, `VideoPreviewModal` with play+download, segment thumbnail shows image+spinner overlay |
| `StudioStep` | Redirects to full-screen StudioEditor |

### Studio Editor (CapCut-style Video Editor)
Full-screen 3-panel editor at `/script-gen/:orderId/studio`, `/creator-lab/:orderId/studio`, `/ad-studio/:orderId/studio`.

**Architecture:**
- Entry: `src/screens/Workspace/steps/StudioEditor.tsx` — wraps `StudioProvider`, 3-panel layout
- State: `src/contexts/StudioContext.tsx` — useReducer + undo/redo history (50 max), 30+ actions. Includes `hiddenTracks: Set<string>`, `trackOrder: string[]`
- Types: `src/types/studio.ts` — SparkfluenceProject, LayerItem, CaptionTrack, etc.
- Composition: `src/lib/composition.ts` — factories, frame math, buildProjectFromSession
- Remotion: `src/remotion/VideoComposition.tsx` — renders segments, transitions, captions

**Hooks:**
| Hook | Purpose |
|------|---------|
| `useStudioLoader` | Loads project from `chat_sessions.studio_data` or builds from session data |
| `useStudioPersistence` | Auto-save (3s debounce) to `chat_sessions.studio_data`, Ctrl+S |
| `useGenerateCaptions` | Calls `generate-captions` edge function → Groq Whisper → CaptionTrack[] |
| `useFontLoader` | Dynamic Google Font loading via `<link>` injection |
| `useTrimInteraction` | Mouse-based trim handles on timeline clips |

**Components (`src/components/studio/`):**
| Component | Purpose |
|-----------|---------|
| `Timeline.tsx` | Multi-track timeline (Video, Text, TTS, BGM) with ruler + playhead + track reorder |
| `Toolbar.tsx` | Select/Split/Delete tools + undo/redo + zoom |
| `timeline/TimelineRuler.tsx` | Time ruler with tick marks |
| `timeline/TimelineTrack.tsx` | Single track row with clip rendering + drag-reorder grip + visibility toggle |
| `timeline/TimelineClip.tsx` | Draggable segment clip on track |
| `timeline/AudioClip.tsx` | Audio clip with waveform visualization |
| `timeline/Playhead.tsx` | Current frame indicator (draggable, GPU-accelerated via translateX) |
| `timeline/TransitionDiamond.tsx` | Diamond between clips for transitions |
| `panels/TransitionPicker.tsx` | Popover with 6 transition types + duration |
| `panels/AudioProperties.tsx` | Volume, fades, mute, envelope preview |
| `panels/TextTemplates.tsx` | 6 text presets + Add Text + Auto Captions button |
| `panels/TextProperties.tsx` | Full text editing (font, size, color, opacity, stroke, animation) |
| `panels/CaptionStylePicker.tsx` | 6 caption style presets (classic/bold/neon/outline/karaoke/minimal) |

**Remotion Layers (`src/remotion/layers/`):**
| Layer | Purpose |
|-------|---------|
| `SegmentRenderer.tsx` | Renders all layers for a segment (supports `skipLayerIds` for cross-segment text) |
| `VideoLayer.tsx` | Video playback layer |
| `ImageLayer.tsx` | Static image layer |
| `TextLayer.tsx` | Text overlay with animation |
| `EffectLayer.tsx` | Visual effects (particles, confetti, etc.) |
| `CaptionLayer.tsx` | Auto-generated captions with 6 styles |

**Edge Function:** `generate-captions` — Groq Whisper transcription → word-level timestamps → CaptionTrack[]

**Key Features:**
- Remotion Player preview (9:16) with bidirectional frame sync
- Multi-track timeline with zoom (Ctrl+wheel), ruler click-to-seek
- Drag-reorder segments, trim handles, split tool
- **Track reorder:** Drag grip handle (6-dot icon) to reorder tracks up/down. Uses refs (`dragSourceRef`, `dragOverRef`, `effectiveTrackOrderRef`) to avoid stale closures in native drag events. State: `trackOrder: string[]` in StudioContext, `SET_TRACK_ORDER` action.
- **Track visibility:** Per-track hide/show via eye icon. State: `hiddenTracks: Set<string>` in StudioContext, `TOGGLE_TRACK_VISIBILITY` action. Hidden tracks are disabled in both timeline rendering AND Remotion player (`VideoComposition` receives `hiddenTracks` prop). Text tracks use unique keys (`text`, `text-0`, `text-1`) so hiding one doesn't hide all.
- **Cross-segment text:** Text layers can be trimmed/moved beyond segment boundaries (negative `inFrame`, extended `outFrame`). `VideoComposition` extracts cross-segment text layers and renders them as global Remotion `Sequence` elements. `SegmentRenderer` accepts `skipLayerIds` to avoid double-rendering.
- 6 transition types (fade, slide, wipe, flip, clock-wipe, iris)
- Audio tracks (TTS, BGM, SFX) with waveform bars + volume envelope
- Auto captions via Groq Whisper with 6 style presets
- 6 text templates (Headline, Subtitle, Lower Third, Callout, Countdown, Price Tag)
- Context-sensitive right panel (segment properties / audio properties / text properties / image properties / **overlay clip properties** with Position, Size, Rotation, Opacity)
- **"Apply Style to All Text"** scoped to same segment only (not all text across project). Action includes `segmentId`.
- Imported images drag-to-timeline create **overlay layers** (not insert as segment). Pipeline media inserts as segments.
- Overlay clips: default 30% canvas size, centered, `objectFit: 'contain'` (no cropping), rotation support
- Overlay tracks render ABOVE Video track in timeline (CapCut-style ordering)
- `selectedOverlayClip` getter in StudioContext resolves overlay clip selection for properties panel
- **PlayerOverlay:** 8-point resize handles (corner = proportional + font size scale, edge = width/height only). Selection rectangle shows on **hover** (semi-transparent emerald border) AND selected (solid emerald). Resize handles + label visible on hover or selected. Searches ALL segments for visible text/image layers at current frame (not just current segment) — supports cross-segment text selection. Supports both text layers AND image/video overlay clips.
- Fullscreen player: CSS `fixed inset-0 z-[60]` overlay, toggle via `F` key or button, exit via `Esc`
- **Playhead:** Uses `transform: translateX()` + `willChange: 'transform'` for GPU-accelerated, jitter-free positioning (not `left:` which causes layout thrashing).
- Keyboard shortcuts: Space, Ctrl+Z/Shift+Z, Ctrl+S, V/S/Del, F (fullscreen), Esc (exit fullscreen), Arrow keys, Home/End
- Auto-save to `chat_sessions.studio_data` (3s debounce)
- **Media persistence:** Imported media uploaded to Supabase Storage `studio-media` bucket (not blob URLs). Stored in `project.mediaAssets[]` (type `MediaAsset` in `types/studio.ts`).
- **Export completion flow:** Export done → cleanup `studio-media` storage files → update session status to `complete` → redirect to `/planner`
- **Storage cleanup:** `cleanup_studio_media_bucket(days_old)` SQL function, scheduled weekly via pg_cron (`0 3 * * 0`)
- Migration: `supabase/migrations/20260311000000_create_studio_media_bucket.sql`

### Design System
- Color palette: warm charcoal + emerald (NOT AI purple)
- `--bg-base: #0B0E14`, `--bg-surface: #161616`, `--accent: #10B981`
- Design spec: `docs/plans/2026-02-07-bolt-new-ui-specs.md`
- Retention heatmap borders: emerald (HOOK/PEAK), amber (FORE/BODY), gray (LOOP-END)
- Glassmorphism ONLY on sticky headers/overlays/modals
- Desktop-optimized, 9:16 portrait ratio for media previews

### Segment Card Features
- Retention border (4px left edge, color by segment type)
- Word count + waveform bar (fill %, turns red if over limit)
- Director chips: `[🎥 Medium Shot]`, `[🎬 Jump Cut]`, etc.
- LOOP-END toggle: OFF → card opacity 40%, skipped in generation
- "Fix" button: AI rewrite for low-scoring segments

### Legacy Route Redirects
```
/content-curation → /script-gen    /image-generation → /creator-lab
/topic-selection  → /script-gen    /video-generation → /creator-lab
/script-lab       → /script-gen    /studio           → /creator-lab
```

---

## Carousel Image Feature (Phase 1-4 Complete)

### Architecture
- **Route:** `/carousel-images` (top-level ChatSidebar menu, `GalleryHorizontalEnd` icon)
- **Workspace:** 5 steps: Source → Generate → Edit → Video → Publish
- **Design doc:** `docs/plans/2026-03-11-carousel-image-feature-design.md`

### Components
| Component | File | Purpose |
|-----------|------|---------|
| CarouselHome | `src/screens/CarouselImages/CarouselHome.tsx` | Project listing, create/delete, search |
| CarouselWorkspace | `src/screens/CarouselImages/CarouselWorkspace.tsx` | 5-step workspace with step bar |
| SourceStep | `src/screens/CarouselImages/steps/SourceStep.tsx` | IG URL import (Python backend primary + edge fn fallback) + manual upload + drag-drop + per-image validation badges |
| GenerateStep | `src/screens/CarouselImages/steps/GenerateStep.tsx` | Comparison grid (source vs generated), AI/Manual mode |
| BrandingKit | `src/screens/Settings/BrandingKit.tsx` | Picker → Wizard → Templates → Editor views |
| VideoStep | `src/screens/CarouselImages/steps/VideoStep.tsx` | Motion preset selector, duration, video generation via GeminiGen, Realtime status |
| PublishStep | `src/screens/CarouselImages/steps/PublishStep.tsx` | 4-platform caption editor (IG/TikTok/LinkedIn/Threads), AI generation, quick schedule |

### Hooks
| Hook | File | Purpose |
|------|------|---------|
| `useBrandingKit` | `src/hooks/useBrandingKit.ts` | CRUD for `user_branding_kit` table |

### Edge Functions (ALL DEPLOYED)

| Function | Purpose |
|----------|---------|
| `generate-brand-kit` | AI Brand Wizard: `callLLM()` (temp 0.8) → 3 kit options (Safe/Bold/Contrast) |
| `fetch-instagram-media` | IG URL → oEmbed + Graph API (fallback). Frontend tries Python backend (Playwright) FIRST, edge fn is fallback. Requires OAuth token from `social_accounts` for Graph API path. |
| `analyze-carousel-source` | Stage 1 Rebrand: `callLLM()` multimodal vision (image_url content) → deep per-slide analysis with topic, contentCategory, emotionalTone, subjectReferences (4-category auto-detection), brandNames |
| `generate-carousel-images` | Stage 2 Rebrand: User-confirmed hook selection (suggest_hooks action) + 9 RAG knowledge files + prop interaction + emotional arc + WOW 6/8 gate enforcement + fal.ai image gen + Supabase Storage persistence. A-ROLL: nano-banana-edit, B-ROLL: seedream-v4 |
| `generate-carousel-captions` | Caption generation: `callLLM()` → 4 platform-specific captions (IG/TikTok/LinkedIn/Threads) with hashtags. Enforces per-platform char/hashtag limits. Persists to `carousel_projects.settings` JSONB. |
| `validate-slide-content` | Per-slide fact-check: Step 1 `callLLM()` multimodal vision (auto-selects `gemini-2.5-flash` for image_url) → extract claim + claim_type. Step 2 `callTavilyHybrid()` (web search, 5 results). Returns `valid`/`unverifiable` + `confidence` (0-1) + `provider` info. Detailed logging at each step. |
| `social-oauth-callback` | IG OAuth: code → short-lived → long-lived token (60 days) → profile → upsert `social_accounts`. Also handles refresh + disconnect. |
| `fetch-instagram-insights` | IG Insights API v21.0 → `post_analytics` + `audience_insights` tables. Modes: posts/demographics/both. |

### RAG Knowledge Files (`_shared/knowledge/carousel/`)
| File | Export | Content |
|------|--------|---------|
| `hook-science.ts` | `HOOK_SCIENCE_KNOWLEDGE` | Hook psychology, 5 categories, topic→hook mapping, engagement benchmarks |
| `visual-action-bank.ts` | `VISUAL_ACTION_BANK_KNOWLEDGE` | 5+8 expression libraries, 5 lighting presets, 15 camera variants (A/B/C) |
| `hook-formula-bank.ts` | `HOOK_FORMULA_BANK_KNOWLEDGE` | 52 viral hook formulas × 8 psychology categories |
| `prompt-formulas.ts` | `PROMPT_FORMULAS_KNOWLEDGE` | 5-paragraph Nano Banana Pro format, 12 rendering rules, 3 text overlay rules, hook scoring gate |
| `carousel-rebranding.ts` | `CAROUSEL_REBRANDING_KNOWLEDGE` | 5-step rebranding pipeline, 4 slide templates, style conversion matrix |
| `caption-copywriting.ts` | `CAPTION_COPYWRITING_KNOWLEDGE` | 4 platform caption formulas, CTA psychology, hashtag strategy |
| `cinematography-lut.ts` | `CINEMATOGRAPHY_LUT_KNOWLEDGE` | 12 emotion→setup LUTs, 7 lighting patterns, 8 film stocks |
| `prop-interaction-system.ts` | `PROP_INTERACTION_SYSTEM_KNOWLEDGE` | 12 topic→prop banks, prop×action matrix, hook→prop rules, 5-step decision tree |
| `emotional-arc.ts` | `EMOTIONAL_ARC_KNOWLEDGE` | Roller coaster intensity mapping, beat→visual treatment, mini-hook placement |

### Branding Kit
- **Route:** `/settings/branding` (also accessible from Settings page)
- **Table:** `user_branding_kit` — 1 kit per user (UNIQUE user_id), hybrid flat+JSONB
- **AI Wizard:** 4-step (Niche→Audience→Vibe→Color) → `generate-brand-kit` → 3 options
- **Templates:** 24 presets in `src/lib/brandingTemplates.ts` (12 niches × light/dark)
- **Editor:** Accordion (Identity, Colors, Typography, Watermark) + live CSS carousel preview
- **Fonts:** 20 curated Google Fonts from `CURATED_FONTS` constant

### Generation Modes
- **AI Generate** (default): Full fal.ai pipeline — analyze → prompt → generate
- **Manual Upload:** AI builds prompt only, user generates externally, uploads result
- **Per-slide hybrid:** e.g. 9 AI + 1 manual. `carousel_slides.generation_method` ('ai'|'manual')
- **AI Text toggle:** ON = 5-paragraph prompt (visual+text), OFF = 4-paragraph (visual only, text from editor)

### Comparison Grid (GenerateStep)
- 2-column: source (IG originals) left, generated/uploaded right
- Per-slide: segment type dropdown (AI auto-tagged), video toggle (HOOK+CTA default), regen, delete, view prompt, manual upload
- Global: Regenerate All, Copy All Prompts, Approve & Continue
- Collapsible advanced: reference image, creator face toggle, additional note

### Video Step (VideoStep)
- **4 Motion Presets:** Subtle Zoom (default), Dynamic Pan, Parallax Layers, Custom
- **Duration selector:** 5s / 8s (default) / 10s per slide
- **Video toggle:** Per-slide enable/disable (HOOK+CTA auto-checked)
- **Cost estimate:** X videos × $0.015 = displayed
- **Generation:** Reuses `generate-videos` edge fn with `carousel_mode: true`
- **Realtime:** Supabase postgres_changes subscription on `video_generation_jobs`
- **Preview:** Video modal with play + download on completed slides
- **Types:** `MOTION_PRESETS` config in `types/carousel.ts`

### Publish Step (PublishStep)
- **4 Platforms:** Instagram (2200 chars, 30 hashtags), TikTok (4000 chars, 5 hashtags), LinkedIn (3000 chars, 5 hashtags), Threads (500 chars, 3 hashtags)
- **Caption generation:** `generate-carousel-captions` edge fn → per-platform caption + hashtags
- **Editor:** Tab-based (IG/TikTok/LinkedIn/Threads), per-tab textarea with char/hashtag count bars
- **Quick schedule:** Datetime picker + timezone selector (account connection placeholder for Phase 3)
- **Types:** `CaptionPlatform`, `PlatformCaption`, `PLATFORM_SPECS` in `types/carousel.ts`
- **Platform colors:** Instagram=pink, TikTok=cyan, LinkedIn=blue, Threads=neutral

### Social Accounts & Scheduling (Phase 3)

- **Route:** `/settings/social-accounts` (Settings menu, Share2 icon, pink gradient)
- **Component:** `src/screens/Settings/SocialAccounts.tsx` — OAuth connect/disconnect, default toggle, token expiry status
- **Edge Function:** `social-oauth-callback` — Instagram OAuth code → short-lived token → long-lived token (60 days) → profile → page_id → upsert. TikTok/LinkedIn return NOT_IMPLEMENTED stubs.
- **OAuth Flow (Instagram):**
  1. User clicks "Connect" → redirected to `https://www.facebook.com/v21.0/dialog/oauth?...`
  2. Redirect URI: `${VITE_OAUTH_REDIRECT_ORIGIN}/settings/social-accounts/callback` (default: `https://sparkfluence.studio`)
  3. Meta redirects back with `?code=xxx` → frontend calls `social-oauth-callback` edge fn with `{ action: 'exchange_code', platform: 'instagram', code, redirect_uri }`
  4. Edge fn: code → short-lived token → long-lived token (60 days) → profile → page_id → upsert to `social_accounts`
  5. Scopes: `instagram_basic,instagram_content_publish,pages_show_list,business_management`
  6. **Meta App:** "Sparkfluence Studio" (App ID in `VITE_INSTAGRAM_APP_ID`). Use cases: "Manage messaging & content on Instagram" + "Embed Facebook, Instagram and Threads content in other websites"
  7. **⚠️ Callback route handler** (`/settings/social-accounts/callback`) — needs to be created in `index.tsx` to capture the `?code=` param and exchange it
- **Tables:**
  - `social_accounts` — Multi-account per platform (1 user → N IG/TikTok/LinkedIn). UNIQUE(user_id, platform, platform_user_id). `is_default` trigger ensures single default per platform. Encrypted `access_token`/`refresh_token`, `token_expires_at`, `ig_page_id`.
  - `scheduled_posts` — Post queue from all features (carousel/creator_lab/ad_studio). Status: pending→publishing→published/failed/cancelled. `schedule_type` (now/scheduled), timezone, retry_count.
- **Migration:** `supabase/migrations/20260312100000_social_accounts_and_scheduling.sql`
- **Secrets:** `META_APP_ID`, `META_APP_SECRET` (Deno.env — single key, no rotation needed)
- **Frontend env:** `VITE_INSTAGRAM_APP_ID` (App ID), `VITE_OAUTH_REDIRECT_ORIGIN` (default `https://sparkfluence.studio`)
- **Platforms:** Instagram (Phase 1, active OAuth), TikTok (Phase 2, "Coming Soon"), LinkedIn (Phase 3, "Coming Soon")

### Analytics Dashboard (Phase 4)

- **Dashboard Tabs:** Overview | Analytics | Scheduling | Automation (Soon) | Inbox (Soon). Tab state via URL `?tab=analytics`.
- **AnalyticsTab** (`src/screens/Dashboard/AnalyticsTab.tsx`, 1462 lines): 8-section analytics with native SVG charts (no Tremor dependency).
  - Overview Cards (4 metric cards with trend indicators)
  - Per-Post Table (sortable, filterable, paginated)
  - Slide Type Breakdown (horizontal bar chart per segment type)
  - Engagement Funnel (Impressions→Reach→Likes→Comments→Shares→Saves)
  - Time Trends (SVG line chart, toggleable metrics)
  - A/B Experiments (side-by-side comparison, significance score)
  - Engagement Heatmap (slide position 1-10, color intensity)
  - Audience Demographics (age bars, gender donut, locations, active hours)
- **SchedulingTab** (`src/screens/Dashboard/SchedulingTab.tsx`): List + Calendar view, status filter pills, real `scheduled_posts` queries with `social_accounts` join.
- **Edge Function:** `fetch-instagram-insights` — IG Insights API v21.0 → `post_analytics` + `audience_insights` tables. Modes: posts/demographics/both. Token from `social_accounts`.
- **Tables:**
  - `post_analytics` — Per-post metrics (JSONB: impressions, reach, likes, comments, shares, saves, engagement_rate). UNIQUE(social_account_id, platform_post_id). `slide_metrics` JSONB for per-slide position data.
  - `ab_experiments` — A/B test tracking: variant_a/b post refs, winner, significance_score (NUMERIC 5,4), status (active/completed/cancelled).
  - `audience_insights` — Demographics snapshots: age_distribution, gender_split, top_locations, active_hours, follower_count. UNIQUE(social_account_id, date).
- **Migration:** `supabase/migrations/20260312200000_analytics_tables.sql`
- **Types:** `src/types/analytics.ts` — PostAnalytics, ABExperiment, AudienceInsight, Demographics, row mappers, CONTENT_TYPE_CONFIG, PLATFORM_CONFIG, SLIDE_TYPE_COLORS

### Important Patterns

- **Carousel uses `projectId` for routing** (e.g. `SF-20260312-XHRJ`), NOT `orderId` like script-gen/creator-lab. DB `id` (UUID) is used for FK/queries, `projectId` (TEXT) for URL routes.
- **Edge function response access:** `supabase.functions.invoke()` returns `{ data, error }` where `data` is the full JSON body. So caption data is at `data.data.captions`, NOT `data.captions`.
- **JSONB merge pattern:** For nested settings updates, read current → shallow spread → update (see `generate-carousel-captions` caption persistence).
- **IG Import: Python backend PRIMARY, edge fn FALLBACK.** Frontend checks `VITE_BACKEND_URL` + `VITE_BACKEND_API_KEY` → calls `GET /api/instagram/media?url=...` (Playwright headless Chromium scraper). If backend unreachable, falls back to `fetch-instagram-media` edge fn (requires OAuth token from `social_accounts`). Manual upload works without either.
- **IG Import duplicate prevention:** DELETE by `project_id + shortcode` before INSERT on every re-import. `handleClearAll` resets all sources + validation state.
- **Per-slide content validation:** SourceStep auto-validates each image via `validate-slide-content` edge fn. Validation badges: green=Valid, red=Review!, amber=Kept, gray=Unverified. `validatedKeysRef` (Set) prevents re-runs. `sourceUrlsRef` + while loop ensures mid-import images are picked up. `canProceed` blocks Continue until all images have definitive status.
- **Lenis scroll fix:** `/carousel-images` MUST be in `LENIS_DISABLED_PATTERNS` in `useSmoothScroll.ts` — Lenis intercepts wheel events at `<html>` level, breaking `<main overflow-y-auto>` scroll in ChatLayout.
- **Hook selection flow:** After analysis, GenerateStep calls `generate-carousel-images` with `action: 'suggest_hooks'` → returns 3 options (PRIMARY/SECONDARY/WILDCARD). User selects before generation. Selected `hook_category` + `visual_action` passed to generation call.
- **Language setting:** SourceStep has Primary (headline) + Subtitle (secondary) language selector. Options: ID/EN/HI + "None" for monolingual. Saved to `carousel_projects.settings.language` AND `localStorage` (`sparkfluence_carousel_language`) for cross-project defaults. Passed to `generate-carousel-images` as `language_settings` → enforces bilingual text overlay (e.g., Indonesian headline + English subtitle).
- **Reload title button:** RefreshCw icon in CarouselWorkspace header, next to pencil edit. Calls `analyze-carousel-source` with HOOK slide image → extracts topic via vision → updates `carousel_projects.title`.
- **Image persistence:** Generated images now uploaded to `carousel-images` Supabase Storage bucket via `persistImageToStorage()`. Falls back to fal.ai CDN URL on upload failure. File path: `{projectId}/slide-{index}-{timestamp}.png`.
- **AI Decision badges:** After generation, `carousel_slides.analysis_data.autoDecisions` stores hookCategory, visualAction, emotionalArc, wowScore. GenerateStep renders these as colored badges on each slide card.
- **WOW gate enforcement:** `scoreWOWGate()` now enforces 6/8 minimum. If < 6, retries once with missing element feedback via `callLLM()`. Proceeds with warning if still < 6 after retry.
- **Dead code fix:** `prompt-formulas.ts` was imported but NEVER used in `buildRagContext()`. Now injected for ALL slide types (rendering rules prevent Nano Banana artifacts).

### Remaining Phases

- Phase 5: Canvas Image Editor (fabric.js) — EditStep already has ~1935 line fabric.js implementation
- Phase 6: ManyChat Automation + Inbox

---

## Sparkfluence Design System (ALWAYS APPLY)

### Color Palette
```
--bg-base:     #0B0E14   (warm charcoal — app background)
--bg-surface:  #161616   (card/panel backgrounds)
--bg-elevated: #1E1E1E   (popovers, dropdowns, modals)
--accent:      #10B981   (emerald — primary action, success, highlights)
--accent-dim:  #059669   (emerald darker — hover states)
--text-primary:   #F5F5F5
--text-secondary: #A3A3A3
--text-muted:     #737373
--border:      #262626
--border-focus: #10B981
--danger:      #EF4444
--warning:     #F59E0B
--info:        #3B82F6
```

**NEVER use AI purple (#7C3AED / violet). Sparkfluence uses emerald green.**

### Typography
- Headings: `text-lg font-semibold` to `text-2xl font-bold`
- Body: `text-sm` (14px default)
- Labels: `text-xs text-neutral-400`
- Monospace: `font-mono text-xs` (for technical data, timestamps)

### Component Patterns
```tsx
// Card
<div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">

// Primary Button
<button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">

// Ghost Button
<button className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg px-4 py-2 text-sm transition-colors">

// Glassmorphism (ONLY sticky headers, overlays, modals)
<div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800/50">

// Badge / Pill
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">

// Input
<input className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors" />
```

### Segment Retention Borders
```
HOOK / PEAK:   border-l-4 border-emerald-500
FORE / BODY:   border-l-4 border-amber-500
CTA:           border-l-4 border-blue-500
LOOP-END:      border-l-4 border-neutral-600
```

### Trending Source Badge Colors
```
google:      bg-blue-500/10    text-blue-400    border-blue-500/20
tiktok:      bg-pink-500/10    text-pink-400    border-pink-500/20
youtube:     bg-red-500/10     text-red-400     border-red-500/20
news:        bg-emerald-500/10 text-emerald-400 border-emerald-500/20
ai_creative: bg-amber-500/10   text-amber-400   border-amber-500/20
```

### Layout & Animation
- **Desktop-first**: 1440px+ primary, responsive to 1024px
- **9:16 portrait ratio**: All media previews
- **2-column workspace**: Center (flex-1) | Right (460px) at 1280px+
- **Dark-only**: No light mode toggle
- **Animation**: Framer Motion, 200-300ms, no bounce/spring
- **Icons**: lucide-react (SVG, not emoji)
- **Components**: Shadcn UI for Dialog, Popover, Select, Tooltip, Tabs

---

## Key Directories

```
D:\Projects\sparkfluence_platform\
├── src\
│   ├── components\
│   │   ├── ui\               # Shadcn components
│   │   ├── layout\           # ChatLayout, ChatSidebar, PublicLayout, Navbar
│   │   └── features\         # VoiceRecorder, ImageGeneration
│   ├── contexts\             # Auth, Onboarding, Language, Theme, Workspace
│   ├── hooks\                # useAuth, useChatSessions, useSessionPersistence, useBrandingKit
│   ├── lib\
│   │   ├── supabase.ts       # Supabase client
│   │   └── orderIdGenerator.ts
│   ├── screens\              # 30+ screens (ChatHome, Workspace, AdStudio...)
│   └── index.tsx             # App entry + routing
├── supabase\
│   ├── functions\            # Edge Functions (Deno)
│   │   ├── _shared\          # Shared utilities
│   │   │   ├── config\       # aiModels.ts (IMAGE_MODELS, VIDEO_MODELS, TTS)
│   │   │   ├── knowledge\    # Slang (08-10), hooks (11), ad-studio (01-07), carousel/ (6 RAG files)
│   │   │   ├── prompts\      # Prompt builders (seefluencer, beastMozi, slangValidator...)
│   │   │   ├── lookups\      # cinematography, slang, videoSpecs, productKeywords
│   │   │   └── apiKeyRotation.ts  # Key pool rotation logic
│   │   ├── generate-script\
│   │   ├── generate-images\
│   │   ├── generate-videos\
│   │   ├── generate-tts\
│   │   ├── generate-music\
│   │   ├── analyze-voice\               # Voice anchor analysis (Gemini multimodal)
│   │   ├── generate-topic-suggestions\  # LLM + trending
│   │   ├── fetch-trending-data\         # 5-source collector
│   │   ├── generate-brand-kit\          # AI Brand Wizard (callLLM → 3 kit options)
│   │   ├── fetch-instagram-media\       # IG URL → oEmbed → Graph API (fallback for Python backend)
│   │   ├── analyze-carousel-source\     # Stage 1 Rebrand (Gemini multimodal analysis)
│   │   ├── generate-carousel-images\    # Stage 2 Rebrand (RAG + fal.ai per-slide)
│   │   └── validate-slide-content\      # Per-slide fact-check (LLM vision + Tavily search)
│   └── migrations\
├── backend\
│   ├── main.py               # FastAPI + FFmpeg + IG Scraper (Playwright)
│   ├── api_key_pool.py       # Pool-based API key rotation (Python mirror of apiKeyRotation.ts)
│   ├── fetch_trending.py     # Trending data fetcher (cron 8h)
│   └── setup_cron.sh         # Cron job scheduler
├── docs\
│   └── plans\                # Design docs & implementation plans
└── CLAUDE.md                 # This file
```

---

## AI Model Selection (fal.ai)

### Image Generation

#### A-Roll (CREATOR shots — HOOK, CTA, LOOP-END)
All 3 support reference images (`image_urls` array) for face consistency.

| Option | Model Key | Endpoint | Cost |
|--------|-----------|----------|------|
| **Default** | `fal-nano-banana-edit` | `fal-ai/nano-banana-2/edit` | $0.08 |
| Alt 1 | `fal-qwen-image-2-pro-edit` | `fal-ai/qwen-image-2/pro/edit` | $0.075 |
| Alt 2 | `fal-seedream-v5-lite-edit` | `fal-ai/bytedance/seedream/v5/lite/edit` | $0.035 |

#### B-Roll (FORE, BODY, PEAK — no reference image)

| Option | Model Key | Endpoint | Cost |
|--------|-----------|----------|------|
| **Default** | `fal-seedream-v4` | `fal-ai/bytedance/seedream/v4/text-to-image` | $0.03 |
| Alt 1 | `fal-seedream-v4-5` | `fal-ai/bytedance/seedream/v4.5/text-to-image` | $0.04 |
| Alt 2 | `fal-seedream-v5-lite` | `fal-ai/bytedance/seedream/v5/lite/text-to-image` | $0.035 |
| Alt 3 | `fal-qwen-image` | `fal-ai/qwen-image-2/text-to-image` | $0.035 |
| Legacy | `fal-qwen-image-v1` | `fal-ai/qwen-image` | $0.02 |

**Fallback Chain:**
```
CREATOR: fal-nano-banana-edit → fal-qwen-image-2-pro-edit → fal-seedream-v5-lite-edit
B-ROLL:  fal-seedream-v4 → fal-qwen-image → flux-schnell
```

**Frontend model selector:** `src/screens/ImageGeneration/types.ts` → `IMAGE_MODELS.aRoll` / `IMAGE_MODELS.bRoll`
**Backend config:** `supabase/functions/_shared/config/aiModels.ts`

### Video Generation (GeminiGen.AI)

| Key | Label | Resolution | Cost | Duration |
|-----|-------|------------|------|----------|
| `veo-3.1-fast-hd` | VEO 3.1 Fast HD | 720p | $0.015 | 8s (DEFAULT) |
| `veo-3.1-fast-fhd` | VEO 3.1 Fast FHD | 1080p | $0.015 | 8s |
| `veo-3.1-hd` | VEO 3.1 HD | 720p | $0.50 | 8s premium |
| `veo-3.1-fhd` | VEO 3.1 FHD | 1080p | $0.50 | 8s premium |
| `grok-3` | Grok 3 (Aurora) | 720p | $0.015 | 6s / 10s / 15s |

**API Endpoints:**
- VEO: `https://api.geminigen.ai/uapi/v1/video-gen/veo`
- Grok: `https://api.geminigen.ai/uapi/v1/video-gen/grok`

**Webhook Flow:** GeminiGen → `generate-videos/webhook` → updates `video_generation_jobs` → Supabase Realtime → VideoStep UI

**Grok 3 (Aurora) prompt rules:**
- Motion-only (never re-describe static image elements)
- `Speech: [dialogue]` syntax for lip-sync (word limits: 10w/6s · 15w/10s · 25w/15s)
- Positive language only, ONE camera movement per prompt
- 50–100 words total per prompt

### TTS (Text-to-Speech)

| Model | Endpoint | Voice Cloning |
|-------|----------|---------------|
| Chatterbox Turbo | `fal-ai/chatterbox/text-to-speech/turbo` | ✅ 5-10s audio sample |

**20 Preset Voices:** aaron, abigail, anaya, andy, archer, brian, chloe, dylan, emmanuel, ethan, evelyn, gavin, gordon, ivan, laura, lucy, madison, marisol, meera, walter

**Paralinguistic Tags:** `[chuckle]`, `[laugh]`, `[sigh]`, `[gasp]`, `[cough]`, `[clear throat]`

### Music Generation

| Model | Endpoint | Features |
|-------|----------|----------|
| Minimax Music v2 | `fal-ai/minimax-music/v2` | Lyrics + structure tags |

**Structure Tags:** `[Intro]`, `[Verse]`, `[Chorus]`, `[Bridge]`, `[Outro]`

---

## Word Limits (CRITICAL)

| Duration | Max Words | Calculation |
|----------|-----------|-------------|
| 5s | 9 | 130 WPM × 5s × 0.80 |
| 10s | 17 | 130 WPM × 10s × 0.80 |

---

## Generation Flow

```
1. SCRIPT GENERATION (+ topic suggestions, niche, image analysis, video prompt, etc.)
   └── OpenRouter google/gemini-2.5-flash-lite (PRIMARY, PAID) → Gemini 2.0 Flash direct (FREE fallback)
   
2. IMAGE GENERATION
   ├── CREATOR (HOOK/CTA/LOOP-END) → nano-banana-2/edit [default $0.08] | qwen-image-2/pro/edit [$0.075] | seedream-v5/lite/edit [$0.035]
   └── B-ROLL (FORE/BODY/PEAK)     → seedream-v4 [default $0.03] | seedream-v4.5 [$0.04] | qwen-image-2 [$0.035]
   
3. VOICE ANALYSIS (Profile → once per voice upload)
   └── analyze-voice edge fn → Gemini multimodal → voice_prompts table (voice anchor)

3b. TTS GENERATION (Optional)
   └── Chatterbox Turbo → Voice audio per segment

4. VIDEO GENERATION (GeminiGen.AI — sequential queue, 1 at a time)
   ├── Voice anchor: loaded from voice_prompts (profile or avatar)
   ├── Language: detectScriptLanguage() → explicit LANGUAGE block in every prompt
   ├── CREATOR segments: lip-sync REQUIRED, voice anchor in prompt
   ├── B-ROLL segments: off-screen narration ONLY (ZERO visible speech)
   ├── create_jobs    → create video_generation_jobs DB records
   ├── process_single → submit job to GeminiGen API
   ├── webhook        → GeminiGen → Supabase webhook → update job status
   ├── Realtime       → postgres_changes → VideoStep updates UI → submit next job
   ├── Default model: veo-3.1-fast-hd ($0.015, 720p, 8s)
   └── Alt model:     grok-3 ($0.015, 720p, 6–15s, Aurora engine)
   
5. MUSIC GENERATION (Optional)
   └── Minimax Music v2 → Background music
   
6. FINAL COMBINE (VPS)
   └── FFmpeg → Concatenate + subtitles + audio mixing
```

---

## Database Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Table | snake_case | `video_jobs` |
| Trigger | `trg_{table}_set_updated_at` | `trg_video_jobs_set_updated_at` |
| Function | `trg_fn_{table}_set_updated_at()` | `trg_fn_video_jobs_set_updated_at()` |
| Index | `idx_{table}_{column}` | `idx_video_jobs_user_id` |
| RLS Policy | `{action}_{role}_{table}` | `select_authenticated_video_jobs` |

### Key Tables
| Table | Purpose |
|-------|---------|
| `api_keys_pool` | LLM/API key storage with rotation (gemini, openrouter, tavily) |
| `chat_sessions` | v3.0 session state (script, images, video as JSONB) |
| `trending_topics` | 5-source trending keywords, 8h TTL, volume_score 0-100 |
| `trending_challenges` | Content challenge formats (8 base + AI), 24h TTL, upsert on (slug, source, fetch_date) |
| `user_topic_history` | Per-user topic selections for dedup (30-day window) |
| `topic_outfit_cache` | LLM outfit category cache (topic_hash unique) |
| `voice_prompts` | Voice anchor per user/avatar — `voice_prompt_block` (cached prompt), `gender`, `voice_age`, `voice_tone`, `voice_accent`, `voice_pace`. Unique: `(user_id) WHERE is_profile_avatar=true AND avatar_id IS NULL` |
| `video_jobs` | VPS video processing jobs |
| `video_generation_jobs` | GeminiGen video job tracking: status 0=pending 1=processing 2=completed 3=failed, Realtime-enabled |
| `user_branding_kit` | Per-user brand kit: logo, handle, 5-color palette, font, watermark, text presets. UNIQUE(user_id). Hybrid flat+JSONB columns. |
| `carousel_projects` | Carousel project metadata: project_id (SF-YYYYMMDD-XXXX), title, status (draft→source_ready→generated→edited→video_ready→published), generation_mode (ai/manual), slide_count, branding_kit_id. `settings` JSONB includes `language: { primary: 'id'|'en'|'hi', subtitle: 'id'|'en'|'hi'|'none' }` |
| `carousel_source_urls` | Source URLs per project: IG shortcode, media_urls (JSONB array), scrape_status (pending/fetching/completed/failed), source_order |
| `carousel_slides` | Generated slides: slide_order, slide_type (HOOK/BODY/CTA/CAROUSEL/TESTIMONIAL/STATS), analysis_data (JSONB), image_url, prompt, generation_method (ai/manual), video_enabled |
| `social_accounts` | Multi-account OAuth per platform (IG/TikTok/LinkedIn). UNIQUE(user_id, platform, platform_user_id). `is_default` trigger, encrypted tokens, `token_expires_at`, `ig_page_id`. |
| `scheduled_posts` | Post scheduling queue (carousel/creator_lab/ad_studio). Status: pending→publishing→published→failed→cancelled. `schedule_type` (now/scheduled), timezone, retry_count. |
| `post_analytics` | Per-post IG metrics (JSONB: impressions, reach, likes, comments, shares, saves, engagement_rate). UNIQUE(social_account_id, platform_post_id). `slide_metrics` for per-slide position data. |
| `ab_experiments` | A/B test tracking: variant_a/b post refs, winner, significance_score, status (active/completed/cancelled). |
| `audience_insights` | Demographics snapshots: age_distribution, gender_split, top_locations, active_hours, follower_count. UNIQUE(social_account_id, date). |

### Job Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 0 | pending | Awaiting processing |
| 1 | processing | Currently running |
| 2 | completed | Success |
| 3 | failed | Error occurred |

---

## Edge Function Rules

```typescript
// CRITICAL: Deno Edge Functions
// ❌ CANNOT import .md files
// ✅ Use .ts with exported string template literals

// External API Restrictions (Supabase Deno runtime)
// ❌ Blocked from data center IPs: Google Trends, TikTok API, Instagram API
// ✅ Working: Google Suggest API (suggestqueries.google.com/complete/search)

// Required pattern
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Always handle OPTIONS
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}

// Access secrets
const falApiKey = Deno.env.get('FAL_AI_API_KEY');

// Response format
{ success: true, data: { ... } }
{ success: false, error: { code: 'ERROR_CODE', message: 'Human readable' } }
```

### ⚠️ LLM API Calls in Edge Functions (MANDATORY)

```
❌ NEVER create local callGemini/callOpenRouter functions in edge functions
❌ NEVER use getApiKeyFromPool() + raw fetch() to LLM APIs
❌ NEVER use Deno.env.get('OPENROUTER_API_KEY') or Deno.env.get('GEMINI_API_KEY')
❌ NEVER use callOpenRouterHybrid/callGeminiHybrid directly (deprecated)

✅ ALWAYS use callLLM() — the unified caller with auto-fallback:
   import { callLLM, callTavilyHybrid } from '../_shared/apiKeyRotation.ts';

   // Default: OpenRouter (paid) → Gemini (free) fallback
   const result = await callLLM(supabase, messages, { temperature: 0.7, maxTokens: 2048 });

   // Gemini first (for fast/cheap tasks): Gemini → OpenRouter fallback
   const result = await callLLM(supabase, messages, { geminiFirst: true, temperature: 0.5 });

   // Result: { success, content, provider, error }
   if (result.success) { console.log(result.content); }

   // Search — auto-retries up to 5 keys
   const search = await callTavilyHybrid(supabase, query, { maxResults: 10 });

Why: callLLM handles both providers, auto-fallback, key rotation, 429/402 handling,
     and usage tracking in ONE function. No manual cascading needed.
```

---

## Language Rules

| Lang | Pronouns | Particles | Avoid |
|------|----------|-----------|-------|
| **ID** | gue/lo (NEVER saya/kamu) | sih, tuh, gitu, dong, deh | alay, lebay, woles |
| **HI** | tum | yaar, na, matlab, arre | Excessive aap/ji |
| **EN** | Standard | - | Regional slang (US/UK) |

---

## Environment Variables

```batch
:: Frontend (.env)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_INSTAGRAM_APP_ID=xxx              :: Meta App ID for IG OAuth
VITE_OAUTH_REDIRECT_ORIGIN=https://sparkfluence.studio  :: OAuth callback domain (Meta requires HTTPS)
VITE_BACKEND_URL=http://localhost:8000  :: Python backend URL (IG scraper, FFmpeg)
VITE_BACKEND_API_KEY=xxx               :: Python backend API key

:: Supabase Secrets (ask before setting) — only keys NOT in api_keys_pool
FAL_AI_API_KEY=key_id:key_secret
META_APP_ID=xxx                        :: Instagram OAuth App ID (same as VITE_INSTAGRAM_APP_ID)
META_APP_SECRET=xxx                    :: Instagram OAuth App Secret

:: ❌ DEPRECATED — these are now in api_keys_pool table, NOT in env/secrets:
::    GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, PEXELS_API_KEY, UNSPLASH_ACCESS_KEY

:: Python Backend (.env)
SUPABASE_URL=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
:: GROQ_API_KEY=xxx  ← optional fallback only, pool is primary
```

---

## Common Commands (Windows CMD)

```batch
:: Development
npm run dev
npm run build

:: Supabase (LOCAL ONLY - ask before deploy)
supabase start
supabase db diff
supabase functions serve generate-script --no-verify-jwt

:: Check files
dir /s /b *.tsx
type src\index.tsx
findstr /s /i "pattern" *.ts

:: Git (ask before push)
git status
git diff
git log --oneline -10
```

---

## Debugging Checklist

| Issue | Check |
|-------|-------|
| Edge Function 500 | `Deno.env.get()` secrets present? |
| CORS error | OPTIONS handler + headers? |
| RLS blocking | Policy for authenticated user? |
| Image generation fail | FAL_AI_API_KEY format (key_id:key_secret)? |
| Video timeout | Use fal.subscribe() with polling? |
| B-roll shows faces | Using seedream-v4 or qwen-image (no reference)? |
| Indonesian wrong pronouns | Using gue/lo, not saya/kamu? |
| TTS sounds robotic | Temperature 0.7-0.9 for more natural? |
| LLM forcing irrelevant trends | Say "ONLY if relevant" not "at least N trending" |
| Tailwind overflow scroll broken | Parent overflow-hidden blocks child - use flex-wrap |
| localStorage cache stale | Use versioned cache keys (e.g., `_v2` suffix) |
| API key rotation all exhausted | Check `api_keys_pool` — all keys may be is_exhausted=true (wait for daily reset or run `reset_exhausted_api_keys()`) |
| AI features not working | **Always try OpenRouter FIRST (PAID)**. Gemini direct = FREE fallback only. Check openrouter keys before gemini keys. |
| Stock image search failing | Check `api_keys_pool` for `pexels` + `unsplash` providers. All 8 keys exhausted? Run `reset_exhausted_api_keys('pexels')` |
| Groq transcription failing | Check `api_keys_pool` for `groq` provider. Python backend also falls back to `GROQ_API_KEY` env var if pool empty |
| Trending topics empty | Run `fetch_trending.py` or check `expires_at` TTL in `trending_topics` |
| Workspace not saving | Check `isDirty` flag in WorkspaceContext and `useSessionPersistence` debounce. For new sessions, verify DB row was created (check `hasRestoredRef` and `createSession` flow). |
| Workspace shows wrong topic | Check `location.state` from ChatHome navigation. Priority chain: DB restore → location.state → mock data. If DB has stale data, it wins over location.state. |
| New session shows 'Untitled' in sidebar | User navigated away before auto-save completed. `saveNow()` is called after location.state init but is async — check if it completed. |
| Script editing locked | `scriptConfirmed: true` blocks edits — user must unconfirm first |
| Issues tab count flickers | Cross-segment features (`CROSS_SEGMENT_FEATURES`) are filtered out of issue cards — only affect scores. If flicker returns, check `focusedSegmentId` isn't being auto-set. |
| Quick fix exceeds word limit | All fixes use `smartCondense(prefix, text, suffix, maxWords, language)` which sentence-aware condenses. Check maxWords value on segment. |
| Fix All overwrites previous fixes | `handleFixAll` groups by segment+field, only applies highest-weight fix per group. Multiple script fixes on same segment are NOT chained — only best one wins. |
| Issues reappear after tab switch | `appliedFixes` Map / `skippedIssues` Set live in SmartCompanion (NOT IssuesTab). They persist when IssuesTab unmounts on tab switch. |
| Fixes lost on browser refresh | IssuesTab calls `onSaveNow()` after every fix/undo → `needsImmediateSave` ref + useEffect ensures save happens after React state update (solves closure race). Check `orderId` param exists. |
| Quick fix destroys meaning | `smartCondense` strips fillers → picks best sentence by impact score → combines. If still bad, check `FILLER_WORDS` list and `scoreSentenceImpact` weights in scriptAnalysis.ts. |
| Undo restores wrong text | Undo removes ALL `appliedFixes` entries for that segment (group-aware). Check `handleUndoFix` deletes by segment prefix. |
| RetentionCurve scores differ from IssuesTab | OverviewTab passes `precomputedScores` from `analysisMap` to RetentionCurve. If mismatch, check prop is being passed. |
| ChatLayout sidebar missing | Ensure route wraps component with `<ChatLayout>` in `index.tsx` |
| Virality score too low (< 70%) | **Scoring recalibrated 2026-02-22.** Check: (1) `extractFeatures` in scriptAnalysis.ts for feature detection thresholds, (2) word density optimal range is 60-95%, (3) cross-segment defaults raised (builds_on_hook 0.6, matches_hook_category 0.6). LLM: check `scoringOptimizer.ts` power word bank + builds-on-hook rule + scoring cheat sheet in generate-script. |
| Video stuck at generating (spinner never resolves) | Click ↻ Sync button to pull latest status from DB. Check `video_generation_jobs` table — if status=2, `syncJobStatusFromDB()` will update UI |
| Generate All only does 1 video then stops | Realtime subscription issue — check `video_generation_jobs` table has `realtime` enabled. Or webhook not reaching Supabase. Sequential queue triggers next job only after Realtime fires |
| All 8 videos submitted at once (not sequential) | Old bug — fixed with `pendingJobQueueRef` queue system. `submitPendingJobs` now queues all, submits 1, waits for Realtime before next |
| Video play/download not working | Check `videoUrl` is set on segment. `VideoPreviewModal` opens on thumbnail click. Download uses `<a href download>` |
| Failed jobs not retried on Generate All | `submitPendingJobs` resets `status=3` → `status=0` before queuing. If still not picked up, check `video_generation_jobs` filter |
| GeminiGen webhook not updating DB | Check `generate-videos/webhook` edge function. Verify GeminiGen webhook URL points to correct Supabase edge function URL |
| Video speaks wrong language (e.g. English instead of Indonesian) | `detectScriptLanguage()` in generate-videos analyzes script text. Check LANGUAGE block in prompt output. If B-ROLL, verify `getBRollAudioDirective(language, ...)` has language as first param. |
| Voice inconsistent across video segments | Check `voice_prompts` table has a profile entry (`is_profile_avatar=true`). If missing, user hasn't uploaded/analyzed voice in Profile > Voice tab. Fallback: `generateVoiceCharacter()` creates one on-the-fly. |
| Voice analysis fails in Profile | Check `analyze-voice` edge function deployed. Needs `gemini` keys in `api_keys_pool`. Audio must be accessible URL (Supabase storage public bucket). |
| B-Roll shows lip-sync / talking faces | `getBRollAudioDirective()` enforces "ZERO visible human speech". Check prompt includes the off-screen narration block. If using Grok, lip-sync control is limited (known limitation). |
| Overlay covers entire canvas | Default size should be 30% canvas (`{w: 324, h: 576}`), centered. Check `handleOverlayTrackDrop` / `handleEmptyAreaDrop` in Timeline.tsx |
| Overlay image cropped | OverlayClipRenderer uses `objectFit: 'contain'` (NOT 'cover'). Check OverlayClipRenderer.tsx |
| Overlay properties panel not showing | `selectedOverlayClip` in StudioContext resolves overlay clips from `overlayTracks`. Click dispatches `SELECT_LAYER` with `segmentId=track.id`. Check `selectedOverlayClip` getter. |
| Imported media lost on refresh | Media should upload to `studio-media` Supabase Storage bucket and persist in `project.mediaAssets[]`. Check `handleFileImport` in StudioEditor.tsx |
| Track reorder not working | Uses refs (`dragSourceRef`, `dragOverRef`, `effectiveTrackOrderRef`) to avoid stale closures. `onDragEnd` must be on the grip handle (not outer div). `handleTrackDragEnd` reads refs, not state. |
| Hiding one text track hides all | Text tracks need unique keys: `text` (single row) or `text-0`/`text-1` (multi-row). `hiddenTracks.has(trackKey)` must match the unique key. |
| Apply Style to All Text affects all tracks | `APPLY_TEXT_STYLE_TO_ALL` action must include `segmentId` to scope to same segment only. |
| Playhead shaking/jittering | Playhead uses `transform: translateX()` + `willChange: 'transform'` (not `left:`). If jitter returns, check for layout-triggering properties. |
| Text layer not selectable in Player | PlayerOverlay searches ALL segments (not just current) using absolute frame positions. Cross-segment text with negative `inFrame` or extended `outFrame` is found by `absoluteInFrame = seg.startFrame + layer.inFrame`. |
| Carousel 404 on `carousel_projects` | Migration `20260312000000_carousel_and_branding_tables.sql` not deployed. Run `supabase db push`. |
| Carousel IG import CORS error | Edge function `fetch-instagram-media` not deployed. Run `supabase functions deploy fetch-instagram-media --no-verify-jwt`. |
| Carousel IG import 401 (NO_IG_TOKEN) | No IG account connected. User must connect IG at `/settings/social-accounts`. Requires `META_APP_ID` + `META_APP_SECRET` secrets set + Meta App configured. |
| Carousel captions empty after generate | `supabase.functions.invoke()` response nesting: use `data.data.captions` not `data.captions`. |
| Carousel RLS policy fails (uuid = text) | `carousel_projects` has both `id` (UUID) and `project_id` (TEXT). RLS subqueries must qualify: `carousel_source_urls.project_id` not just `project_id` (ambiguous resolution). |
| IG OAuth "invalid redirect URI" | Redirect URI in Meta App must match exactly: `https://sparkfluence.studio/settings/social-accounts/callback`. Must be HTTPS (no localhost). |
| Carousel VideoStep "Continue" does nothing | Check `useNavigate` import + `navigate()` call in `handleContinueToPublish`. |
| Carousel scroll not working | `/carousel-images` MUST be in `LENIS_DISABLED_PATTERNS` (`useSmoothScroll.ts`). Lenis hijacks wheel events at `<html>` level, breaking `<main overflow-y-auto>` in ChatLayout. |
| Carousel validation stuck "Checking..." | `validatingRef.current` blocks new runs. The while loop in `runValidation` reads `sourceUrlsRef.current` each iteration to pick up mid-import images. If validation loops forever, check `validatedKeysRef` key format: `${source.id}-${imageIndex}`. |
| Carousel validation uses Gemini not OpenRouter | `callLLM` multimodal: OpenRouter passes `image_url` directly (model fetches), but Instagram CDN URLs often blocked. Gemini fallback uses `toGeminiParts()` which fetches image server-side → base64 `inlineData`. This is expected behavior, not a bug. |
| Carousel re-import shows duplicates | DELETE by `project_id + shortcode` must happen BEFORE INSERT. Check RLS delete policy on `carousel_source_urls`. |
| Python IG scraper fails | Check Playwright installed: `pip install playwright && playwright install chromium`. Backend endpoint: `GET /api/instagram/media?url=...` with `x-api-key` header. |
| Carousel generated image not relevant to topic | analyze-carousel-source now uses multimodal vision (`image_url` content type). If still generic, check `contentCategory` extraction in analysis response. |
| Carousel image disappears after refresh | Images now persisted to Supabase Storage `carousel-images` bucket. Check `persistImageToStorage()` in generate-carousel-images. Falls back to fal.ai CDN URL on failure. |
| Carousel WOW score < 6 after retry | Check `prompt-formulas.ts` is injected in `buildRagContext()` (was dead code before fix). Also check `getMissingWOWElements()` feedback is being sent. |
| Hook selection not showing in GenerateStep | analyze-carousel-source must return `contentCategory` field. Check multimodal vision is working (image_url content in messages). |
| Prompt-formulas RAG not working | Was dead code — imported but never used in `buildRagContext()`. Fixed: now injected for ALL slide types. |

---

## API Documentation Reference

**Location**: `D:\Projects\fal_ai_model\`

| Category | Files |
|----------|-------|
| Image (with reference) | Nano Banana, FLUX Kontext Pro |
| Image (no reference) | Seedream v4, Qwen Image |
| Video | VEO 3.1, Grok 3 (GeminiGen.AI) |
| TTS | Chatterbox Turbo |
| Music | Minimax Music v2 |

**Config Files**:
- `supabase/functions/_shared/config/aiModels.ts`
- `supabase/functions/_shared/lookups/videoSpecs.ts`

---

## Claude Code Automations

### Skills (invoke with `/skill-name`)
| Skill | Purpose |
|-------|---------|
| `/deploy-edge-function <name>` | Deploy Edge Function with pre-validation |
| `/create-migration <name>` | Scaffold migration with naming conventions |
| `/sync-knowledge` | Sync `src/lib/knowledge/` ↔ `supabase/functions/_shared/knowledge/` mirrors |
| `/new-edge-function <name>` | Scaffold Edge Function with CORS, auth, error handling boilerplate |
| `/frontend-design <desc>` | Build components following Sparkfluence design system (emerald + charcoal) |

### Hooks (automatic)
| Hook | Trigger | Action |
|------|---------|--------|
| `block-env-edit.js` | PreToolUse (Edit/Write) | Blocks edits to `.env` and credential files |
| `block-lockfile-edit.js` | PreToolUse (Edit/Write) | Blocks edits to `package-lock.json`, `yarn.lock` |
| `type-check-on-edit.js` | PostToolUse (Edit/Write) | Runs `tsc --noEmit` after TS file edits |

### Agents (subagents for parallel review)
| Agent | File | Focus |
|-------|------|-------|
| `security-reviewer` | `.claude/agents/security-reviewer.md` | RLS, secrets, XSS, injection |
| `edge-function-reviewer` | `.claude/agents/edge-function-reviewer.md` | CORS, response format, API key rotation, Deno rules |

### MCP Servers (`.mcp.json`)
| Server | Purpose |
|--------|---------|
| `supabase` | Direct DB operations + docs |
| `context7` | Live library documentation lookup |
| `github` | PR/issue management (needs `GITHUB_PERSONAL_ACCESS_TOKEN` env var) |

---

## Planning & Brainstorming Rules

**NEVER use `EnterPlanMode`.** Gaspol skills handle the full workflow. Pick ONE based on context:

| Context | Use This | NOT This |
|---------|----------|----------|
| UI/frontend brainstorm | `gaspol-brainstorm` | EnterPlanMode |
| Non-UI brainstorm (backend, DB, API) | `gaspol-brainstorm` | EnterPlanMode |
| Implementation plan (spec is clear) | `gaspol-plan` → `gaspol-execute` | EnterPlanMode |
| Verify before claiming done | `gaspol-verify` | Skip verification |
| Code review | `gaspol-review` | Manual review |
| Update CLAUDE.md after changes | `gaspol-sync-docs` | Skip docs update |
| Branch completion | `gaspol-finish` | Direct merge without checks |
| Small/obvious task (< 3 steps) | Just do it | Any planning mechanism |

**Full workflow chain:**
```
gaspol-brainstorm → gaspol-plan → gaspol-execute
    → gaspol-verify → gaspol-sync-docs → gaspol-review
    → gaspol-finish
```

**Key rules:**
- **NEVER use `EnterPlanMode`** — gaspol skills cover brainstorm → plan → execute → verify → finish
- `gaspol-brainstorm` includes design intelligence — auto-triggers `gaspol-design` for UI work
- **🔒 MANDATORY CONFIRMATION GATE:** After brainstorming, ALWAYS present the proposed design and flow to the user and ask for explicit confirmation BEFORE proceeding to `gaspol-plan` or `gaspol-execute`. NEVER skip this step — even if the design seems obvious. Show: (1) UI layout/component structure, (2) data flow, (3) user interaction flow, then ask "Setuju dengan design dan flow ini? Ada yang mau diubah?"
- `gaspol-execute` enforces Anti-Placeholder Iron Law + per-phase checkpoints
- `gaspol-verify` is MANDATORY before claiming any work complete
- `gaspol-sync-docs` is MANDATORY after implementation to keep CLAUDE.md in sync
- Never combine multiple planning mechanisms in one task

---

## Quick Reference

### Before ANY Action
```
1. Is this a local file change? → Proceed
2. Does this affect server/production? → ASK PERMISSION
3. Is this a deployment command? → ASK PERMISSION
4. Will this run npm/pip install? → ASK PERMISSION
5. Unsure? → ASK FIRST
```

### fal.ai API Pattern (Subscribe)
```typescript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/kling-video/v2.5-turbo/standard/image-to-video", {
  input: {
    prompt: "Subject smiles warmly...",
    image_url: "https://...",
    duration: "5",
    negative_prompt: "blur, distort, low quality"
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      console.log(update.logs);
    }
  },
});
```

---

**Last Updated:** March 2026
**Version:** 7.8 (+ validate-slide-content edge fn, Python IG scraper (Playwright), callLLM multimodal support, Lenis scroll fix for carousel, SourceStep validation UI)
