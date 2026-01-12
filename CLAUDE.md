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
│   ├── components\ui\        # Shadcn components
│   ├── contexts\             # Auth, Onboarding, Planner
│   ├── hooks\                # Custom hooks
│   ├── lib\supabase.ts       # Supabase client
│   ├── screens\              # 29 screens
│   └── index.tsx             # App entry + routing
├── supabase\
│   ├── functions\            # Edge Functions (Deno)
│   └── migrations\           # SQL migrations
├── backend\
│   └── main.py               # FastAPI server
├── docs\
│   └── knowledge\            # 5 knowledge files
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

**Last Updated:** January 2026
**Version:** 4.0 (Simplified, Windows-focused, permission-gated)
