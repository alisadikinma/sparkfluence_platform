# Sparkfluence

<div align="center">

![Sparkfluence Logo](public/sparkfluence-logo.png)

**AI-Powered Platform for Viral Short-Form Video Creation**

Transform content ideas into viral-ready videos in minutes with cutting-edge AI

[Features](#-key-features) • [Architecture](#-architecture-overview) • [Getting Started](#-getting-started) • [Documentation](#-documentation)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture Overview](#-architecture-overview)
- [Technology Stack](#-technology-stack)
- [Video Generation Pipeline](#-video-generation-pipeline)
- [FFmpeg Quick Reference](#-ffmpeg-quick-reference)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [Development Guidelines](#-development-guidelines)
- [Deployment](#-deployment)
- [RAG Knowledge System](#-rag-knowledge-system)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**Sparkfluence** is a comprehensive SaaS platform that empowers content creators, influencers, and digital marketers to create viral short-form video content for **TikTok**, **Instagram Reels**, and **YouTube Shorts**.

The platform leverages state-of-the-art AI technologies to automate the entire content creation workflow:

- **Script Generation** with RAG (Retrieval-Augmented Generation) using viral content psychology
- **Cinematic Visual Generation** with fal.ai: nano-banana-2/edit (CREATOR shots) + seedream-v4 (B-ROLL)
- **Professional Video Generation** with GeminiGen.AI: VEO 3.1 Fast HD (default) + Grok 3 Aurora
- **Multi-Language Support** (Indonesian Gen-Z with code-mixing, English, Hindi/Hinglish)
- **Complete Publishing Workflow** from ideation to content calendar management

### 🎬 What Makes Sparkfluence Unique?

1. **RAG-Enhanced Script Generation** - Grounded in 10+ knowledge base documents covering viral psychology, hook frameworks, and platform-specific optimization
2. **Hybrid AI Provider Strategy** - Combines FREE tier APIs (FLUX.1, Llama 3.3-70b, Gemini) with premium services for optimal cost-performance
3. **Face Consistency for Creator Shots** - Uses GPT-Image-1 with character reference PNG for consistent creator appearance in Hook and CTA segments
4. **Content Completeness Validation** - Ensures numbered topics (e.g., "5 tips") actually cover all promised items
5. **Multi-Segment Video Editor** - Structured 4-6 segment workflow (Hook → Foreshadow → Body → Peak → CTA) with individual control
6. **End-to-End Automation** - From topic generation to final video assembly with background music mixing

---

## ✨ Key Features

### 🤖 AI-Powered Content Creation

| Feature | Description | AI Provider |
|---------|-------------|-------------|
| **Topic Generation** | Generate personalized content ideas based on niche, interests, and trending data | OpenRouter gemini-2.5-flash-lite (PRIMARY) → Gemini 2.0 Flash (fallback) |
| **RAG-Enhanced Script Writing** | Viral scripts grounded in knowledge base with hook frameworks and platform-specific optimization | OpenRouter google/gemini-2.5-flash-lite (PAID) → Gemini 2.0 Flash (FREE fallback) |
| **Vector Embeddings** | 768-dimensional semantic search for RAG context retrieval | Google Gemini text-embedding-004 |
| **Image Generation** | CREATOR shots (face consistency) + B-ROLL (illustrative visuals) | fal.ai: nano-banana-2/edit (CREATOR, $0.08) + seedream-v4 (B-ROLL, $0.03) |
| **Video Generation** | Sequential queue: 1 video at a time, webhook + Realtime updates | GeminiGen.AI: VEO 3.1 Fast HD (default, $0.015) / VEO 3.1 FHD (premium, $0.50) / Grok 3 Aurora ($0.015, 6–15s) |
| **Music Integration** | Background music mixing with volume control | fal.ai Minimax Music v2 + Python FFmpeg |
| **Niche Recommendations** | AI-suggested content niches based on user profile | OpenRouter gemini-2.5-flash-lite → Gemini 2.0 Flash fallback |
| **Creative DNA Profiling** | Style assessment and personality matching | OpenRouter gemini-2.5-flash-lite → Gemini 2.0 Flash fallback |

### 🎨 Content Creation Workflow

- **Multi-Segment Video Editor** - Create 30s-90s videos with 4-6 structured segments
- **Segment Types**: HOOK, FORESHADOW, BODY-1, BODY-2, BODY-3, PEAK, CTA
- **Shot Types**: Auto-assigned CREATOR (face-to-camera) vs B-ROLL (illustrative visuals)
- **Visual Prompt Editing** - Customize AI-generated visual directions per segment
- **Script Editing** - Full control over script text with regeneration options
- **Image Regeneration** - Re-generate individual segment images with different styles
- **Music Selector** - Browse and preview background music tracks
- **Real-Time Preview** - Preview video segments before final assembly

### 📅 Content Management

- **Content Calendar** (Planner) - Schedule content with monthly/weekly/list views
- **Gallery** - Organize and manage created videos
- **History** - Track all content creation sessions
- **Analytics Dashboard** - Views, engagement, followers, watch time across platforms
- **Social Media Analytics** - Platform-specific performance metrics (TikTok, Instagram, YouTube, Meta)
- **Token/Credit System** - Usage tracking with Indonesian Rupiah billing support

### 🌐 Multi-Platform & Multi-Language

- **Platforms**: TikTok, Instagram Reels, YouTube Shorts, Meta (Facebook/WhatsApp Status)
- **Languages**:
  - **Indonesian** with Gen-Z code-mixing (slang like "lo/gue", "literally", "banget")
  - **English** (standard/casual)
  - **Hindi** with Hinglish code-mixing
- **Duration Options**: 30s, 60s, 90s videos
- **Aspect Ratio**: 9:16 vertical (optimized for mobile)

### 👤 User Experience

- **Comprehensive Onboarding** - Interest selection, profession mapping, objective setting
- **Avatar Upload & Analysis** - Upload creator photo for face-consistent CREATOR shots
- **Character Reference System** - Generates character_ref_png for GPT-Image-1 consistency
- **Google OAuth Integration** - Quick sign-up and login
- **Dark Mode UI** - Modern interface with electric purple/pink gradient theme
- **WhatsApp OTP Verification** - Phone number verification via WhatsApp
- **First Login Welcome Modal** - Guided introduction for new users
- **Notification System** - In-app notifications for job status, credits, etc.

---

## 🏗 Architecture Overview

Sparkfluence follows a **hybrid architecture** with three main components working together:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React 18 + TypeScript + Vite)                │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  29 Screens: Landing, Auth, Onboarding, Editor, Planner, etc.       │  │
│  │  5 Context Providers: Auth, Onboarding, Planner, Theme, Language   │  │
│  │  30+ UI Components: Shadcn UI + Custom Components                   │  │
│  │  25+ Routes: Public + Protected (React Router)                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                    │
                                    │ HTTP (Supabase Client SDK)
                                    │
┌───────────────────────────────────▼──────────────────────────────────────────┐
│                         SUPABASE BACKEND (BaaS)                              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    EDGE FUNCTIONS (Deno/TypeScript)                    │ │
│  │  • generate-script (OpenRouter gemini-2.5-flash-lite + RAG)            │ │
│  │  • generate-images (fal.ai: nano-banana-2/edit CREATOR + seedream-v4) │ │
│  │  • generate-videos (GeminiGen.AI VEO 3.1 / Grok 3 — sequential queue │ │
│  │    + webhook + Supabase Realtime)                                      │ │
│  │  • generate-tts (fal.ai Chatterbox Turbo — voice cloning)             │ │
│  │  • generate-music (fal.ai Minimax Music v2)                           │ │
│  │  • generate-topic-suggestions (OpenRouter + trending DB)              │ │
│  │  • search-stock-images (Pexels primary + Unsplash fallback)           │ │
│  │  • autocomplete-keywords (Google Suggest proxy)                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │          PostgreSQL + pgvector (RAG Vector Database)                   │ │
│  │  • knowledge_embeddings (768D Gemini vectors, 16 knowledge files)     │ │
│  │  • match_knowledge RPC (similarity search)                             │ │
│  │  • 12+ tables: user_profiles, video_segments, planned_content, etc.   │ │
│  │  • Row-Level Security (RLS) for data isolation                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        STORAGE BUCKETS                                 │ │
│  │  • generated-images (FLUX/DALL-E/GPT-Image outputs)                   │ │
│  │  • final_videos (completed video files)                               │ │
│  │  • avatars (user uploaded avatars)                                    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        AUTHENTICATION                                  │ │
│  │  • Email/Password with email confirmation                             │ │
│  │  • Google OAuth 2.0                                                   │ │
│  │  • WhatsApp OTP verification                                          │ │
│  │  • Session management with refresh tokens                             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                    │
                                    │ Video URLs for Processing
                                    │
┌───────────────────────────────────▼──────────────────────────────────────────┐
│                     PYTHON BACKEND (FastAPI + FFmpeg)                        │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  • POST /api/combine-final-video (FFmpeg concat + BGM mixing)         │ │
│  │  • GET /api/job-status/{job_id} (Job status polling)                  │ │
│  │  • GET /health (Health check + FFmpeg availability)                   │ │
│  │  • Async background worker for video processing                       │ │
│  │  • Supabase storage upload integration                                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Communication Flow

1. **User Interaction** → React Frontend (Client-side routing, state management)
2. **API Calls** → Supabase Edge Functions (Serverless AI workflows)
3. **Data Storage** → PostgreSQL + pgvector (Relational + Vector DB)
4. **File Storage** → Supabase Storage (Images, videos, avatars)
5. **Video Processing** → Python Backend (FFmpeg concatenation + BGM)
6. **AI Services** → External APIs (OpenAI, Gemini, FLUX, VEO, etc.)

---

## 🔧 Technology Stack

### Frontend Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2.0 | UI library with hooks and functional components |
| **TypeScript** | Latest | Type-safe development with full IntelliSense |
| **Vite** | 6.0.4 | Lightning-fast build tool and HMR dev server |
| **React Router DOM** | 6.8.1 | Client-side routing (25+ routes) |
| **Tailwind CSS** | 3.4.16 | Utility-first CSS framework |
| **Shadcn UI** | Latest | Accessible component library (Radix UI primitives) |
| **Framer Motion** | 12.23.25 | Animation library for smooth transitions |
| **Lucide React** | 0.453.0 | Modern, consistent icon library |
| **date-fns** | 4.1.0 | Date manipulation and formatting |
| **React Player** | 2.16.0 | Video/audio player with YouTube/Vimeo support |

**Key Frontend Statistics:**
- **29 Screen Components** (58 total .tsx files)
- **30+ UI Components** (buttons, cards, modals, selects, etc.)
- **5 Context Providers** (Auth, Onboarding, Planner, Theme, Language)
- **25+ Routes** (public + protected)

### Backend Layer (Supabase)

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Database** | PostgreSQL 15 + pgvector | Relational DB with vector similarity search |
| **Edge Functions** | Deno 1.x + TypeScript | Serverless API endpoints (12 functions) |
| **Authentication** | Supabase Auth | Email/Password, Google OAuth, session management |
| **Storage** | Supabase Storage | S3-compatible file storage with CDN |
| **Real-time** | Supabase Realtime | WebSocket-based live data sync |
| **Vector Search** | pgvector extension | 768-dimensional embeddings for RAG |

**Edge Functions (12 Total):**

| Function Name | Purpose | AI Service Used |
|---------------|---------|-----------------|
| `generate-script` | RAG-enhanced viral script generation | OpenRouter gemini-2.5-flash-lite → Gemini 2.0 Flash fallback |
| `generate-images` | Cinematic image generation (CREATOR + B-ROLL) | fal.ai nano-banana-2/edit / seedream-v4 |
| `generate-videos` | Sequential queue video generation + webhook handler | GeminiGen.AI VEO 3.1 / Grok 3 Aurora |
| `generate-tts` | Voice synthesis with cloning | fal.ai Chatterbox Turbo |
| `generate-music` | AI background music generation | fal.ai Minimax Music v2 |
| `generate-topic-suggestions` | AI topic generation + trending data | OpenRouter gemini-2.5-flash-lite → Gemini fallback |
| `generate-niche-recommendations` | Niche suggestions based on profile | OpenRouter gemini-2.5-flash-lite → Gemini fallback |
| `generate-niche-suggestions` | Alternative niche generation | OpenRouter gemini-2.5-flash-lite → Gemini fallback |
| `search-stock-images` | Stock image search (pool rotation) | Pexels (primary) + Unsplash (fallback) |
| `autocomplete-keywords` | Keyword autocomplete suggestions | Google Suggest API proxy |
| `send-whatsapp-otp` | Send OTP via WhatsApp | WhatsApp Business API |
| `verify-whatsapp-otp` | Verify WhatsApp OTP code | Internal verification |

### Python Backend (FastAPI)

| Component | Version | Purpose |
|-----------|---------|---------|
| **FastAPI** | 0.109.0 | Modern async web framework with auto docs |
| **Uvicorn** | 0.27.0 | Lightning-fast ASGI server |
| **FFmpeg** | System binary | Video concatenation, encoding, BGM mixing |
| **httpx** | 0.26.0 | Async HTTP client for file downloads |
| **python-dotenv** | 1.0.0 | Environment variable management |

**Python Backend Features:**
- ✅ Async video segment concatenation
- ✅ Background music mixing with volume control
- ✅ Job queue with status tracking (processing → completed/failed)
- ✅ Supabase storage upload integration
- ✅ Health check with FFmpeg availability test
- ✅ API key authentication

### AI/ML Services

| Service | Model | Purpose | Cost Tier |
|---------|-------|---------|-----------|
| **OpenRouter** | google/gemini-2.5-flash-lite | Primary script/topic/niche generation | 💰 PAID (PRIMARY) |
| **Google Gemini** | gemini-2.0-flash | Fallback script generation | 🆓 FREE (FALLBACK) |
| **Google Gemini** | text-embedding-004 | RAG embeddings (768D) | 🆓 FREE |
| **fal.ai** | nano-banana-2/edit | CREATOR shots (face consistency, $0.08) | 💰 PAID |
| **fal.ai** | seedream-v4 | B-ROLL image generation ($0.03) | 💰 PAID |
| **GeminiGen.AI** | VEO 3.1 Fast HD | Video generation 720p ($0.015, 8s) | 💰 PAID (DEFAULT) |
| **GeminiGen.AI** | VEO 3.1 FHD | Video generation 1080p premium ($0.50, 8s) | 💰 PAID |
| **GeminiGen.AI** | Grok 3 Aurora | Video generation 720p ($0.015, 6–15s) | 💰 PAID |
| **fal.ai** | Chatterbox Turbo | TTS with voice cloning | 💰 PAID |
| **fal.ai** | Minimax Music v2 | AI background music generation | 💰 PAID |
| **Pexels / Unsplash** | API | Stock image sourcing (pool rotation) | 🆓 FREE |

**Hybrid Provider Strategy:**

The platform uses a **smart cost-optimization strategy**:

1. **CREATOR Shots** (Hook, CTA with creator's face):
   - Uses **fal.ai nano-banana-2/edit** ($0.08) with reference images for face consistency
   - Fallback: qwen-image-2/pro/edit ($0.075) → seedream-v5/lite/edit ($0.035)

2. **B-ROLL Shots** (Foreshadow, Body, Peak without faces):
   - Uses **fal.ai seedream-v4** ($0.03) — no reference image, pure cinematic
   - Fallback: seedream-v4.5 ($0.04) → qwen-image-2 ($0.035)

3. **Script Generation**:
   - Primary: **OpenRouter google/gemini-2.5-flash-lite** (PAID — always try first)
   - Fallback: **Gemini 2.0 Flash direct** (FREE — strict rate limits)
   - Key rotation: api_keys_pool table (NOT env vars)

4. **Video Generation**:
   - Sequential queue: 1 job at a time via `pendingJobQueueRef`
   - GeminiGen webhook → updates `video_generation_jobs` → Supabase Realtime → next job

---

## 🎬 Video Generation Pipeline

The complete video creation pipeline consists of 6 automated stages:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                      VIDEO GENERATION PIPELINE                            │
└───────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐
  │  1. TOPIC GEN    │  Generate 5 AI-powered topic suggestions
  │  GPT-3.5-turbo   │  Input: niche, interests, profession, platform
  └────────┬─────────┘  Output: 5 personalized topics with descriptions
           │
           ▼
  ┌──────────────────┐
  │  2. SCRIPT GEN   │  RAG-enhanced viral script generation
  │  Gemini 2.0 Flash│  Query: match_knowledge RPC (768D vector search)
  │  + Llama 3.3-70b │  Context: Top 10 knowledge chunks from 16 documents
  └────────┬─────────┘  Output: 4-6 segments (Hook → Foreshadow → Body → Peak → CTA)
           │            Each segment: script_text, visual_direction, emotion, shot_type
           ▼
  ┌──────────────────┐
  │  3. IMAGE GEN    │  Dual-provider cinematic image generation
  │  FLUX.1 (B-ROLL) │  CREATOR shots (Hook, CTA): GPT-Image-1 + character_ref_png
  │  GPT-Img (FACE)  │  B-ROLL shots (Foreshadow, Body, Peak): FLUX.1-schnell
  └────────┬─────────┘  Style: cinematic, realistic, animated
           │            Aspect ratio: 9:16 vertical
           ▼            Output: Image URLs stored in Supabase 'generated-images'
  ┌──────────────────┐
  │  4. VIDEO GEN    │  GeminiGen.AI — sequential queue (1 job at a time)
  │  GeminiGen.AI    │  create_jobs → process_single (submit to GeminiGen)
  │  VEO 3.1 / Grok3 │  Duration: 8s (VEO) / 6–15s (Grok 3 Aurora)
  └────────┬─────────┘  Quality: 720p (default) / 1080p (premium)
           │            Output: video_generation_jobs DB records
           ▼
  ┌──────────────────┐
  │  5. WEBHOOK +    │  GeminiGen calls Supabase webhook on completion
  │  REALTIME        │  webhook → updates video_generation_jobs status
  │                  │  Supabase Realtime → VideoStep UI → submit next job
  └────────┬─────────┘  Status: 0=pending 1=processing 2=completed 3=failed
           │            Output: video_url when status = 2
           ▼
  ┌──────────────────┐
  │  6. FINAL ASSEM  │  FFmpeg video concatenation + BGM mixing
  │  Python Backend  │  Process: Download segments → concat.txt → ffmpeg
  │  FastAPI+FFmpeg  │  BGM: Add background music at 15% volume
  └────────┬─────────┘  Upload: Supabase 'final_videos' bucket
           │            Output: final_video_url + metadata (duration, size, resolution)
           ▼
  ┌──────────────────┐
  │  7. PUBLISHING   │  Save to content calendar and publish
  │  Planner         │  Save: planned_content table with video_data
  └──────────────────┘  Schedule: Draft/scheduled/published status
                        Track: social_media_analytics per platform
```

### Segment Structure Examples

**30-Second Video (4 segments):**
1. **HOOK** (6s) - Attention-grabbing opener with pattern interrupt
2. **FORESHADOW** (6s) - Build curiosity and set expectations
3. **BODY-1** (10s) - Main content delivery
4. **CTA** (8s) - Call-to-action and ending

**60-Second Video (6 segments):**
1. **HOOK** (6s)
2. **FORESHADOW** (6s)
3. **BODY-1** (10s)
4. **BODY-2** (10s)
5. **PEAK** (20s) - Climax or most valuable insight
6. **CTA** (8s)

**90-Second Video (7+ segments):**
1. **HOOK** (6s)
2. **FORESHADOW** (6s)
3. **BODY-1** (10s)
4. **BODY-2** (10s)
5. **BODY-3** (10s)
6. **PEAK** (30s)
7. **CTA** (8s)

### Shot Type Auto-Assignment

| Segment Type | Default Shot Type | Rationale |
|--------------|-------------------|-----------|
| HOOK | CREATOR | Face-to-camera builds connection and trust |
| FORESHADOW | B-ROLL | Illustrative visuals maintain curiosity |
| BODY-1/2/3 | B-ROLL | Focus on content, not creator |
| PEAK | B-ROLL | Highlight key moment/insight |
| CTA | CREATOR | Personal appeal for action (like, follow, share) |

---

## 🎛 FFmpeg Quick Reference

FFmpeg is used for final video assembly, audio mixing, and subtitle burn-in.

### Video Transitions (58 Available)

Use with `xfade` filter: `ffmpeg -i clip1.mp4 -i clip2.mp4 -filter_complex "xfade=transition=fade:duration=0.5:offset=4"`

| Category | Transitions |
|----------|-------------|
| **Basic** | fade, dissolve, distance, wipeleft, wiperight, wipeup, wipedown |
| **Slide** | slideleft, slideright, slideup, slidedown, smoothleft, smoothright |
| **Zoom** | zoomin, fadefast, fadeslow, hlslice, hrslice, vuslice, vdslice |
| **Circle** | circleopen, circleclose, circlecrop, rectcrop |
| **Diagonal** | diagtl, diagtr, diagbl, diagbr, hlwind, hrwind |
| **Special** | squeezeh, squeezev, fadegrays, pixelize, radial, hblur |
| **Cover** | coverup, coverdown, coverleft, coverright |
| **Reveal** | revealup, revealdown, revealleft, revealright |

### Audio Filters

| Filter | Purpose | Example |
|--------|---------|--------|
| `volume` | Adjust volume | `volume=0.3` (30%) |
| `afade` | Fade in/out | `afade=t=in:d=2` (2s fade in) |
| `amix` | Mix multiple tracks | `amix=inputs=2:duration=longest` |
| `sidechaincompress` | Audio ducking (auto-lower BGM during speech) | See example below |
| `loudnorm` | EBU R128 normalization | `loudnorm=I=-16:TP=-1.5:LRA=11` |
| `apad` | Pad audio to match video | `apad=whole_dur=60` |

**Audio Ducking Example:**
```bash
ffmpeg -i voice.mp3 -i bgm.mp3 -filter_complex \
  "[1:a]asplit=2[sc][mix];[0:a][sc]sidechaincompress=threshold=0.03:ratio=4:attack=200:release=1000[compr];[compr][mix]amix=inputs=2:duration=first" \
  output.mp3
```

### Subtitle Filters

| Filter | Format | Example |
|--------|--------|--------|
| `subtitles` | SRT/VTT | `subtitles=file.srt:force_style='FontSize=24'` |
| `ass` | ASS (styled) | `ass=file.ass` |

**ASS Subtitle with Word-by-Word Animation:**
```ass
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, Bold, Alignment, MarginV
Style: Default,Montserrat,60,&H00FFFFFF,1,2,100

[Events]
Format: Layer, Start, End, Style, Text
Dialogue: 0,0:00:00.00,0:00:00.50,Default,{\k50}Hello
Dialogue: 0,0:00:00.50,0:00:01.00,Default,{\k50}World
```

### Common Video Processing Commands

**Concatenate Videos:**
```bash
# Create concat.txt:
# file 'clip1.mp4'
# file 'clip2.mp4'
ffmpeg -f concat -safe 0 -i concat.txt -c copy output.mp4
```

**Add BGM to Video:**
```bash
ffmpeg -i video.mp4 -i bgm.mp3 -filter_complex \
  "[1:a]volume=0.15[bgm];[0:a][bgm]amix=inputs=2:duration=first" \
  -c:v copy output.mp4
```

**Burn Subtitles:**
```bash
ffmpeg -i video.mp4 -vf "ass=subtitles.ass" -c:a copy output.mp4
```

**Full Pipeline (Concat + BGM + Subtitles):**
```bash
ffmpeg -f concat -safe 0 -i concat.txt -i bgm.mp3 -filter_complex \
  "[0:v]ass=subtitles.ass[v];[1:a]volume=0.15[bgm];[0:a][bgm]amix=inputs=2[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset fast output.mp4
```

### Transcription (Groq Whisper - FREE)

| Spec | Value |
|------|-------|
| **Model** | `whisper-large-v3-turbo` |
| **Output** | `verbose_json` (word-level timestamps) |
| **Language** | `id` (Indonesian), supports code-mixing |
| **Limit** | 14,400 requests/day (~2,000 audio hours/month) |

```python
from groq import Groq
client = Groq(api_key=os.environ["GROQ_API_KEY"])

transcription = client.audio.transcriptions.create(
    file=open("audio.mp3", "rb"),
    model="whisper-large-v3-turbo",
    response_format="verbose_json",
    language="id"
)
```

### BGM/SFX Library (Pixabay - FREE)

| Spec | Value |
|------|-------|
| **API** | REST search + direct download |
| **License** | Royalty-free commercial use |
| **Limit** | 5,000 requests/month |
| **Categories** | upbeat, calm, dramatic, corporate, electronic |

```python
import requests

response = requests.get(
    "https://pixabay.com/api/",
    params={
        "key": os.environ["PIXABAY_KEY"],
        "q": "upbeat background music",
        "category": "music"
    }
)
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v16+ and npm/yarn
- **Python** 3.10+ (for backend)
- **FFmpeg** (for video processing)
- **Git** (for version control)
- **Supabase CLI** (optional, for local development)

You'll also need API keys from:

| Service | Free Tier Available | Required For |
|---------|---------------------|--------------|
| [OpenAI](https://platform.openai.com/) | No (requires payment) | Topic generation, GPT-Image-1, DALL-E 3 |
| [OpenRouter](https://openrouter.ai/) | ✅ Yes (Llama 3.3-70b FREE) | Script generation fallback |
| [Google AI Studio](https://makersuite.google.com/app/apikey) | ✅ Yes | Gemini 2.0 Flash, embeddings |
| [HuggingFace](https://huggingface.co/settings/tokens) | ✅ Yes | FLUX.1-schnell image generation |
| [VEO (GeminiGen)](https://geminigen.ai/) | No (requires payment) | Video generation with voiceover |
| [Pexels](https://www.pexels.com/api/) | ✅ Yes | Stock image sourcing |
| [Supabase](https://supabase.com/) | ✅ Yes (free tier sufficient) | Database, auth, storage, functions |

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/sparkfluence_platform.git
cd sparkfluence_platform
```

#### 2. Install Frontend Dependencies

```bash
npm install
```

#### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 4. Configure Supabase

**A. Create Supabase Project**

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings → API

**B. Run Database Migrations**

Option 1: Using Supabase Dashboard (SQL Editor)
- Copy contents of each migration file from `supabase/migrations/`
- Run them in order in the SQL Editor

Option 2: Using Supabase CLI
```bash
supabase link --project-ref your-project-ref
supabase db push
```

**C. Create Storage Buckets**

Run this SQL in Supabase SQL Editor:

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('generated-images', 'generated-images', true),
  ('final_videos', 'final_videos', true),
  ('avatars', 'avatars', true);

-- Set storage policies (allow authenticated users)
CREATE POLICY "Users can upload images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'generated-images');

CREATE POLICY "Users can upload videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'final_videos');

CREATE POLICY "Public access to images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'generated-images');

CREATE POLICY "Public access to videos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'final_videos');
```

**D. Configure OAuth Providers**

1. Go to Authentication → Providers in Supabase dashboard
2. Enable Google OAuth
3. Add your OAuth credentials (Client ID, Client Secret)
4. Add authorized redirect URLs:
   - `http://localhost:5173/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)

#### 5. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy generate-script
supabase functions deploy generate-images
supabase functions deploy generate-videos
supabase functions deploy check-video-status
supabase functions deploy generate-topic-suggestions
supabase functions deploy generate-niche-recommendations
supabase functions deploy generate-niche-suggestions
supabase functions deploy recommend-styles
supabase functions deploy analyze-avatar
supabase functions deploy send-whatsapp-otp
supabase functions deploy verify-whatsapp-otp
supabase functions deploy test-env
```

#### 6. Set Supabase Secrets (API Keys)

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
supabase secrets set GEMINI_API_KEY=AIza...
supabase secrets set HUGGINGFACE_API_KEY=hf_...
supabase secrets set VEO_API_KEY=...
supabase secrets set PEXELS_API_KEY=...

# Verify secrets are set
supabase secrets list
```

#### 7. Set Up Python Backend (Optional)

The Python backend is required for final video assembly with background music.

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BACKEND_API_KEY=your_secure_random_api_key
```

**Generate a secure API key:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### 8. Populate RAG Knowledge Base (Optional)

If you have the knowledge base documents, populate the vector database:

```bash
cd docs/n8n
pip install -r requirements.txt

# Create .env with Supabase credentials
cat > .env << EOF
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
GEMINI_API_KEY=AIza...
EOF

# Run embedding script for viral script knowledge
python chunk_and_embed.py --folder "path/to/Viral_Script_Generator" --project-type viral_script

# Run embedding script for image/video knowledge
python chunk_and_embed.py --folder "path/to/Image_and_Video_Generator" --project-type image_video

# Verify embeddings
# Run this in Supabase SQL Editor:
# SELECT project_type, file_name, COUNT(*) as chunks
# FROM knowledge_embeddings
# GROUP BY project_type, file_name;
```

### Running the Application

#### Development Mode

**Terminal 1: Frontend**
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

**Terminal 2: Python Backend (if using final video assembly)**
```bash
cd backend
uvicorn main:app --reload
```
The backend API will be available at `http://localhost:8000`

**Terminal 3: Supabase Local (optional, for local development)**
```bash
supabase start
```

#### Production Build

```bash
# Build frontend
npm run build

# Preview production build
npm run preview

# Deploy frontend to Vercel/Netlify/Cloudflare Pages
vercel --prod
# OR
netlify deploy --prod
```

### Verify Installation

1. **Test Environment Variables**
   ```bash
   curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/test-env \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Content-Type: application/json"
   ```

2. **Test Backend Health**
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status": "healthy", "ffmpeg_available": true}`

3. **Access Application**
   - Open `http://localhost:5173`
   - Create account via Register
   - Complete onboarding flow
   - Generate your first video!

---

## 📁 Project Structure

```
sparkfluence_platform/
│
├── 📂 src/                           # Frontend React application
│   │
│   ├── 📂 components/                # Reusable UI components
│   │   ├── 📂 ui/                   # Shadcn UI primitives (30+ components)
│   │   │   ├── button.tsx           # Button component
│   │   │   ├── card.tsx             # Card component
│   │   │   ├── input.tsx            # Input component
│   │   │   ├── select.tsx           # Select dropdown
│   │   │   ├── modal.tsx            # Modal dialog
│   │   │   ├── tabs.tsx             # Tab navigation
│   │   │   └── ...                  # (+ 24 more components)
│   │   │
│   │   ├── WelcomeModal.tsx         # First login welcome modal
│   │   ├── LoadingScreen.tsx        # Global loading indicator
│   │   ├── Navbar.tsx               # Navigation header
│   │   └── Footer.tsx               # Footer component
│   │
│   ├── 📂 contexts/                  # React Context providers for state
│   │   ├── AuthContext.tsx          # Authentication state (user, session, signIn/signOut)
│   │   ├── OnboardingContext.tsx    # Onboarding flow data persistence
│   │   ├── PlannerContext.tsx       # Content calendar state management
│   │   ├── ThemeContext.tsx         # Dark mode toggle
│   │   └── LanguageContext.tsx      # Multi-language support
│   │
│   ├── 📂 screens/                   # Application screens (29 total)
│   │   ├── 📂 Landing/              # Marketing landing page
│   │   ├── 📂 Login/                # Login screen
│   │   ├── 📂 Register/             # Registration screen
│   │   ├── 📂 Welcome/              # First login welcome
│   │   ├── 📂 PackageSelection/     # Plan selection
│   │   ├── 📂 Onboarding/           # Multi-step setup
│   │   ├── 📂 NicheRecommendations/ # AI niche suggestions
│   │   ├── 📂 CreativeDNA/          # Creative style profiling
│   │   ├── 📂 AvatarUpload/         # Avatar upload
│   │   ├── 📂 AvatarPreview/        # Avatar preview
│   │   ├── 📂 ContentCuration/      # Content strategy setup
│   │   ├── 📂 TopicSelection/       # AI topic picker
│   │   ├── 📂 ScriptLab/            # Script generation and editing
│   │   ├── 📂 VideoEditor/          # Multi-segment video editor
│   │   ├── 📂 VideoGeneration/      # VEO video generation
│   │   ├── 📂 MusicSelector/        # Background music selection
│   │   ├── 📂 Loading/              # Loading state screen
│   │   ├── 📂 FullVideo/            # Full video assembly
│   │   ├── 📂 FullVideoPreview/     # Preview final video
│   │   ├── 📂 Dashboard/            # Analytics dashboard
│   │   ├── 📂 Planner/              # Content calendar
│   │   │   └── 📂 views/            # MonthlyView, WeeklyView, ListView
│   │   ├── 📂 Gallery/              # Video library
│   │   ├── 📂 History/              # Creation history
│   │   ├── 📂 Settings/             # User settings
│   │   │   ├── Settings.tsx
│   │   │   ├── PlanBilling.tsx      # Plan and billing management
│   │   │   ├── Profile.tsx          # User profile
│   │   │   ├── LinkedAccounts.tsx   # Social media connections
│   │   │   └── Notifications.tsx    # Notification settings
│   │   ├── 📂 Pricing/              # Pricing plans page
│   │   ├── 📂 Resources/            # Resource library
│   │   └── 📂 Help/                 # Help center
│   │
│   ├── 📂 lib/                       # Utility libraries
│   │   ├── supabase.ts              # Supabase client initialization
│   │   └── utils.ts                 # Utility functions (cn, formatDate, etc.)
│   │
│   ├── index.css                     # Global styles and Tailwind directives
│   ├── index.tsx                     # App entry point with routing
│   └── vite-env.d.ts                 # Vite type definitions
│
├── 📂 supabase/                      # Supabase backend configuration
│   │
│   ├── 📂 functions/                 # Edge Functions (Deno/TypeScript)
│   │   ├── 📂 generate-script/      # RAG-enhanced script generation
│   │   │   └── index.ts             # (166 lines)
│   │   ├── 📂 generate-images/      # Dual-provider image generation
│   │   │   └── index.ts             # (181 lines)
│   │   ├── 📂 generate-videos/      # VEO video generation
│   │   │   └── index.ts             # (190 lines)
│   │   ├── 📂 check-video-status/   # VEO status polling
│   │   │   └── index.ts             # (119 lines)
│   │   ├── 📂 generate-topic-suggestions/
│   │   │   └── index.ts
│   │   ├── 📂 generate-niche-recommendations/
│   │   │   └── index.ts
│   │   ├── 📂 generate-niche-suggestions/
│   │   │   └── index.ts
│   │   ├── 📂 recommend-styles/
│   │   │   └── index.ts
│   │   ├── 📂 analyze-avatar/
│   │   │   └── index.ts
│   │   ├── 📂 send-whatsapp-otp/
│   │   │   └── index.ts
│   │   ├── 📂 verify-whatsapp-otp/
│   │   │   └── index.ts
│   │   └── 📂 test-env/             # Environment validation
│   │       └── index.ts             # (96 lines)
│   │
│   └── 📂 migrations/                # Database schema migrations (12 files)
│       ├── 20240101000000_initial_schema.sql
│       ├── 20240102000000_add_user_profiles.sql
│       ├── 20240103000000_add_video_segments.sql
│       ├── 20240104000000_add_planned_content.sql
│       ├── 20240105000000_add_tokens_system.sql
│       ├── 20240106000000_add_analytics.sql
│       ├── 20240107000000_add_knowledge_embeddings.sql
│       ├── 20240108000000_add_image_jobs.sql
│       ├── 20240109000000_add_video_jobs.sql
│       ├── 20240110000000_add_niche_cache.sql
│       ├── 20240111000000_add_api_keys_pool.sql
│       └── 20240112000000_add_notifications.sql
│
├── 📂 backend/                       # Python FastAPI backend
│   ├── main.py                       # FastAPI server (387 lines)
│   │                                 # - POST /api/combine-final-video
│   │                                 # - GET /api/job-status/{job_id}
│   │                                 # - GET /health
│   ├── requirements.txt              # Python dependencies
│   └── .env                          # Backend environment variables
│
├── 📂 docs/                          # Documentation and tools
│   └── 📂 n8n/                       # RAG knowledge embedding pipeline
│       ├── chunk_and_embed.py        # Embedding generation script (Gemini 768D)
│       ├── requirements.txt          # Python dependencies
│       ├── api_contracts.md          # API documentation
│       └── supabase_vector_schema.sql # Vector DB schema
│
├── 📂 public/                        # Static assets
│   ├── sparkfluence-logo.png        # App logo
│   ├── favicon.ico                   # Favicon
│   └── ...                           # Other static files
│
├── 📄 package.json                   # npm dependencies and scripts
├── 📄 package-lock.json              # Lockfile for exact versions
├── 📄 tsconfig.json                  # TypeScript configuration
├── 📄 tsconfig.node.json             # TypeScript config for Node
├── 📄 vite.config.ts                 # Vite build configuration
├── 📄 tailwind.config.js             # Tailwind CSS configuration
├── 📄 postcss.config.js              # PostCSS configuration
├── 📄 components.json                # Shadcn UI configuration
├── 📄 .gitignore                     # Git ignore patterns
├── 📄 .env                           # Environment variables (not committed)
├── 📄 CLAUDE.md                      # Developer guide for AI assistants
└── 📄 README.md                      # This file
```

### File Count Summary

- **Frontend Screen Files**: 58 .tsx files
- **UI Components**: 30+ components
- **Edge Functions**: 12 functions
- **Database Migrations**: 12 migration files
- **Context Providers**: 5 providers
- **Routes**: 25+ routes

---

## 🗄 Database Schema

### Entity Relationship Diagram

```
┌─────────────────────┐
│    auth.users       │ (Managed by Supabase Auth)
│  ────────────────   │
│  • id (PK)          │
│  • email            │
│  • created_at       │
└──────────┬──────────┘
           │
           │ 1:1
           ▼
┌─────────────────────┐        ┌──────────────────────┐
│  user_profiles      │        │  planned_content     │
│  ─────────────────  │        │  ──────────────────  │
│  • id (PK)          │◄───┐   │  • id (PK)           │
│  • user_id (FK)     │    │   │  • user_id (FK)      │
│  • first_login      │    │   │  • title             │
│  • onboarding_done  │    │   │  • description       │
│  • character_desc   │    │   │  • content_type      │
│  • avatar_url       │    │   │  • platforms         │
│  • character_ref_png│    │   │  • scheduled_date    │
│  • country          │    │   │  • status            │
└─────────────────────┘    │   │  • video_data        │
                           │   │  • final_video_url   │
                           │   └──────────────────────┘
                           │
                           │ 1:N
                           │
           ┌───────────────┴───────────────┬──────────────────────┐
           ▼                               ▼                      ▼
┌─────────────────────┐     ┌──────────────────────┐   ┌──────────────────────┐
│  video_segments     │     │  user_tokens         │   │  social_media_       │
│  ─────────────────  │     │  ──────────────────  │   │  analytics           │
│  • id (PK)          │     │  • id (PK)           │   │  ──────────────────  │
│  • user_id (FK)     │     │  • user_id (FK)      │   │  • id (PK)           │
│  • topic_id         │     │  • balance           │   │  • user_id (FK)      │
│  • segment_number   │     │  • created_at        │   │  • planned_content_id│
│  • element          │     │  • updated_at        │   │  • platform          │
│  • duration         │     └──────────────────────┘   │  • total_views       │
│  • script           │                                │  • engagement_count  │
│  • visual_prompt    │                                │  • likes_count       │
│  • image_url        │     ┌──────────────────────┐   │  • followers         │
│  • video_url        │     │  token_purchases     │   │  • watch_time        │
└─────────────────────┘     │  ──────────────────  │   │  • engagement_rate   │
                            │  • id (PK)           │   └──────────────────────┘
┌─────────────────────┐     │  • user_id (FK)      │
│  knowledge_         │     │  • tokens            │
│  embeddings         │     │  • amount            │
│  ─────────────────  │     │  • payment_method    │
│  • id (PK)          │     │  • status            │
│  • project_type     │     └──────────────────────┘
│  • file_name        │
│  • section_title    │     ┌──────────────────────┐
│  • chunk_text       │     │  notifications       │
│  • embedding        │     │  ──────────────────  │
│    (vector 768)     │     │  • id (PK)           │
│  • metadata         │     │  • user_id (FK)      │
└─────────────────────┘     │  • type              │
                            │  • title             │
                            │  • message           │
                            │  • read              │
                            └──────────────────────┘
```

### Table Details

#### **user_profiles** (Extended user data)
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_login BOOLEAN DEFAULT TRUE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  character_description TEXT,           -- AI-generated avatar description
  avatar_url TEXT,                       -- Uploaded avatar URL
  character_ref_png TEXT,                -- Character reference for GPT-Image-1
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);
```

#### **video_segments** (Individual segment data)
```sql
CREATE TABLE video_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID,                         -- Link to topic (if from topic generator)
  segment_number INTEGER,
  element TEXT,                          -- HOOK, FORESHADOW, BODY, PEAK, CTA
  duration TEXT,                         -- "7.5 Second", "10 Second"
  script TEXT,                           -- Script text with Gen-Z slang
  visual_prompt TEXT,                    -- Visual direction for image/video gen
  image_url TEXT,                        -- Generated image URL
  video_url TEXT,                        -- VEO generated video URL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_segments_user_id ON video_segments(user_id);
CREATE INDEX idx_video_segments_topic_id ON video_segments(topic_id);

-- RLS: Users can manage their own segments
CREATE POLICY "Users can manage own segments" ON video_segments
  FOR ALL USING (auth.uid() = user_id);
```

#### **planned_content** (Content calendar)
```sql
CREATE TABLE planned_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT,                     -- video, image, post
  platforms TEXT[],                      -- ['tiktok', 'instagram', 'youtube']
  scheduled_date DATE,
  scheduled_time TIME,
  status TEXT DEFAULT 'draft',           -- draft, scheduled, published
  thumbnail_url TEXT,
  video_data JSONB,                      -- {segments: [...], metadata: {...}}
  final_video_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_planned_content_user_id ON planned_content(user_id);
CREATE INDEX idx_planned_content_scheduled_date ON planned_content(scheduled_date);

-- RLS: Users can manage their own planned content
CREATE POLICY "Users can manage own content" ON planned_content
  FOR ALL USING (auth.uid() = user_id);
```

#### **knowledge_embeddings** (RAG vector store)
```sql
CREATE TABLE knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type TEXT NOT NULL,            -- 'viral_script', 'image_video'
  file_name TEXT NOT NULL,
  section_title TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(768),                 -- Gemini text-embedding-004 (768D)
  metadata JSONB,                        -- {char_count, chunk_index, etc.}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_embeddings_project_type
  ON knowledge_embeddings(project_type);

-- Vector similarity search function (pgvector)
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  project_type TEXT,
  file_name TEXT,
  section_title TEXT,
  chunk_text TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    project_type,
    file_name,
    section_title,
    chunk_text,
    1 - (embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- RLS: Service role only (no public access)
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;
```

#### **social_media_analytics** (Performance tracking)
```sql
CREATE TABLE social_media_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  planned_content_id UUID REFERENCES planned_content(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,                -- TikTok, Instagram, YouTube, Meta
  platform_post_id TEXT,
  post_url TEXT,
  published_at TIMESTAMPTZ,

  -- Engagement metrics
  total_views BIGINT DEFAULT 0,
  engagement_count BIGINT DEFAULT 0,
  likes_count BIGINT DEFAULT 0,
  comments_count BIGINT DEFAULT 0,
  shares_count BIGINT DEFAULT 0,
  saves_count BIGINT DEFAULT 0,

  -- Follower metrics
  followers_at_publish BIGINT,
  current_followers BIGINT,

  -- Reach and impressions
  reach BIGINT,
  impressions BIGINT,

  -- Engagement rates
  engagement_rate DECIMAL(5,2),

  -- Watch metrics
  watch_time_seconds BIGINT,
  average_watch_percentage DECIMAL(5,2),
  click_through_rate DECIMAL(5,2),

  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_user_id ON social_media_analytics(user_id);
CREATE INDEX idx_analytics_platform ON social_media_analytics(platform);
CREATE INDEX idx_analytics_published_at ON social_media_analytics(published_at);

-- RLS: Users can manage their own analytics
CREATE POLICY "Users can manage own analytics" ON social_media_analytics
  FOR ALL USING (auth.uid() = user_id);
```

#### **user_tokens** (Credit system)
```sql
CREATE TABLE user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,             -- Token balance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can view/update their own tokens
CREATE POLICY "Users can manage own tokens" ON user_tokens
  FOR ALL USING (auth.uid() = user_id);
```

#### **token_purchases** (Purchase history)
```sql
CREATE TABLE token_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens INTEGER NOT NULL,
  amount INTEGER NOT NULL,               -- In Rupiah (IDR)
  payment_method TEXT,                   -- 'credit_card', 'bank_transfer', etc.
  status TEXT DEFAULT 'pending',         -- pending, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_token_purchases_user_id ON token_purchases(user_id);
CREATE INDEX idx_token_purchases_status ON token_purchases(status);

-- RLS: Users can view their own purchases
CREATE POLICY "Users can view own purchases" ON token_purchases
  FOR SELECT USING (auth.uid() = user_id);
```

### Row-Level Security (RLS)

All user-specific tables implement **Row-Level Security** policies to ensure:

- ✅ Users can only access their own data
- ✅ Service role can access all data (for Edge Functions)
- ✅ Public data is explicitly marked (e.g., `is_public = true`)
- ✅ No data leakage between users

**Example RLS Policy:**
```sql
-- Users can only see their own video segments
CREATE POLICY "Users can select own segments" ON video_segments
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own segments
CREATE POLICY "Users can insert own segments" ON video_segments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own segments
CREATE POLICY "Users can update own segments" ON video_segments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own segments
CREATE POLICY "Users can delete own segments" ON video_segments
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 📡 API Documentation

### Supabase Edge Functions

All Edge Functions follow this pattern:

- **Authentication**: Bearer token from Supabase Auth
- **Content-Type**: `application/json`
- **CORS**: Enabled for all origins
- **Error Handling**: Consistent error response format

#### Base URL
```
https://YOUR_PROJECT.supabase.co/functions/v1/
```

#### Authentication Header
```
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
```

---

### 1. Generate Script (RAG-Enhanced)

**Endpoint:** `POST /generate-script`

Generates viral short-form video scripts using RAG-enhanced AI with knowledge base grounding.

**Request Body:**
```json
{
  "input_type": "topic",
  "content": "10 VS Code Extensions That Changed My Life",
  "duration": "30s",
  "platform": "tiktok",
  "language": "indonesian"
}
```

**Parameters:**
- `input_type` (string): `"topic"` or `"custom"`
- `content` (string): Topic or custom script prompt
- `duration` (string): `"30s"`, `"60s"`, `"90s"`
- `platform` (string): `"tiktok"`, `"instagram"`, `"youtube"`
- `language` (string): `"indonesian"`, `"english"`, `"hindi"`

**Response:**
```json
{
  "success": true,
  "data": {
    "segments": [
      {
        "type": "HOOK",
        "duration_seconds": 6,
        "script_text": "Lo tau gak 10 extension VS Code ini literally changed my life as a developer...",
        "visual_direction": "Enthusiastic developer at computer, VS Code visible on screen, cinematic lighting",
        "emotion": "shock",
        "shot_type": "CREATOR",
        "transition": "Match Cut"
      },
      {
        "type": "FORESHADOW",
        "duration_seconds": 6,
        "script_text": "Dari yang bikin coding jadi 10x lebih cepet, sampe yang bikin workflow lo super smooth...",
        "visual_direction": "Close-up of VS Code interface with extensions highlighted",
        "emotion": "curiosity",
        "shot_type": "B-ROLL",
        "transition": "L-Cut"
      },
      {
        "type": "BODY-1",
        "duration_seconds": 10,
        "script_text": "Extension pertama, GitLens. Ini game changer buat lo yang kerja sama tim...",
        "visual_direction": "Screen recording showing GitLens features in action",
        "emotion": "excitement",
        "shot_type": "B-ROLL",
        "transition": "J-Cut"
      }
      // ... more segments
    ],
    "metadata": {
      "virality_score": 8.5,
      "hooks_used": ["curiosity_gap", "pattern_interrupt"],
      "total_duration": 30,
      "language": "indonesian",
      "segment_count": 4,
      "rag_context_used": true
    }
  }
}
```

**RAG Context Included:**
- Top 10 knowledge chunks from `viral_script` documents
- Similarity threshold: 0.5
- Uses Gemini text-embedding-004 (768D) for semantic search

---

### 2. Generate Images

**Endpoint:** `POST /generate-images`

Generates cinematic images for video segments using dual-provider strategy.

**Request Body:**
```json
{
  "segments": [
    {
      "type": "HOOK",
      "script_text": "Lo tau gak 10 extension VS Code...",
      "visual_direction": "Enthusiastic developer at computer",
      "emotion": "shock",
      "shot_type": "CREATOR"
    },
    {
      "type": "BODY-1",
      "script_text": "Extension pertama, GitLens...",
      "visual_direction": "Screen recording showing GitLens",
      "emotion": "excitement",
      "shot_type": "B-ROLL"
    }
  ],
  "style": "cinematic",
  "aspect_ratio": "9:16",
  "provider": "auto"
}
```

**Parameters:**
- `segments` (array): Segment objects with visual_direction
- `style` (string): `"cinematic"`, `"realistic"`, `"animated"`
- `aspect_ratio` (string): `"9:16"` (vertical), `"16:9"` (horizontal)
- `provider` (string): `"auto"`, `"huggingface"`, `"openai-dalle"`, `"openai-gpt-image"`

**Provider Selection Logic (Auto Mode):**
- `shot_type === "CREATOR"` → GPT-Image-1 (with character_ref_png)
- `shot_type === "B-ROLL"` → FLUX.1-schnell (FREE)

**Response:**
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "segment_type": "HOOK",
        "prompt": "Cinematic photography, 9:16 vertical aspect ratio. Enthusiastic Indonesian developer...",
        "image_url": "https://YOUR_PROJECT.supabase.co/storage/v1/object/public/generated-images/hook_123.png",
        "provider": "openai-gpt-image",
        "character_ref_used": true,
        "revised_prompt": null
      },
      {
        "segment_type": "BODY-1",
        "prompt": "Cinematic B-roll shot, 9:16 vertical. Close-up of VS Code interface...",
        "image_url": "https://YOUR_PROJECT.supabase.co/storage/v1/object/public/generated-images/body1_456.png",
        "provider": "huggingface",
        "character_ref_used": false,
        "revised_prompt": null
      }
    ],
    "total_images": 2,
    "total_cost_estimate": 0.05
  }
}
```

---

### 3. Generate Videos (VEO 3.1)

**Endpoint:** `POST /generate-videos`

Generates professional videos with AI voiceover using VEO 3.1.

**Request Body:**
```json
{
  "segments": [
    {
      "type": "HOOK",
      "script_text": "Lo tau gak 10 extension VS Code ini literally changed my life...",
      "visual_direction": "Enthusiastic developer at computer",
      "emotion": "shock"
    }
  ],
  "images": [
    {
      "segment_type": "HOOK",
      "image_url": "https://...generated-images/hook_123.png"
    }
  ],
  "language": "indonesian"
}
```

**Parameters:**
- `segments` (array): Segment objects with script_text
- `images` (array): Image objects with URLs
- `language` (string): `"indonesian"`, `"english"`, `"hindi"`

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "segment_type": "HOOK",
        "veo_response": {
          "id": 12345,
          "uuid": "abc123-def456-ghi789",
          "model_name": "veo-3.1-fast",
          "status": 1,
          "status_percentage": 0,
          "estimated_credit": 5
        }
      }
    ],
    "polling_endpoint": "/functions/v1/check-video-status",
    "polling_interval_seconds": 5,
    "total_videos": 1
  }
}
```

**VEO Status Codes:**
- `1` - Processing
- `2` - Completed
- `3` - Failed

---

### 4. Check Video Status

**Endpoint:** `POST /check-video-status`

Polls VEO API for video generation status.

**Request Body:**
```json
{
  "video_uuids": ["abc123-def456-ghi789", "xyz789-uvw456-rst123"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "uuid": "abc123-def456-ghi789",
        "segment_type": "HOOK",
        "status": 2,
        "status_percentage": 100,
        "video_url": "https://veo-cdn.com/videos/hook_final.mp4",
        "duration_seconds": 8
      },
      {
        "uuid": "xyz789-uvw456-rst123",
        "segment_type": "BODY-1",
        "status": 1,
        "status_percentage": 45,
        "video_url": null,
        "duration_seconds": null
      }
    ],
    "summary": {
      "total": 2,
      "completed": 1,
      "processing": 1,
      "failed": 0
    }
  }
}
```

---

### 5. Generate Topic Suggestions

**Endpoint:** `POST /generate-topic-suggestions`

Generates 5 personalized topic ideas using GPT-3.5-turbo.

**Request Body:**
```json
{
  "interest": "technology",
  "profession": "software engineer",
  "platform": "tiktok",
  "objective": "growth",
  "niche": "tech tutorials",
  "creativeStyle": "educational"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "topics": [
      {
        "title": "10 VS Code Extensions That Changed My Life",
        "description": "Quick tutorial on productivity-boosting extensions for developers"
      },
      {
        "title": "5 Terminal Commands Every Developer Should Know",
        "description": "Essential command-line shortcuts to speed up your workflow"
      },
      {
        "title": "How I Debug Code in 30 Seconds",
        "description": "Fast debugging techniques using browser DevTools"
      },
      {
        "title": "The Best Free Resources to Learn Web Development",
        "description": "Curated list of free courses, docs, and tools for beginners"
      },
      {
        "title": "Why I Switched from Windows to Linux for Coding",
        "description": "My experience and productivity gains after switching OS"
      }
    ]
  }
}
```

---

### Python Backend API

#### Base URL
```
http://localhost:8000  (development)
https://your-backend-domain.com  (production)
```

#### Authentication Header
```
x-api-key: YOUR_BACKEND_API_KEY
```

---

### POST /api/combine-final-video

Combines video segments with FFmpeg and adds background music.

**Request Headers:**
```
x-api-key: YOUR_BACKEND_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "segments": [
    {
      "type": "HOOK",
      "video_url": "https://veo-cdn.com/videos/hook_final.mp4",
      "duration_seconds": 8
    },
    {
      "type": "BODY-1",
      "video_url": "https://veo-cdn.com/videos/body1_final.mp4",
      "duration_seconds": 10
    },
    {
      "type": "CTA",
      "video_url": "https://veo-cdn.com/videos/cta_final.mp4",
      "duration_seconds": 8
    }
  ],
  "options": {
    "bgm_url": "https://music-cdn.com/energetic-beat.mp3",
    "bgm_volume": 0.15
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123def456",
    "status": "processing",
    "estimated_time_seconds": 30,
    "polling_endpoint": "/api/job-status/job_abc123def456"
  }
}
```

---

### GET /api/job-status/{job_id}

Get status of video combination job.

**Request Headers:**
```
x-api-key: YOUR_BACKEND_API_KEY
```

**Response (Processing):**
```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123def456",
    "status": "processing",
    "progress_percentage": 45,
    "current_step": "Downloading segment 2 of 3",
    "final_video_url": null,
    "metadata": null
  }
}
```

**Response (Completed):**
```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123def456",
    "status": "completed",
    "progress_percentage": 100,
    "current_step": "Upload complete",
    "final_video_url": "https://YOUR_PROJECT.supabase.co/storage/v1/object/public/final_videos/550e8400_final.mp4",
    "metadata": {
      "duration_seconds": 32.5,
      "file_size_mb": 15.3,
      "resolution": "720x1280",
      "format": "mp4",
      "codec": "h264",
      "has_bgm": true
    }
  }
}
```

**Response (Failed):**
```json
{
  "success": false,
  "data": {
    "job_id": "job_abc123def456",
    "status": "failed",
    "progress_percentage": 67,
    "current_step": "Failed at FFmpeg concatenation",
    "error_message": "FFmpeg process exited with code 1: Invalid video format",
    "final_video_url": null,
    "metadata": null
  }
}
```

---

### GET /health

Health check endpoint for Python backend.

**Response:**
```json
{
  "status": "healthy",
  "ffmpeg_available": true,
  "version": "1.0.0",
  "timestamp": "2025-01-08T12:34:56.789Z"
}
```

---

## 💻 Development Guidelines

### Code Style

**TypeScript/React:**
- ✅ Use TypeScript for all new files
- ✅ Functional components with hooks (no class components)
- ✅ Use `interface` for props and types
- ✅ Use `const` for components: `export const MyComponent: React.FC<Props> = ...`
- ✅ Use Tailwind utility classes (avoid custom CSS)
- ✅ Use Shadcn UI components from `@/components/ui/`
- ✅ Handle errors with try-catch and user-friendly messages
- ✅ Use React Context for global state (Auth, Planner, etc.)

**Python/FastAPI:**
- ✅ Use async/await for all I/O operations
- ✅ Use type hints (FastAPI will auto-generate docs)
- ✅ Use Pydantic models for request/response validation
- ✅ Handle exceptions with HTTPException
- ✅ Use environment variables for config

**Database:**
- ✅ Enable RLS on all user-specific tables
- ✅ Create indexes on foreign keys and frequently queried columns
- ✅ Use transactions for multi-step operations
- ✅ Use `gen_random_uuid()` for primary keys
- ✅ Use `TIMESTAMPTZ` for timestamps

### Component Pattern

```tsx
// ExampleComponent.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ExampleComponentProps {
  title: string;
  onAction: () => void;
  isLoading?: boolean;
}

export const ExampleComponent: React.FC<ExampleComponentProps> = ({
  title,
  onAction,
  isLoading = false
}) => {
  return (
    <Card className="p-6 bg-card-bg-dark">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onAction}
          disabled={isLoading}
          className="bg-electric-purple hover:bg-purple-700"
        >
          {isLoading ? 'Loading...' : 'Click Me'}
        </Button>
      </CardContent>
    </Card>
  );
};
```

### Authentication Pattern

```tsx
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export const ProtectedScreen: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-app-bg-dark p-8">
      <h1 className="text-2xl font-bold text-white">Welcome, {user.email}</h1>
    </div>
  );
};
```

### Supabase Query Pattern

```tsx
import { supabase } from '@/lib/supabase';

// Fetch data
const fetchUserVideos = async (userId: string) => {
  const { data, error } = await supabase
    .from('planned_content')
    .select('*')
    .eq('user_id', userId)
    .eq('content_type', 'video')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching videos:', error);
    throw error;
  }

  return data;
};

// Insert data
const createVideo = async (videoData: any) => {
  const { data, error } = await supabase
    .from('planned_content')
    .insert([{
      user_id: videoData.user_id,
      title: videoData.title,
      description: videoData.description,
      content_type: 'video',
      status: 'draft'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update data
const updateVideoStatus = async (videoId: string, status: string) => {
  const { data, error } = await supabase
    .from('planned_content')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', videoId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

### Edge Function Pattern

```typescript
// Supabase Edge Function (Deno)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request
    const { param1, param2 } = await req.json();

    // Business logic
    const result = await processRequest(param1, param2);

    // Return success
    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    // Return error
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
```

### Error Handling Best Practices

```tsx
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';

const MyComponent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await performAction();

      toast({
        title: 'Success',
        description: 'Action completed successfully',
        variant: 'default'
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}
      <Button onClick={handleAction} disabled={loading}>
        {loading ? 'Processing...' : 'Perform Action'}
      </Button>
    </div>
  );
};
```

---

## 🚢 Deployment

### Frontend Deployment (Vercel - Recommended)

1. **Build the frontend**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel --prod
   ```

3. **Configure environment variables in Vercel dashboard**
   - `VITE_SUPABASE_URL` → https://YOUR_PROJECT.supabase.co
   - `VITE_SUPABASE_ANON_KEY` → your_anon_key

4. **Add custom domain (optional)**
   - Go to Vercel dashboard → Settings → Domains
   - Add your custom domain (e.g., `app.sparkfluence.com`)

**Alternative: Netlify**
```bash
netlify deploy --prod
```

**Alternative: Cloudflare Pages**
```bash
# Connect GitHub repo and configure build:
# Build command: npm run build
# Build output directory: dist
```

---

### Supabase Backend Deployment

1. **Deploy Edge Functions**
   ```bash
   supabase functions deploy generate-script
   supabase functions deploy generate-images
   supabase functions deploy generate-videos
   supabase functions deploy check-video-status
   supabase functions deploy generate-topic-suggestions
   supabase functions deploy generate-niche-recommendations
   supabase functions deploy generate-niche-suggestions
   supabase functions deploy recommend-styles
   supabase functions deploy analyze-avatar
   supabase functions deploy send-whatsapp-otp
   supabase functions deploy verify-whatsapp-otp
   supabase functions deploy test-env
   ```

2. **Set Supabase Secrets**
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...
   supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
   supabase secrets set GEMINI_API_KEY=AIza...
   supabase secrets set HUGGINGFACE_API_KEY=hf_...
   supabase secrets set VEO_API_KEY=...
   supabase secrets set PEXELS_API_KEY=...

   # Verify
   supabase secrets list
   ```

3. **Configure OAuth Redirect URLs**
   - Go to Authentication → URL Configuration
   - Add production redirect URLs:
     - `https://yourdomain.com/auth/callback`
     - `https://yourdomain.com/**` (for wildcard)

4. **Enable RLS Policies**
   - All RLS policies are included in migrations
   - Verify in Supabase dashboard → Database → Policies

---

### Python Backend Deployment (Railway - Recommended)

1. **Create `railway.json` in backend folder**
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

2. **Create `Procfile` (optional)**
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

3. **Deploy to Railway**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli

   # Login
   railway login

   # Initialize
   railway init

   # Deploy
   railway up
   ```

4. **Set environment variables in Railway dashboard**
   - `SUPABASE_URL` → https://YOUR_PROJECT.supabase.co
   - `SUPABASE_SERVICE_ROLE_KEY` → your_service_role_key
   - `BACKEND_API_KEY` → your_secure_random_key

5. **Install FFmpeg in Railway**
   Railway automatically installs FFmpeg via Nixpacks. Verify in logs.

**Alternative: Render**
```yaml
# render.yaml
services:
  - type: web
    name: sparkfluence-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: BACKEND_API_KEY
        generateValue: true
```

**Alternative: DigitalOcean App Platform**
```yaml
# .do/app.yaml
name: sparkfluence-backend
services:
  - name: api
    source:
      repo: your-repo
      branch: main
    run_command: uvicorn main:app --host 0.0.0.0 --port 8080
    environment_slug: python
    envs:
      - key: SUPABASE_URL
      - key: SUPABASE_SERVICE_ROLE_KEY
      - key: BACKEND_API_KEY
```

---

### Environment Variables Summary

| Variable | Where Used | Example |
|----------|------------|---------|
| `VITE_SUPABASE_URL` | Frontend | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Frontend | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `OPENAI_API_KEY` | Supabase Functions | `sk-proj-...` |
| `OPENROUTER_API_KEY` | Supabase Functions | `sk-or-v1-...` |
| `GEMINI_API_KEY` | Supabase Functions | `AIza...` |
| `HUGGINGFACE_API_KEY` | Supabase Functions | `hf_...` |
| `VEO_API_KEY` | Supabase Functions | `veo_...` |
| `PEXELS_API_KEY` | Supabase Functions | `563492...` |
| `SUPABASE_URL` | Python Backend | `https://abc123.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Python Backend | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `BACKEND_API_KEY` | Python Backend | `secure_random_string_32_chars` |

---

## 🧠 RAG Knowledge System

Sparkfluence uses **Retrieval-Augmented Generation (RAG)** to ground AI-generated scripts in expert knowledge.

### Knowledge Base Structure

The knowledge base consists of **16 expert documents** across two categories:

#### Viral_Script_Generator (10 documents)
- `project_type: 'viral_script'`
- Total chunks: ~200+

| File | Purpose |
|------|---------|
| Project_Instruction.md | Agent identity, output format, SHOT_TYPE rules |
| Killer_Script_Blueprint_CONSOLIDATED.md | 4-part structure (Hook-Foreshadow-Body-Ending) |
| Psychology_of_Viral_Hooks_CONSOLIDATED.md | Psychological triggers, 4 pillars |
| The_Ultimate_250_Video_Hook_Library_for_2025.md | 250 hook templates by category |
| Indonesian_GenZ_Edutainment_Playbook.md | Gen-Z slang, tone, code-mixing |
| Seefluencer_Core_Framework.md | 7 Virality Factors, Winning Content Cycle |
| TikTok_and_Short-Form_Platform_Mastery.md | Algorithm signals, platform optimization |
| Retention_Editing_Playbook.md | Visual specs, pacing (1-3s cuts), SFX |
| Case_Studies_and_Viral_Patterns.md | Real creator success stories |
| Creator_Growth_and_Personal_Branding.md | Niche selection, voice authenticity |

#### Image_and_Video_Generator (6 documents)
- `project_type: 'image_video'`
- Total chunks: ~100+

| File | Purpose |
|------|---------|
| project_instruction.md | AI Film Director role, creator face allocation |
| AI_Video_Production_Technical_Reference.md | Emotion mapping, lighting patterns |
| VEO_3_1_Enhanced.md | Camera movements, I2V prompting |
| Hollywood_Cinematography_Addendum.md | Creator-specific lighting |
| Nano_Banana_Pro_Enhanced.md | Image generation examples |
| Grok_Imagine_Enhanced.md | Grok-specific prompting |

### Embedding Pipeline

**Process:**
1. **Chunking**: Split documents by `## ` headers (H2) or paragraphs
2. **Embedding**: Generate 768-dimensional vectors with Gemini text-embedding-004
3. **Storage**: Store in `knowledge_embeddings` table with pgvector
4. **Query**: Semantic search via `match_knowledge` RPC function

**Script:**
```bash
cd docs/n8n
python chunk_and_embed.py --folder "path/to/Viral_Script_Generator" --project-type viral_script
```

**⚠️ CRITICAL: Embedding Dimension Match**

All three components MUST use **768 dimensions**:
- ✅ Storage: Gemini text-embedding-004 (768D)
- ✅ Query: Gemini text-embedding-004 (768D)
- ✅ Database: `VECTOR(768)`

Mismatched dimensions = broken RAG.

### RAG Query Flow

```
User Input: "10 VS Code tips for productivity"
     │
     ▼
1. Get Embedding
   └─> Gemini text-embedding-004 → [0.123, -0.456, ..., 0.789] (768D)
     │
     ▼
2. Vector Search
   └─> match_knowledge RPC (threshold: 0.5, count: 10)
       SELECT * FROM knowledge_embeddings
       WHERE 1 - (embedding <=> query_embedding) > 0.5
       ORDER BY similarity DESC
       LIMIT 10
     │
     ▼
3. Build Context
   └─> Top 10 chunks joined as string
       "KNOWLEDGE BASE:
        ## Hook Psychology
        Pattern interrupt is the most powerful...

        ## Body Structure
        Each body segment should deliver one key insight...

        ## CTA Best Practices
        Always include a question to boost comments..."
     │
     ▼
4. LLM Call
   └─> Gemini 2.0 Flash / Llama 3.3-70b
       System Prompt: "You are a viral content expert. Use this knowledge:
       {knowledge_context}

       Generate a script for: 10 VS Code tips for productivity"
     │
     ▼
5. Output
   └─> Structured JSON with segments, metadata
```

### Re-embedding Knowledge Base

When knowledge files are updated:

```sql
-- 1. Delete existing chunks (Supabase SQL Editor)
DELETE FROM knowledge_embeddings
WHERE project_type = 'viral_script';

-- 2. Re-run embedding script
cd docs/n8n
python chunk_and_embed.py --folder "path/to/Viral_Script_Generator" --project-type viral_script

-- 3. Verify
SELECT file_name, COUNT(*) as chunks
FROM knowledge_embeddings
WHERE project_type = 'viral_script'
GROUP BY file_name;
```

---

## 🗺 Roadmap

### Phase 1: Core Platform (✅ Completed)
- [x] User authentication (Email/Password + Google OAuth)
- [x] Onboarding flow with niche recommendations
- [x] RAG-enhanced script generation
- [x] Dual-provider image generation (FLUX + DALL-E + GPT-Image)
- [x] VEO video generation with voiceover
- [x] Multi-segment video editor
- [x] Content calendar/planner
- [x] Analytics dashboard
- [x] Token/credit system

### Phase 2: Enhanced Features (🚧 In Progress)
- [ ] **Script Lab** - Advanced script editing with A/B testing
- [ ] **Visual Forge** - Custom visual content creation
- [ ] **Music Library** - Expanded background music options
- [ ] **Template Library** - Pre-made video templates
- [ ] **Batch Processing** - Generate multiple videos at once

### Phase 3: Publishing & Analytics (📋 Planned)
- [ ] **Auto-Publishing** - Direct publish to TikTok/Instagram/YouTube APIs
- [ ] **Scheduled Publishing** - Automated posting at optimal times
- [ ] **Advanced Analytics** - Deeper insights and recommendations
- [ ] **A/B Testing** - Test different versions of videos
- [ ] **Competitor Analysis** - Track competitor performance

### Phase 4: Collaboration & Community (🔮 Future)
- [ ] **Team Collaboration** - Multi-user workspaces
- [ ] **Approval Workflows** - Content review and approval
- [ ] **Community** - Creator collaboration and content sharing
- [ ] **Marketplace** - Buy/sell templates, music, effects
- [ ] **AI Chat** - Conversational AI for content ideation

### Phase 5: Advanced AI (🔮 Future)
- [ ] **Sora Integration** - OpenAI Sora for even better videos
- [ ] **Custom Voice Cloning** - Use your own voice for voiceovers
- [ ] **Avatar Generation** - AI-generated creator avatars
- [ ] **Real-time Translation** - Automatic multi-language versions
- [ ] **Trend Prediction** - AI-powered trend forecasting

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Reporting Bugs

1. Check if the issue already exists in GitHub Issues
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if applicable)
   - Environment details (OS, browser, Node version)

### Suggesting Features

1. Open a GitHub Issue with tag `enhancement`
2. Describe the feature and its use case
3. Explain why it would be valuable

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/sparkfluence_platform.git
   cd sparkfluence_platform
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow the code style guidelines
   - Add tests if applicable
   - Update documentation

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add: Amazing new feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Provide a clear title and description
   - Reference any related issues
   - Wait for review and feedback

### Code Style Guidelines

- **TypeScript**: Follow Prettier and ESLint rules
- **Python**: Follow PEP 8 style guide
- **Commits**: Use conventional commits format
  - `feat:` New feature
  - `fix:` Bug fix
  - `docs:` Documentation changes
  - `refactor:` Code refactoring
  - `test:` Adding tests
  - `chore:` Maintenance tasks

---

## 📄 License

This project is **proprietary software**. All rights reserved.

**© 2025 Sparkfluence. All rights reserved.**

Unauthorized copying, distribution, modification, or use of this software, via any medium, is strictly prohibited without explicit written permission from the copyright holder.

For licensing inquiries, please contact: licensing@sparkfluence.com

---

## 💬 Support

### Getting Help

- **Documentation**: [CLAUDE.md](CLAUDE.md) (Developer guide)
- **Issues**: [GitHub Issues](https://github.com/yourusername/sparkfluence_platform/issues)
- **Email**: support@sparkfluence.com
- **Discord**: [Join our community](https://discord.gg/sparkfluence) (Coming soon)

### FAQ

**Q: Is there a free tier?**
A: Yes, we offer a free tier with limited credits. You can upgrade anytime for more features.

**Q: Which AI providers do I need API keys for?**
A: For full functionality, you need:
- OpenAI (topic gen, DALL-E, GPT-Image-1)
- Google Gemini (script gen, embeddings) - FREE
- HuggingFace (FLUX images) - FREE
- VEO (video gen) - PAID
- OpenRouter (Llama 3.3-70b) - FREE

**Q: Can I use my own API keys?**
A: Currently, API keys are managed at the platform level. Custom API keys for individual users is on the roadmap.

**Q: What platforms can I publish to?**
A: Currently, you can schedule and download videos. Direct API publishing to TikTok, Instagram, and YouTube is coming in Phase 3.

**Q: How does the credit system work?**
A: Each AI operation (script gen, image gen, video gen) costs credits. You can purchase credits or subscribe to a plan with monthly credits included.

**Q: Can I export my videos?**
A: Yes, all videos are downloadable in MP4 format at 720p or 1080p resolution.

---

## 🙏 Acknowledgments

**Built with amazing open-source technologies:**

- [React](https://reactjs.org/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Shadcn UI](https://ui.shadcn.com/) - Component library
- [Supabase](https://supabase.com/) - Backend-as-a-Service
- [FastAPI](https://fastapi.tiangolo.com/) - Python web framework
- [FFmpeg](https://ffmpeg.org/) - Video processing
- [pgvector](https://github.com/pgvector/pgvector) - Vector similarity search

**Powered by cutting-edge AI:**

- [Google Gemini](https://ai.google.dev/) - Script generation & embeddings
- [OpenAI](https://openai.com/) - Topic generation & image generation
- [OpenRouter](https://openrouter.ai/) - Llama 3.3-70b access
- [HuggingFace](https://huggingface.co/) - FLUX.1 image generation
- [VEO](https://geminigen.ai/) - Video generation with voiceover
- [Pexels](https://www.pexels.com/) - Stock imagery

---

<div align="center">

**🚀 Built with ❤️ for content creators worldwide**

**Version 1.0.0** • **Last Updated: 2025-01-08**

[Website](https://sparkfluence.com) • [Documentation](CLAUDE.md) • [GitHub](https://github.com/yourusername/sparkfluence_platform)

</div>
