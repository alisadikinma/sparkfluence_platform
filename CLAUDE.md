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
| Video Processing | Python FastAPI + FFmpeg (VPS) |
| AI - Script | OpenRouter: Gemini 2.5 Flash Lite (PRIMARY, PAID) → Gemini 2.0 Flash direct (fallback) |
| AI - Images | fal.ai: Nano Banana Edit (CREATOR) + Seedream v4 / Qwen (B-ROLL) |
| AI - Video | fal.ai: Kling 2.5 Turbo (DEFAULT) + Wan 2.5 (with audio) |
| AI - TTS | fal.ai: Chatterbox Turbo (voice cloning) |
| AI - Music | fal.ai: Minimax Music v2 (AI-generated BGM) |
| AI - Transcription | Groq Whisper (FREE) |

---

## Knowledge Files (5 Files)

Location: `D:\Projects\sparkfluence_platform\docs\knowledge\`

| File | Purpose | Use When |
|------|---------|----------|
| `01-viral-content.md` | 4-part script structure, virality factors, hooks, retention | Script generation |
| `02-slang-dictionary.md` | ID/HI/EN slang, particles, outdated terms | Language validation |
| `03-prompt-engineering.md` | Emotion→Expression, lighting, camera, Visual Brief | Image/video prompts |
| `04-ai-api-specs.md` | fal.ai models (image, video, TTS, music), Gemini API | AI integration |
| `05-tech-stack.md` | Supabase, Deno, React, FFmpeg patterns | Development |

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
│  │   ├── generate-videos (Kling 2.5 / Wan 2.5)             │
│  │   ├── generate-tts (Chatterbox Turbo)                   │
│  │   ├── generate-music (Minimax Music v2)                 │
│  │   └── autocomplete-keywords (Google Suggest proxy)      │
│  ├── PostgreSQL + pgvector (RAG)                           │
│  └── Storage Buckets                                        │
│                         │                                   │
│                         ▼                                   │
│  PYTHON BACKEND (VPS)                                       │
│  └── FastAPI + FFmpeg (video combining, subtitles)         │
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
// Core functions
getApiKeyFromPool(supabase, provider)     // Get next available key
callWithRotationHybrid(supabase, provider, apiCallFn, maxRetries=5) // Auto-retry

// Provider-specific callers (use these in Edge Functions)
callOpenRouterHybrid(supabase, messages, options) // PRIMARY — google/gemini-2.5-flash-lite (PAID)
callGeminiHybrid(supabase, messages, options)     // FALLBACK — gemini-2.0-flash-lite (FREE)
callTavilyHybrid(supabase, query, options)        // Tavily search

// Error handling
incrementUsage(supabase, keyId)   // After success
markExhausted(supabase, keyId)    // On 429/402
deactivateKey(supabase, keyId)    // On leaked/compromised (permanent)
```

### Retry Flow
```
429 (Rate Limit) → markExhausted → try next key → restore after all exhausted
402 (Payment)    → markExhausted → try next key → daily reset
403 (Leaked)     → deactivateKey → NEVER use again
401/403 (Other)  → skip key, don't mark exhausted
200 (Success)    → incrementUsage → return result
```

### Providers in Pool
| Provider | Priority | Used By |
|----------|----------|---------|
| `openrouter` | **PRIMARY** — `google/gemini-2.5-flash-lite` (PAID) | generate-script, rewrite-visual-direction, generate-topic-suggestions, autoShorten |
| `gemini` | FALLBACK — `gemini-2.0-flash-lite` (FREE) | generate-script fallback, generate-niche-suggestions, analyze-image, generate-video-prompt, recommend-styles |
| `tavily` | - | keywordExtractor (search enrichment) |
| `rapidapi_instagram` | - | fetch-trending-data (Instagram trends) |

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

### 5 Trending Sources
| Source | Method | Countries |
|--------|--------|-----------|
| Google Trends | JSON API + RSS fallback | ID, US, IN, FR |
| TikTok CC | Creative Center scrape (dehydratedState) | ID, US, FR |
| YouTube | Piped/Invidious API | ID, US, IN, FR |
| Google News | RSS feed | ID, US, IN, FR |
| Instagram | RapidAPI (daily, key rotation) | ID, US, IN, FR |

### Backend: `backend/fetch_trending.py`
- Python script with 3-layer deduplication (normalize → fuzzy match ≥65% → merge)
- AI creative angles via Gemini/OpenRouter for top 15 keywords
- CLI: `python fetch_trending.py [--country ID] [--source google] [--dry-run]`
- Cron: every 8h (00:00, 08:00, 16:00 UTC) via `backend/setup_cron.sh`
- Dependencies: `pytrends`, `feedparser`, `rapidfuzz`

### Edge Function: `generate-topic-suggestions`
- **Input:** interest, niches, objectives, dnaStyles, language, country, count, batch, exclude_titles, search_keyword
- **Modes:** Personalized (niches-based) or Keyword Search
- **LLM Chain:** OpenRouter `google/gemini-2.5-flash-lite` (primary) → Gemini direct (fallback) (22s deadline)
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

### Workspace 3-Column Layout (1440px+)
```
Left Wing ("The Brain")     │ Center (main workspace)    │ Right Wing ("The Body")
VelocityMeter               │ StepBar                    │ LiveSimulator
BrandKit                    │ ScriptStep / ImageStep /   │ (9:16 phone frame)
PreFlightChecklist           │ VideoStep / StudioStep     │
```

### Workspace State: `WorkspaceContext.tsx`
- useReducer with 25+ actions (INIT_SESSION, SET_SCRIPT_DATA, SELECT_HOOK, EDIT_SEGMENT, etc.)
- `isDirty` flag triggers auto-save via `useSessionPersistence` (5s debounce)
- `scriptConfirmed: true` locks all script editing
- Computed helpers: `canProceedToImages`, `canProceedToVideo`, `canProceedToStudio`

### Session Persistence
- `useChatSessions` — CRUD operations on `chat_sessions` table
- `useSessionPersistence` — auto-save (debounce 5s), restore on mount, flush on unmount
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
| `HookSelector` | 3-hook variant tabs (Safe/Bold/Visual) with tinting |
| `ViralityScore` | Compact pill or expanded ring with score breakdown |
| `ScriptComparison` | Word-level LCS diff between script versions |
| `ScriptStep` | Segment cards with retention borders, director chips, waveform bars |
| `ImageStep` | Image generation per segment (stub) |
| `VideoStep` | Video generation with pre-flight checklist (stub) |
| `StudioStep` | Remotion player + timeline placeholder (stub) |

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

## Key Directories

```
D:\Projects\sparkfluence_platform\
├── src\
│   ├── components\
│   │   ├── ui\               # Shadcn components
│   │   ├── layout\           # ChatLayout, ChatSidebar, PublicLayout, Navbar
│   │   └── features\         # VoiceRecorder, ImageGeneration
│   ├── contexts\             # Auth, Onboarding, Language, Theme, Workspace
│   ├── hooks\                # useAuth, useChatSessions, useSessionPersistence
│   ├── lib\
│   │   ├── supabase.ts       # Supabase client
│   │   └── orderIdGenerator.ts
│   ├── screens\              # 30+ screens (ChatHome, Workspace, AdStudio...)
│   └── index.tsx             # App entry + routing
├── supabase\
│   ├── functions\            # Edge Functions (Deno)
│   │   ├── _shared\          # Shared utilities
│   │   │   ├── config\       # aiModels.ts, modelCapabilities.ts
│   │   │   ├── knowledge\    # Viral content, slang, prompts
│   │   │   ├── lookups\      # videoSpecs.ts, cinematography
│   │   │   └── apiKeyRotation.ts  # Key pool rotation logic
│   │   ├── generate-script\
│   │   ├── generate-images\
│   │   ├── generate-videos\
│   │   ├── generate-tts\
│   │   ├── generate-music\
│   │   ├── generate-topic-suggestions\  # LLM + trending
│   │   └── fetch-trending-data\         # 5-source collector
│   └── migrations\
├── backend\
│   ├── main.py               # FastAPI + FFmpeg
│   ├── fetch_trending.py     # Trending data fetcher (cron 8h)
│   └── setup_cron.sh         # Cron job scheduler
├── docs\
│   ├── knowledge\            # 5 knowledge files
│   └── plans\                # Design docs & implementation plans
└── CLAUDE.md                 # This file
```

---

## AI Model Selection (fal.ai)

### Image Generation

| Segment | Model | Endpoint | Reference Image |
|---------|-------|----------|-----------------|
| HOOK, CTA, LOOP-END | nano-banana/edit | `fal-ai/nano-banana/edit` | ✅ image_urls array (up to 14) |
| FORE, BODY-X, PEAK | seedream-v4 | `fal-ai/bytedance/seedream/v4/text-to-image` | ❌ No |
| B-ROLL (negative prompt) | qwen-image | `fal-ai/qwen-image` | ❌ No |

**Fallback Chain:**
```
CREATOR: nano-banana/edit → flux-kontext → qwen-image
B-ROLL:  seedream-v4 → qwen-image → flux-schnell
```

### Video Generation

| Condition | Model | Endpoint | Max Duration |
|-----------|-------|----------|--------------|
| DEFAULT (best motion) | Kling 2.5 Turbo | `fal-ai/kling-video/v2.5-turbo/standard/image-to-video` | 10s |
| With BGM / High-res | Wan 2.5 | `fal-ai/wan-25-preview/image-to-video` | 10s |

**Key Differences:**
| Feature | Kling 2.5 | Wan 2.5 |
|---------|-----------|---------|
| Audio support | ❌ | ✅ |
| Resolution | Auto | 480p/720p/1080p |
| Seed | ❌ | ✅ |
| Prompt expansion | ❌ | ✅ (LLM-enhanced) |

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
1. SCRIPT GENERATION
   └── OpenRouter Gemini 2.5 Flash Lite (primary) → Gemini 2.0 Flash direct (fallback)
   
2. IMAGE GENERATION
   ├── CREATOR segments → nano-banana/edit (with avatar reference)
   └── B-ROLL segments → seedream-v4 or qwen-image
   
3. TTS GENERATION (Optional)
   └── Chatterbox Turbo → Voice audio per segment
   
4. VIDEO GENERATION
   ├── Default → Kling 2.5 Turbo (image_url + prompt)
   └── With BGM → Wan 2.5 (image_url + prompt + audio_url)
   
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
| `api_keys_pool` | LLM/API key storage with rotation (gemini, openrouter, tavily, rapidapi) |
| `chat_sessions` | v3.0 session state (script, images, video as JSONB) |
| `trending_topics` | 5-source trending keywords, 8h TTL, volume_score 0-100 |
| `user_topic_history` | Per-user topic selections for dedup (30-day window) |
| `topic_outfit_cache` | LLM outfit category cache (topic_hash unique) |
| `video_jobs` | VPS video processing jobs |

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

:: Supabase Secrets (ask before setting)
GEMINI_API_KEY=xxx
OPENROUTER_API_KEY=xxx
FAL_AI_API_KEY=key_id:key_secret
GROQ_API_KEY=xxx

:: Python Backend (.env)
SUPABASE_URL=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
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
| API key rotation all exhausted | Check `api_keys_pool` — all keys may be is_exhausted=true (wait for daily reset) |
| Trending topics empty | Run `fetch_trending.py` or check `expires_at` TTL in `trending_topics` |
| Workspace not saving | Check `isDirty` flag in WorkspaceContext and `useSessionPersistence` debounce |
| Script editing locked | `scriptConfirmed: true` blocks edits — user must unconfirm first |
| ChatLayout sidebar missing | Ensure route wraps component with `<ChatLayout>` in `index.tsx` |

---

## API Documentation Reference

**Location**: `D:\Projects\fal_ai_model\`

| Category | Files |
|----------|-------|
| Image (with reference) | Nano Banana, FLUX Kontext Pro |
| Image (no reference) | Seedream v4, Qwen Image |
| Video | Kling Video, Wan 2.5 |
| TTS | Chatterbox Turbo |
| Music | Minimax Music v2 |

**Config Files**:
- `supabase/functions/_shared/config/aiModels.ts`
- `supabase/functions/_shared/config/modelCapabilities.ts`
- `supabase/functions/_shared/lookups/videoSpecs.ts`

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

**Last Updated:** February 2026
**Version:** 7.0 (v3.0 Chat UI + API Key Rotation + Trending Topics + fal.ai unified stack)
