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
| AI - Script | Gemini 2.0 Flash (FREE) → OpenRouter Llama 3.3-70b (fallback) |
| AI - Images | fal.ai: Nano Banana Pro (CREATOR) + Wan 2.6 (B-ROLL) |
| AI - Video | VEO 3.1 Fast (≤8s) / Sora 2 (>8s) via GeminiGen.AI |
| AI - Transcription | Groq Whisper (FREE) |

---

## Knowledge Files (5 Files)

Location: `D:\Projects\sparkfluence_platform\docs\knowledge\`

| File | Purpose | Use When |
|------|---------|----------|
| `01-viral-content.md` | 4-part script structure, virality factors, hooks, retention | Script generation |
| `02-slang-dictionary.md` | ID/HI/EN slang, particles, outdated terms | Language validation |
| `03-prompt-engineering.md` | Emotion→Expression, lighting, camera, Visual Brief | Image/video prompts |
| `04-ai-api-specs.md` | fal.ai, VEO, Sora, Gemini API specs | AI integration |
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
│  │   ├── generate-images (fal.ai)                          │
│  │   └── generate-videos (VEO/Sora)                        │
│  ├── PostgreSQL + pgvector (RAG)                           │
│  └── Storage Buckets                                        │
│                         │                                   │
│                         ▼                                   │
│  PYTHON BACKEND (VPS)                                       │
│  └── FastAPI + FFmpeg (video processing)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Directories

```
D:\Projects\sparkfluence_platform\
├── src\
│   ├── components\
│   │   ├── ui\               # Shadcn components (button, card, input, etc.)
│   │   ├── layout\           # Sidebar, Navbar, Footer
│   │   ├── animations\       # FadeIn, ScaleIn, FloatingElement
│   │   └── features\         # Domain-specific components (ImageGeneration, VoiceRecorder)
│   ├── contexts\             # Auth, Onboarding, Language, Theme, Planner
│   ├── hooks\                # useAuth, useSubscription, useAvatarManager
│   ├── lib\
│   │   ├── supabase.ts       # Supabase client initialization
│   │   └── orderIdGenerator.ts # Order ID utilities (SF-YYYYMMDD-XXXX)
│   ├── screens\              # 28+ screens (dashboard, script-lab, image-generation, etc.)
│   └── index.tsx             # App entry + React Router
├── supabase\
│   ├── functions\            # Edge Functions (Deno)
│   │   ├── _shared\          # Shared utilities (CORS, Supabase client, config)
│   │   │   ├── cors.ts
│   │   │   ├── supabase.ts
│   │   │   ├── config\       # aiModels.ts, modelCapabilities.ts
│   │   │   ├── knowledge\    # Viral content patterns, slang, prompts
│   │   │   └── lookups\      # Cinematography, metaphors, product keywords
│   │   ├── generate-script\  # Script generation (Gemini + RAG)
│   │   ├── generate-images\  # Image generation (fal.ai multi-model)
│   │   ├── generate-videos\  # Video generation (Wan 2.5, Kling 2.5)
│   │   └── analyze-image\    # Gemini Vision API for image analysis
│   └── migrations\           # SQL migrations
├── backend\
│   └── main.py               # FastAPI + FFmpeg (video combining)
├── docs\
│   ├── knowledge\            # 5 knowledge files
│   └── V2_TECHNICAL_SPEC.md  # v2.0 implementation spec
└── CLAUDE.md                 # This file
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
const apiKey = Deno.env.get('GEMINI_API_KEY');

// Response format
{ success: true, data: { ... } }
{ success: false, error: { code: 'ERROR_CODE', message: 'Human readable' } }
```

---

## Image Generation Selection

| Segment | Model | Style | Reference Image |
|---------|-------|-------|-----------------|
| HOOK, CTA, LOOP-END | nano-banana-pro | Portrait Cinematic | ✅ Avatar URL |
| FORE, BODY-X, PEAK | wan/v2.6 | Native cinematic | ❌ No face |

**Fallback Chain:**
```
CREATOR: nano-banana-pro → GPT-Image-1 → FLUX
B-ROLL:  wan/v2.6 → nano-banana-pro → FLUX
```

---

## Video Generation Selection

| Condition | Platform | Model | Max Duration |
|-----------|----------|-------|--------------|
| ≤8s segment | VEO 3.1 | `veo-3.1-fast` | 8s |
| >8s segment | Sora 2 | `sora-2` | 15s |
| Long narrative | Sora 2 Pro | `sora-2-pro` | 25s |

**Word Limits (CRITICAL):**
| Duration | Max Words |
|----------|-----------|
| 4s | 7 |
| 6s | 10 |
| 8s | 14 |
| 10s | 17 |
| 15s | 26 |

---

## Language Rules

| Lang | Pronouns | Particles | Avoid |
|------|----------|-----------|-------|
| **ID** | gue/lo (NEVER saya/kamu) | sih, tuh, gitu, dong, deh | alay, lebay, woles |
| **HI** | tum | yaar, na, matlab, arre | Excessive aap/ji |
| **EN** | Standard | - | Regional slang (US/UK) |

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

## Response Guidelines

### Language
- Default: **Bahasa Indonesia**
- Technical terms: English
- Match user's language preference

### Output Style
- **Concise**: ≤120 words default
- **No hallucination**: Verify or ask
- **Tables** for structured data
- **Code blocks** with language tag
- **Windows paths**: Backslashes always

### Task Flow
1. **Small tasks** (≤2 files): Propose → Execute after approval
2. **Large tasks**: Outline plan → Wait for "Go" → Execute in phases
3. **Server/Deploy**: ALWAYS ask permission first

---

## Debugging Checklist

| Issue | Check |
|-------|-------|
| Edge Function 500 | `Deno.env.get()` secrets present? |
| CORS error | OPTIONS handler + headers? |
| RLS blocking | Policy for authenticated user? |
| Image generation fail | FAL_AI_API_KEY format correct? |
| Video timeout | Duration within limit? |
| B-roll shows faces | Using wan/v2.6 with negative_prompt? |
| Indonesian wrong pronouns | Using gue/lo, not saya/kamu? |

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
VEO_API_KEY=xxx
GROQ_API_KEY=xxx
UNSPLASH_ACCESS_KEY=xxx
PEXELS_API_KEY=xxx

:: Python Backend (.env)
SUPABASE_URL=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

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

### File Operations
```
1. Read file before editing
2. Confirm destructive changes
3. Use Windows paths (backslashes)
4. Create backups for major changes
```

---

## V2.0 Implementation Notes

### Order ID System
- **Format**: `SF-YYYYMMDD-XXXX` (e.g., `SF-20260113-A3X9`)
- **Generated**: When script is created in `/script-lab`
- **Tracked**: Throughout entire flow (script → images → videos → final)
- **Stored**: `generation_sessions.order_id` column
- **Utility**: `src/lib/orderIdGenerator.ts`

### Multi-Image Gallery Flow
**Path**: `/image-generation` (renamed from `/video-editor`)

**Key behaviors**:
- Each segment can have **multiple images** (append, not replace)
- User clicks to **SELECT** 1 final image per segment
- **Regenerate** button opens popup with optional notes + reference image
- **Add Reference** button opens stock image modal (Unsplash + Pexels)
- Duration **auto-calculated** from segment type (5s or 10s)

**State structure**:
```typescript
interface SegmentImage {
  id: string;
  image_url: string;
  generation_number: number;          // 1, 2, 3, ...
  source_type: 'generated' | 'stock' | 'uploaded';
  is_selected: boolean;               // Only 1 per segment
}
```

### Auto-Duration Logic
**CRITICAL**: User does NOT select duration anywhere!

| Segment Type | Duration | Rule |
|--------------|----------|------|
| HOOK, FORE, CTA, LOOP-END | 5s | Always 5s |
| BODY-X, PEAK (30s video) | 5s | Short video = tight segments |
| BODY-X, PEAK (60s/90s video) | 10s | Standard/long video |

**Implementation**: `src/lib/segmentDuration.ts`

### Image Analysis → Video Prompt Pipeline
1. User selects final image per segment
2. System analyzes image via **Gemini 2.0 Flash Vision** (FREE)
3. Analysis returns: objects, style, lighting, mood, suggested_motion
4. System **auto-generates** video prompt from analysis + segment type + script
5. User can edit prompt before generation
6. Send to **Wan 2.5** or **Kling 2.5** for video generation

**Edge Functions**:
- `analyze-image` - Gemini Vision API
- `generate-video-prompt` - Create prompt from analysis
- `search-stock-images` - Unsplash + Pexels integration

### Voice Recording Requirements
**Minimum**: 2 minutes for quality voice cloning

**Locations**:
- **Onboarding**: Step 2.5 (after avatar, before preferences)
- **Profile**: Re-record section with playback

**Component**: `src/components/features/VoiceRecorder/VoiceRecorder.tsx`

**Storage**:
- Bucket: `voice-references`
- Table: `user_profiles.voice_reference_url`
- Duration: `user_profiles.voice_reference_duration_seconds`

### API Documentation Reference
**⚠️ CRITICAL**: Read API docs before implementing generation features

**Location**: `D:\Projects\fal_ai_model\`

| Model Type | PDF Files |
|------------|-----------|
| Image (with reference) | FLUX.1 Kontext Pro, Nano Banana |
| Image (no reference) | Bytedance Seedream v4, Qwen Image |
| Video | Wan 2.5, Kling Video |
| Voice | Chatterbox Turbo (TTS) |
| Music | Minimax Music v2 |

**Extract from each doc**:
- Endpoint URL
- Seed support (yes/no, range)
- Negative prompt support
- Required vs optional fields
- Rate limits

**Config**: `supabase/functions/_shared/config/modelCapabilities.ts`

### Edge Function Patterns

**Multi-mode support** (images & videos):
```typescript
// Mode parameter
interface Request {
  mode: 'create_jobs' | 'process_single' | 'check_status';
  // ... other fields
}

// create_jobs: Async batch processing
// process_single: Sync single generation
// check_status: Poll job status
```

**Retry logic with session refresh**:
```typescript
async function invokeWithRetry(functionName, body, maxRetries = 3) {
  // Auto-refresh session if expired
  // Retry on network errors
  // Return { data, error }
}
```

**Standard response format**:
```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: { code: 'ERROR_CODE', message: 'Human readable' } }
```

### Key Hooks & Utilities

**useAuth()** - AuthContext
```typescript
const { user, session, loading, signIn, signOut } = useAuth();
```

**useSubscription()** - Subscription data
```typescript
const { subscription, sparks, features, canUseTool } = useSubscription();
// Calls Edge Function: get-subscription
// Returns: plan tier, sparks balance, feature access
```

**ensureValidSession()** - Session management
```typescript
// Pattern used in long-running operations
const isValid = await ensureValidSession();
if (!isValid) {
  // Redirect to login or refresh
}
```

### Development Workflow

**Start development**:
```batch
npm run dev
```

**Build for production**:
```batch
npm run build
```

**Local Supabase** (ask permission before deploy):
```batch
supabase start
supabase db reset
supabase db diff
supabase functions serve function-name --no-verify-jwt
```

**Deploy Edge Function** (ask permission):
```batch
supabase functions deploy function-name --no-verify-jwt
```

**Database migration** (ask permission):
```batch
supabase db push
```

### Testing Patterns

**Component testing**:
- Test render without API calls
- Mock Supabase client responses
- Test user interactions (click, select, input)

**Edge Function testing**:
- Test with sample data
- Verify response format (success/error)
- Check CORS headers
- Test with invalid inputs

**End-to-end flow**:
1. Script generation → Order ID created
2. Image generation → Multi-image gallery
3. Image selection → Mark as selected
4. Video generation → Auto-prompt from image
5. Final video → FFmpeg combines all segments

### Common Pitfalls

| Issue | Solution |
|-------|----------|
| Route not found after rename | Update both route definition AND navigation calls |
| Multi-image not saving | Remove UNIQUE constraint on (session_id, segment_number) |
| Image analysis fails | Check Gemini API key, verify image URL accessible |
| Voice recording too short | Enforce 2-minute minimum in UI (disable save button) |
| Order ID collision | Use timestamp + random 4 chars (very low probability) |
| Edge Function CORS | Always handle OPTIONS request first |
| Session expired | Use `ensureValidSession()` before long operations |

---

**Last Updated:** January 2026
**Version:** 5.0 (v2.0 implementation ready - multi-image, voice recording, auto-prompts)
