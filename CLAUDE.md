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
│  │   └── generate-music (Minimax Music v2)                 │
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

## Key Directories

```
D:\Projects\sparkfluence_platform\
├── src\
│   ├── components\
│   │   ├── ui\               # Shadcn components
│   │   ├── layout\           # Sidebar, Navbar, Footer
│   │   └── features\         # VoiceRecorder, ImageGeneration
│   ├── contexts\             # Auth, Onboarding, Language, Theme
│   ├── hooks\                # useAuth, useSubscription, useAvatarManager
│   ├── lib\
│   │   ├── supabase.ts       # Supabase client
│   │   └── orderIdGenerator.ts
│   ├── screens\              # 28+ screens
│   └── index.tsx             # App entry + routing
├── supabase\
│   ├── functions\            # Edge Functions (Deno)
│   │   ├── _shared\          # Shared utilities
│   │   │   ├── config\       # aiModels.ts, modelCapabilities.ts
│   │   │   ├── knowledge\    # Viral content, slang, prompts
│   │   │   └── lookups\      # videoSpecs.ts, cinematography
│   │   ├── generate-script\
│   │   ├── generate-images\
│   │   ├── generate-videos\
│   │   ├── generate-tts\
│   │   └── generate-music\
│   └── migrations\
├── backend\
│   └── main.py               # FastAPI + FFmpeg
├── docs\
│   └── knowledge\            # 5 knowledge files
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
   └── Gemini 2.0 Flash → Script with segments
   
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

**Last Updated:** January 2026
**Version:** 6.0 (fal.ai unified stack - Kling/Wan video, Chatterbox TTS, Minimax Music)
