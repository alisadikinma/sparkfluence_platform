# Claude Developer Guide - Sparkfluence

This document provides AI assistants (like Claude) with comprehensive context about the Sparkfluence codebase to enable effective code assistance, debugging, and feature development.

## Project Overview

**Sparkfluence** is an AI-powered SaaS platform for short-form video content creation, targeting TikTok, Instagram, and YouTube creators. The platform automates content ideation, script generation, visual sourcing, video generation with AI voiceover, and publishing workflows.

**Key Technologies:**
- React 18 + TypeScript + Vite
- Supabase (PostgreSQL, Auth, Edge Functions, pgvector, Storage)
- **OpenRouter Llama 3.3-70b** (Script Gen - FREE)
- **Google Gemini text-embedding-004** (RAG Embeddings - FREE, 768D)
- **HuggingFace FLUX.1-schnell** (Image Gen - FREE) / OpenAI DALL-E 3 (Premium)
- **VEO 3.1** (Video Gen with built-in voiceover)
- Python FastAPI Backend (FFmpeg for video processing)
- Tailwind CSS + Shadcn UI

**⚠️ IMPORTANT:** This project does NOT use n8n. All AI workflows are implemented as **Supabase Edge Functions**.

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React SPA)                     │
│                 React 18 + TypeScript + Vite                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ HTTP (Supabase Client)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE BACKEND                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              EDGE FUNCTIONS (Deno)                   │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌───────────────┐  │   │
│  │  │ generate-   │ │ generate-   │ │ generate-     │  │   │
│  │  │ script      │ │ images      │ │ videos        │  │   │
│  │  │ (Llama 3.3) │ │ (FLUX/DALLE)│ │ (VEO 3.1)     │  │   │
│  │  └─────────────┘ └─────────────┘ └───────────────┘  │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌───────────────┐  │   │
│  │  │ generate-   │ │ check-video │ │ test-env      │  │   │
│  │  │ topics      │ │ -status     │ │               │  │   │
│  │  └─────────────┘ └─────────────┘ └───────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           PostgreSQL + pgvector (RAG)                │   │
│  │  • knowledge_embeddings (768D Gemini vectors)        │   │
│  │  • match_knowledge RPC function                      │   │
│  │  • user data, videos, segments, analytics            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              STORAGE BUCKETS                         │   │
│  │  • generated-images (FLUX/DALL-E outputs)           │   │
│  │  • final_videos (completed video files)              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ Video URLs
                             ▼
┌─────────────────────────────────────────────────────────────┐
│               PYTHON FASTAPI BACKEND (VPS)                  │
│  • POST /api/combine-final-video (FFmpeg concat + BGM)      │
│  • GET /api/job-status/{job_id} (Job polling)               │
│  • GET /health (Health check)                               │
└─────────────────────────────────────────────────────────────┘
```

### Video Generation Pipeline

```
1. generate-script     2. generate-images    3. generate-videos    4. FastAPI
   (Edge Function)        (Edge Function)       (Edge Function)       (Python)
        │                      │                      │                   │
        ▼                      ▼                      ▼                   ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐   ┌───────────┐
│ OpenRouter    │      │ FLUX.1/DALL-E │      │ VEO 3.1       │   │ FFmpeg    │
│ Llama 3.3-70b │      │ Image Gen     │      │ Video Gen     │   │ Concat    │
│ + RAG Query   │      │               │      │ + Voiceover   │   │ + BGM     │
└───────────────┘      └───────────────┘      └───────────────┘   └───────────┘
        │                      │                      │                   │
        ▼                      ▼                      ▼                   ▼
   Script JSON          Image URLs             Video URLs          Final Video
   (segments)           (per segment)          (per segment)       (combined)
```

### RAG (Retrieval-Augmented Generation) Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 KNOWLEDGE BASE STRUCTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Viral_Script_Generator/ (10 files)                         │
│  ├── Project_Instruction.md (Agent rules, output format)    │
│  ├── Killer_Script_Blueprint_CONSOLIDATED.md                │
│  ├── Psychology_of_Viral_Hooks_CONSOLIDATED.md              │
│  ├── The_Ultimate_250_Video_Hook_Library_for_2025.md        │
│  ├── Indonesian_GenZ_Edutainment_Playbook.md                │
│  ├── Seefluencer_Core_Framework.md                          │
│  ├── TikTok_and_Short-Form_Platform_Mastery.md              │
│  ├── Retention_Editing_Playbook.md                          │
│  ├── Case_Studies_and_Viral_Patterns.md                     │
│  └── Creator_Growth_and_Personal_Branding.md                │
│                                                             │
│  Image_and_Video_Generator/ (6 files)                       │
│  ├── project_instruction.md                                 │
│  ├── AI_Video_Production_Technical_Reference.md             │
│  ├── VEO_3_1_Enhanced.md                                    │
│  ├── Hollywood_Cinematography_Addendum.md                   │
│  ├── Nano_Banana_Pro_Enhanced.md                            │
│  └── Grok_Imagine_Enhanced.md                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ chunk_and_embed.py
                             ▼
┌─────────────────────────────────────────────────────────────┐
│               SUPABASE VECTOR DATABASE                      │
├─────────────────────────────────────────────────────────────┤
│  knowledge_embeddings table:                                │
│  • project_type: 'viral_script' | 'image_video'             │
│  • file_name: source file                                   │
│  • section_title: chunk identifier                          │
│  • chunk_text: actual content                               │
│  • embedding: vector(768) — Gemini text-embedding-004       │
│  • metadata: jsonb (char_count, etc.)                       │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ match_knowledge RPC
                             ▼
┌─────────────────────────────────────────────────────────────┐
│               EDGE FUNCTION RAG QUERY                       │
├─────────────────────────────────────────────────────────────┤
│  1. User input → getEmbedding(text)                         │
│     • API: Gemini text-embedding-004 (768D)                 │
│                                                             │
│  2. Vector search → match_knowledge RPC                     │
│     • match_threshold: 0.5                                  │
│     • match_count: 10                                       │
│                                                             │
│  3. Build context → knowledgeContext string                 │
│     • Join top chunks as context                            │
│                                                             │
│  4. LLM call → OpenRouter Llama 3.3-70b                     │
│     • System prompt includes knowledge context              │
│     • Generate viral script with RAG grounding              │
└─────────────────────────────────────────────────────────────┘
```

### Embedding Dimension Matching (CRITICAL)

| Component | Model | Dimension | Status |
|-----------|-------|-----------|--------|
| **Storage** (chunk_and_embed.py) | Gemini text-embedding-004 | 768D | ✅ |
| **Query** (Edge Functions) | Gemini text-embedding-004 | 768D | ✅ |
| **Database Schema** | VECTOR(768) | 768D | ✅ |

**⚠️ All three MUST match. Mismatched dimensions = broken RAG.**

### Frontend Architecture (React SPA)

```
Client-Side Routing (React Router)
├── Public Routes (/, /login, /register)
├── Protected Routes (requires auth)
│   ├── /welcome
│   ├── /package-selection
│   ├── /onboarding
│   ├── /niche-recommendations
│   ├── /creative-dna
│   ├── /avatar-upload
│   ├── /avatar-preview
│   ├── /content-curation
│   ├── /topic-selection
│   ├── /video-editor
│   ├── /music-selector
│   ├── /loading
│   ├── /full-video
│   ├── /full-video-preview
│   ├── /dashboard
│   ├── /planner
│   ├── /gallery
│   ├── /settings
│   └── /settings/plan-billing
└── Context Providers
    ├── AuthContext (authentication state)
    ├── OnboardingContext (onboarding flow data)
    └── PlannerContext (content planner state)
```

### Backend Architecture (Hybrid)

```
Supabase Backend
├── PostgreSQL Database + pgvector (RAG)
│   ├── auth.users (managed by Supabase Auth)
│   ├── user_profiles, videos, video_segments
│   ├── planned_content (content calendar)
│   ├── user_tokens, token_purchases (credit system)
│   ├── social_media_analytics, analytics_summary
│   └── knowledge_embeddings (RAG vector store with match_knowledge RPC)
├── Storage Buckets
│   ├── generated-images (FLUX/DALL-E outputs)
│   └── final_videos (completed video files)
├── Authentication
│   ├── Email/Password
│   └── Google OAuth
├── Edge Functions (Deno/TypeScript) - 7 Total
│   ├── generate-topics (OpenAI GPT-3.5-turbo)
│   ├── generate-script (OpenRouter Llama 3.3-70b + RAG)
│   ├── generate-images (FLUX.1-schnell FREE / DALL-E 3 Premium)
│   ├── generate-videos (VEO 3.1 with built-in voiceover)
│   ├── check-video-status (VEO status polling)
│   ├── generate-video-segments (GPT-3.5 + Pexels)
│   └── test-env (Environment variable validation)
└── Row-Level Security (RLS) policies

Python FastAPI Backend (VPS/Cloud)
├── POST /api/combine-final-video (FFmpeg concat + BGM)
├── GET /api/job-status/{job_id} (Job status polling)
└── GET /health (Health check + FFmpeg availability)
```

## Key File Locations

### Core Application Files

| File | Purpose |
|------|---------|
| [src/index.tsx](src/index.tsx) | Main app entry, routing configuration (25+ routes) |
| [src/lib/supabase.ts](src/lib/supabase.ts) | Supabase client initialization |
| [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) | Authentication logic and state (95 lines) |
| [src/contexts/OnboardingContext.tsx](src/contexts/OnboardingContext.tsx) | Onboarding flow data persistence (79 lines) |
| [src/contexts/PlannerContext.tsx](src/contexts/PlannerContext.tsx) | Content planner state management (211 lines) |
| [tailwind.config.js](tailwind.config.js) | Design system configuration |
| [vite.config.ts](vite.config.ts) | Build configuration |

### Important Screens (29 Total)

| Screen | File | Purpose |
|--------|------|---------|
| Landing | [src/screens/Landing/Landing.tsx](src/screens/Landing/Landing.tsx) | Marketing/landing page (715 lines) |
| Login | [src/screens/Login/Login.tsx](src/screens/Login/Login.tsx) | Login with sidebar sections (226 lines) |
| Register | [src/screens/Register/Register.tsx](src/screens/Register/Register.tsx) | Registration screen (267 lines) |
| Welcome | [src/screens/Welcome/Welcome.tsx](src/screens/Welcome/Welcome.tsx) | First login welcome (78 lines) |
| PackageSelection | [src/screens/PackageSelection/PackageSelection.tsx](src/screens/PackageSelection/PackageSelection.tsx) | Plan selection (223 lines) |
| Onboarding | [src/screens/Onboarding/Onboarding.tsx](src/screens/Onboarding/Onboarding.tsx) | Multi-step setup (342 lines) |
| NicheRecommendations | [src/screens/NicheRecommendations/NicheRecommendations.tsx](src/screens/NicheRecommendations/NicheRecommendations.tsx) | AI niche suggestions (316 lines) |
| CreativeDNA | [src/screens/CreativeDNA/CreativeDNA.tsx](src/screens/CreativeDNA/CreativeDNA.tsx) | Creative style profiling (431 lines) |
| AvatarUpload | [src/screens/AvatarUpload/AvatarUpload.tsx](src/screens/AvatarUpload/AvatarUpload.tsx) | Avatar upload (184 lines) |
| ContentCuration | [src/screens/ContentCuration/ContentCuration.tsx](src/screens/ContentCuration/ContentCuration.tsx) | Content strategy setup (371 lines) |
| TopicSelection | [src/screens/TopicSelection/TopicSelection.tsx](src/screens/TopicSelection/TopicSelection.tsx) | AI-generated topic picker (211 lines) |
| VideoEditor | [src/screens/VideoEditor/VideoEditor.tsx](src/screens/VideoEditor/VideoEditor.tsx) | Multi-segment video editor (403 lines) |
| MusicSelector | [src/screens/MusicSelector/MusicSelector.tsx](src/screens/MusicSelector/MusicSelector.tsx) | Background music selection (223 lines) |
| FullVideo | [src/screens/FullVideo/FullVideo.tsx](src/screens/FullVideo/FullVideo.tsx) | Full video assembly (328 lines) |
| Dashboard | [src/screens/Dashboard/Dashboard.tsx](src/screens/Dashboard/Dashboard.tsx) | Main dashboard with metrics (372 lines) |
| Gallery | [src/screens/Gallery/Gallery.tsx](src/screens/Gallery/Gallery.tsx) | Video library (267 lines) |
| Planner | [src/screens/Planner/Planner.tsx](src/screens/Planner/Planner.tsx) | Content calendar (8.2K total) |
| Settings | [src/screens/Settings/Settings.tsx](src/screens/Settings/Settings.tsx) | User settings (40K total with submodules) |

### Backend Functions (7 Edge Functions)

| Function | File | Purpose | AI Service |
|----------|------|---------|------------|
| Generate Topics | [supabase/functions/generate-topics/index.ts](supabase/functions/generate-topics/index.ts) | Generate 5 AI topic suggestions | OpenAI GPT-3.5-turbo |
| Generate Script | [supabase/functions/generate-script/index.ts](supabase/functions/generate-script/index.ts) | Viral script gen with RAG | OpenRouter Llama 3.3-70b + Gemini embeddings |
| Generate Images | [supabase/functions/generate-images/index.ts](supabase/functions/generate-images/index.ts) | Image generation (dual provider) | FLUX.1 (free) / DALL-E 3 (premium) |
| Generate Videos | [supabase/functions/generate-videos/index.ts](supabase/functions/generate-videos/index.ts) | Video gen with voiceover | VEO 3.1 |
| Check Video Status | [supabase/functions/check-video-status/index.ts](supabase/functions/check-video-status/index.ts) | Poll VEO completion | VEO API |
| Generate Segments | [supabase/functions/generate-video-segments/index.ts](supabase/functions/generate-video-segments/index.ts) | 8-segment structure + images | GPT-3.5 + Pexels |
| Test Environment | [supabase/functions/test-env/index.ts](supabase/functions/test-env/index.ts) | Validate API keys | - |

### Python Backend

| File | Purpose |
|------|---------|
| [backend/main.py](backend/main.py) | FastAPI server for video processing (387 lines) |
| [backend/requirements.txt](backend/requirements.txt) | Python dependencies (FastAPI, Uvicorn, httpx) |

### Knowledge Embedding Pipeline

| File | Purpose |
|------|---------|
| [docs/n8n/chunk_and_embed.py](docs/n8n/chunk_and_embed.py) | RAG knowledge embedding script (Gemini 768D) |
| [docs/n8n/supabase_vector_schema.sql](docs/n8n/supabase_vector_schema.sql) | pgvector schema for RAG |
| [docs/n8n/requirements.txt](docs/n8n/requirements.txt) | Python dependencies for embedding pipeline |

### Knowledge Base Files

#### Viral_Script_Generator/ (10 files) — project_type: 'viral_script'

| File | Purpose |
|------|---------|
| Project_Instruction.md | Agent identity, output format, constraints, SHOT_TYPE rules |
| Killer_Script_Blueprint_CONSOLIDATED.md | 4-part structure (Hook-Foreshadow-Body-Ending) |
| Psychology_of_Viral_Hooks_CONSOLIDATED.md | Psychological triggers, 4 pillars |
| The_Ultimate_250_Video_Hook_Library_for_2025.md | 250 hook templates by category |
| Indonesian_GenZ_Edutainment_Playbook.md | Gen-Z slang, tone, code-mixing |
| Seefluencer_Core_Framework.md | 7 Virality Factors, Winning Content Cycle |
| TikTok_and_Short-Form_Platform_Mastery.md | Algorithm signals, platform optimization |
| Retention_Editing_Playbook.md | Visual specs, pacing (1-3s cuts), SFX |
| Case_Studies_and_Viral_Patterns.md | Real creator success stories |
| Creator_Growth_and_Personal_Branding.md | Niche selection, voice authenticity |

#### Image_and_Video_Generator/ (6 files) — project_type: 'image_video'

| File | Purpose |
|------|---------|
| project_instruction.md | AI Film Director role, creator face allocation |
| AI_Video_Production_Technical_Reference.md | Emotion mapping, lighting patterns |
| VEO_3_1_Enhanced.md | Camera movements, I2V prompting |
| Hollywood_Cinematography_Addendum.md | Creator-specific lighting |
| Nano_Banana_Pro_Enhanced.md | Image generation examples |
| Grok_Imagine_Enhanced.md | Grok-specific prompting |

## Database Schema Reference (12 Migrations)

### user_profiles
```sql
id: uuid (PK)
user_id: uuid (FK → auth.users, UNIQUE)
first_login: boolean
onboarding_completed: boolean
created_at, updated_at: timestamp

RLS: Users can SELECT/UPDATE own profile
```

### videos
```sql
id: uuid (PK)
title: text
description: text
thumbnail: text
platforms: jsonb (array: ["tiktok", "instagram", "youtube"])
publish_date: date
publish_time: time
created_at, updated_at: timestamp

RLS: Public read/write (demo mode)
```

### video_segments
```sql
id: uuid (PK)
user_id: uuid (FK → auth.users)
topic_id: uuid (nullable)
segment_number: integer
element: text (Hook, Foreshadow, Body, Ending, CTA)
duration: text ("7.5 Second")
script: text
visual_prompt: text
image_url: text (nullable)
video_url: text (nullable)
created_at, updated_at: timestamp

Indexes: user_id, topic_id
RLS: Users can SELECT/INSERT/UPDATE/DELETE own segments
```

### planned_content
```sql
id: uuid (PK)
user_id: uuid (FK → auth.users)
title: text
description: text
content_type: text (video/image/post)
platforms: text[] (array of platforms)
scheduled_date: date
scheduled_time: time
status: text (draft/scheduled/published)
thumbnail_url: text
video_data: jsonb
final_video_url: text
is_public: boolean
created_at, updated_at: timestamp

Indexes: user_id, scheduled_date
RLS: Users can SELECT/INSERT/UPDATE/DELETE own content
```

### user_tokens
```sql
id: uuid (PK)
user_id: uuid (FK → auth.users, UNIQUE)
balance: integer
created_at, updated_at: timestamp

RLS: Users can SELECT/UPDATE own tokens
```

### token_purchases
```sql
id: uuid (PK)
user_id: uuid (FK → auth.users)
tokens: integer
amount: integer (Rupiah)
payment_method: text
status: text (completed/pending/failed)
created_at: timestamp

Indexes: user_id, status
RLS: Users can SELECT/INSERT own purchases
```

### social_media_analytics
```sql
id: uuid (PK)
user_id: uuid (FK → auth.users)
planned_content_id: uuid (FK → planned_content, nullable)
platform: text (TikTok/Instagram/YouTube/Meta)
platform_post_id: text (nullable)
post_url: text (nullable)
published_at: timestamp
total_views: bigint
engagement_count: bigint
likes_count: bigint
comments_count: bigint
shares_count: bigint
saves_count: bigint
followers_at_publish: bigint
current_followers: bigint
reach: bigint
impressions: bigint
engagement_rate: decimal
watch_time_seconds: bigint
average_watch_percentage: decimal
click_through_rate: decimal
last_synced_at: timestamp
created_at, updated_at: timestamp

Indexes: user_id, planned_content_id, platform, published_at, platform_post_id
RLS: Users can SELECT/INSERT/UPDATE/DELETE own analytics
```

### analytics_summary
```sql
Aggregated analytics data (schema TBD based on reporting needs)
```

### knowledge_embeddings (RAG)
```sql
id: uuid (PK)
project_type: text (viral_script, image_video)
file_name: text
section_title: text
chunk_text: text
embedding: vector(768) -- Gemini text-embedding-004
metadata: jsonb
created_at: timestamp

RLS: Service role only
RPC: match_knowledge(query_embedding, match_threshold, match_count)
```

## Common Development Tasks

### 1. Adding a New Screen

```tsx
// 1. Create screen component in src/screens/NewScreen/
// src/screens/NewScreen/NewScreen.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NewScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-app-bg-dark p-8">
      <h1 className="text-2xl font-bold text-white">New Screen</h1>
    </div>
  );
};

// 2. Add route in src/index.tsx
import { NewScreen } from './screens/NewScreen/NewScreen';

// Inside <Routes>:
<Route path="/new-screen" element={<NewScreen />} />
```

### 2. Accessing Authenticated User

```tsx
import { useAuth } from '@/contexts/AuthContext';

const MyComponent = () => {
  const { user } = useAuth();

  // user object contains:
  // - id: string
  // - email: string
  // - user_metadata: object

  if (!user) {
    return <div>Please sign in</div>;
  }

  return <div>User ID: {user.id}</div>;
};
```

### 3. Database Queries (Supabase)

```tsx
import { supabase } from '@/lib/supabase';

// Fetch data
const fetchVideos = async () => {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  return data;
};

// Insert data
const createVideo = async (videoData) => {
  const { data, error } = await supabase
    .from('videos')
    .insert([{
      user_id: user.id,
      title: videoData.title,
      description: videoData.description
    }])
    .select();

  return { data, error };
};

// Update data
const updateVideo = async (videoId, updates) => {
  const { data, error } = await supabase
    .from('videos')
    .update(updates)
    .eq('id', videoId)
    .select();

  return { data, error };
};

// Delete data
const deleteVideo = async (videoId) => {
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId);

  return { error };
};
```

### 4. Calling Edge Functions

```tsx
import { supabase } from '@/lib/supabase';

// Generate script with RAG
const generateScript = async (content: string, duration: string, platform: string, language: string) => {
  const { data, error } = await supabase.functions.invoke('generate-script', {
    body: {
      input_type: 'topic',
      content,
      duration,
      platform,
      language
    }
  });

  if (error) throw error;
  return data.data; // { segments: [...], metadata: {...} }
};

// Generate images (FLUX or DALL-E)
const generateImages = async (segments: any[], style: string, provider: 'huggingface' | 'openai') => {
  const { data, error } = await supabase.functions.invoke('generate-images', {
    body: {
      segments,
      style, // 'cinematic', 'realistic', 'animated'
      aspect_ratio: '9:16',
      provider
    }
  });

  if (error) throw error;
  return data.data.images; // Array of image objects
};

// Generate videos with VEO
const generateVideos = async (segments: any[], images: any[], language: string) => {
  const { data, error } = await supabase.functions.invoke('generate-videos', {
    body: {
      segments,
      images,
      language
    }
  });

  if (error) throw error;
  return data.data.videos; // Array of VEO job objects
};

// Check video status
const checkVideoStatus = async (videoUuids: string[]) => {
  const { data, error } = await supabase.functions.invoke('check-video-status', {
    body: {
      video_uuids: videoUuids
    }
  });

  if (error) throw error;
  return data.data; // { videos: [...], summary: {...} }
};
```

### 5. Using UI Components

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FormComponent = () => {
  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Example Form</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            type="text"
            placeholder="Enter title"
          />
        </div>
        <Button>Submit</Button>
      </CardContent>
    </Card>
  );
};
```

## Design System (Tailwind)

### Color Palette

```js
// Primary Brand Colors
colors: {
  'electric-purple': '#7c3aed',
  'pink': '#ec4899',
  'charcoal': '#1e1e1e',
}

// Background & Surface
'app-bg-dark': '#0a0a0a',
'card-bg-dark': '#1a1a1a',
'header-bg-dark': '#111111',

// Elevation System
'elevation-1': 'rgba(255, 255, 255, 0.05)',
'elevation-2': 'rgba(255, 255, 255, 0.08)',
'elevation-3': 'rgba(255, 255, 255, 0.12)',
```

### Typography

```js
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  display: ['Poppins', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

### Common Tailwind Patterns

```tsx
// Full screen layout
<div className="min-h-screen bg-app-bg-dark">

// Card with elevation
<div className="bg-card-bg-dark rounded-lg p-6 shadow-lg">

// Primary button
<button className="bg-electric-purple hover:bg-purple-700 text-white px-6 py-3 rounded-lg">

// Gradient text
<h1 className="bg-gradient-to-r from-electric-purple to-pink bg-clip-text text-transparent">
```

## Authentication Flow

### Login Process
1. User submits credentials at [/login](src/screens/Login/Login.tsx)
2. [AuthContext](src/contexts/AuthContext.tsx) calls `supabase.auth.signInWithPassword()`
3. On success, user object is set in context
4. Protected routes become accessible
5. If `first_login = true`, show WelcomeModal

### Registration Process
1. User submits form at [/register](src/screens/Register/Register.tsx)
2. `supabase.auth.signUp()` creates auth.users entry
3. Database trigger creates `user_profiles` entry with `first_login = true`
4. User is redirected to welcome screen

### OAuth Flow
1. User clicks "Continue with Google"
2. `supabase.auth.signInWithOAuth({ provider: 'google' })`
3. Redirects to Google OAuth consent screen
4. On success, creates/updates user and redirects back

## Video Generation Workflow

### Complete Flow

```
1. Topic Generation
   └─> Call generate-topics → Returns 5 AI-generated topics

2. Script Generation (RAG-Enhanced)
   ├─> Call generate-script (OpenRouter Llama + RAG)
   ├─> Input: content, duration (30s/60s), platform, language
   ├─> RAG Query: Gemini embedding → match_knowledge RPC
   ├─> Output: 4-6 segments with script_text, visual_direction, emotion
   └─> Segments: HOOK → BODY (multiple) → ENDING_CTA

3. Image Generation (Dual Provider)
   ├─> Call generate-images
   ├─> Provider: FLUX.1-schnell (FREE) or DALL-E 3 (Premium)
   ├─> Style: cinematic/realistic/animated
   ├─> Input: segments array
   ├─> Output: Image URLs for each segment
   └─> Storage: Supabase 'generated-images' bucket

4. Video Generation (VEO 3.1)
   ├─> Call generate-videos
   ├─> Input: segments, images, language
   ├─> VEO generates videos with BUILT-IN VOICEOVER
   ├─> Duration: 8 seconds per segment
   ├─> Format: 720p, 9:16 vertical
   └─> Output: VEO job UUIDs

5. Status Polling
   ├─> Call check-video-status with UUIDs
   ├─> Poll every 5 seconds
   ├─> Status: 1=processing, 2=completed, 3=failed
   └─> Retrieve video URLs when complete

6. Final Assembly (Python Backend)
   ├─> POST /api/combine-final-video
   ├─> FFmpeg concatenates all segments
   ├─> Add background music (optional)
   ├─> Upload to Supabase 'final_videos' bucket
   └─> Return final_video_url + metadata

7. Publishing
   ├─> Save to planned_content table
   ├─> Schedule or publish immediately
   └─> Track in social_media_analytics
```

### Key Functions in Video Workflow

```tsx
// Complete workflow example
const createFullVideo = async () => {
  // 1. Generate script
  const scriptData = await generateScript(topic, '30s', 'tiktok', 'indonesian');
  const segments = scriptData.segments;

  // 2. Generate images
  const images = await generateImages(segments, 'cinematic', 'huggingface');

  // 3. Generate videos with voiceover
  const videoJobs = await generateVideos(segments, images, 'indonesian');
  const uuids = videoJobs.map(job => job.veo_response.uuid);

  // 4. Poll until complete
  let allComplete = false;
  while (!allComplete) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const status = await checkVideoStatus(uuids);
    allComplete = status.summary.total === status.summary.completed;
  }

  // 5. Get final URLs
  const statusFinal = await checkVideoStatus(uuids);
  const videoSegments = statusFinal.videos.map(v => ({
    type: v.segment_type,
    video_url: v.video_url,
    duration_seconds: 8
  }));

  // 6. Combine with backend
  const response = await fetch('https://backend.sparkfluence.com/api/combine-final-video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': BACKEND_API_KEY
    },
    body: JSON.stringify({
      project_id: videoId,
      segments: videoSegments,
      options: {
        bgm_url: selectedMusic.url,
        bgm_volume: 0.15
      }
    })
  });

  const { data } = await response.json();
  const jobId = data.job_id;

  // 7. Poll backend job status
  let jobComplete = false;
  while (!jobComplete) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const jobStatus = await fetch(`https://backend.sparkfluence.com/api/job-status/${jobId}`, {
      headers: { 'x-api-key': BACKEND_API_KEY }
    }).then(r => r.json());

    if (jobStatus.data.status === 'completed') {
      jobComplete = true;
      return jobStatus.data.final_video_url;
    } else if (jobStatus.data.status === 'failed') {
      throw new Error(jobStatus.data.error_message);
    }
  }
};
```

## Edge Functions (Deno)

### Structure
```typescript
// All Edge Functions follow this pattern:
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // 3. Parse request body
    const { param1, param2 } = await req.json();

    // 4. Business logic (AI APIs, RAG, etc.)
    const result = await processRequest(param1, param2);

    // 5. Return response
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // 6. Error handling
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### OpenRouter Integration (FREE Llama 3.3-70b)
```typescript
const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${openrouterApiKey}`,
    'HTTP-Referer': 'https://sparkfluence.com',
    'X-Title': 'Sparkfluence'
  },
  body: JSON.stringify({
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8,
    max_tokens: 2048
  })
});

const data = await response.json();
const result = data.choices[0].message.content;
```

### RAG (Retrieval-Augmented Generation)
```typescript
// 1. Get embedding from Gemini (768D)
async function getEmbedding(text: string) {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey
      },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] }
      })
    }
  );
  const data = await response.json();
  return data.embedding.values; // 768-dimensional vector
}

// 2. Query vector database
const embedding = await getEmbedding(userInput);
const { data: ragResults } = await supabase.rpc('match_knowledge', {
  query_embedding: embedding,
  match_threshold: 0.5,
  match_count: 10
});

// 3. Build context from results
const knowledgeContext = ragResults.map(r => r.chunk_text).join('\n\n');

// 4. Include in LLM prompt
const systemPrompt = `You are an expert.

KNOWLEDGE BASE:
${knowledgeContext}

Use the knowledge base to enhance your response.`;
```

## Knowledge Embedding Pipeline

### Re-embedding Process

When knowledge files are updated, follow this process:

```bash
# 1. Delete existing chunks (Supabase SQL Editor)
DELETE FROM knowledge_embeddings 
WHERE project_type = 'viral_script';

# 2. Re-run embedding script
cd docs/n8n
python chunk_and_embed.py --folder "D:\Projects\Sparkfluence_n8n\Viral_Script_Generator" --project-type viral_script

# 3. Verify
SELECT file_name, COUNT(*) as chunks 
FROM knowledge_embeddings 
WHERE project_type = 'viral_script'
GROUP BY file_name;
```

### Chunking Strategy

The `chunk_and_embed.py` script:
1. Splits by `## ` headers (H2)
2. If no headers, splits by paragraphs
3. Target chunk size: 1000 characters max
4. Uses Gemini text-embedding-004 (768D)

**⚠️ Files must use `## ` headers for proper chunking. Using `### ` (H3) will cause broken small chunks.**

## State Management Patterns

### Context Structure
```tsx
// contexts/ExampleContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface ExampleContextType {
  data: any;
  setData: (data: any) => void;
  fetchData: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const ExampleContext = createContext<ExampleContextType | undefined>(undefined);

export const ExampleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await fetchFromAPI();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExampleContext.Provider value={{ data, setData, fetchData, loading, error }}>
      {children}
    </ExampleContext.Provider>
  );
};

export const useExample = () => {
  const context = useContext(ExampleContext);
  if (!context) {
    throw new Error('useExample must be used within ExampleProvider');
  }
  return context;
};
```

## Debugging Tips

### Check Authentication State
```tsx
import { supabase } from '@/lib/supabase';

const checkAuth = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current user:', user);
};
```

### View Database Records
```tsx
const debugDatabase = async () => {
  const { data, error } = await supabase
    .from('table_name')
    .select('*');
  console.log('Data:', data);
  console.log('Error:', error);
};
```

### Test Edge Functions Locally
```bash
# Start Supabase locally
supabase start

# Run function locally
supabase functions serve generate-script --no-verify-jwt

# Test with curl
curl -X POST http://localhost:54321/functions/v1/generate-script \
  -H "Content-Type: application/json" \
  -d '{"input_type":"topic","content":"tech tips","duration":"30s","platform":"tiktok","language":"indonesian"}'
```

### Common Error Patterns

```tsx
// Pattern 1: RLS Policy Issues
// Error: "new row violates row-level security policy"
// Solution: Check RLS policies on table, ensure user_id matches auth.uid()

// Pattern 2: Edge Function CORS
// Error: "CORS policy: No 'Access-Control-Allow-Origin' header"
// Solution: Ensure corsHeaders are included in ALL responses (including errors)

// Pattern 3: TypeScript Type Errors
// Error: "Property 'x' does not exist on type 'y'"
// Solution: Define proper interfaces or use type assertions

// Pattern 4: RAG Vector Mismatch
// Error: "dimension mismatch in vector comparison"
// Solution: Ensure embedding model matches (Gemini text-embedding-004 = 768 dimensions)

// Pattern 5: VEO Rate Limiting
// Error: "Too many requests"
// Solution: Add 2-second delay between generate-videos calls

// Pattern 6: Broken RAG Chunks
// Error: RAG returns irrelevant or empty results
// Solution: Check knowledge files use ## headers, re-run chunk_and_embed.py
```

## Performance Optimization

### Best Practices
1. Use React.memo() for expensive components
2. Implement pagination for large lists (Gallery, Planner)
3. Lazy load routes with React.lazy()
4. Optimize images (use Supabase storage CDN)
5. Cache RAG embeddings (knowledge_embeddings table)
6. Use Supabase `.select()` to limit fields returned
7. Implement connection pooling for database
8. Use VEO batch processing when possible

### Example: Lazy Loading
```tsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./screens/Dashboard/Dashboard'));

// In routes
<Route
  path="/dashboard"
  element={
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  }
/>
```

## Testing Approach

### Manual Testing Checklist
- [ ] Authentication (login, register, logout, OAuth)
- [ ] Onboarding flow completion
- [ ] Topic generation (5 topics returned)
- [ ] Script generation (RAG-enhanced, multi-language)
- [ ] Image generation (FLUX vs DALL-E)
- [ ] Video generation (VEO with voiceover)
- [ ] Video status polling (until complete)
- [ ] Final video assembly (FFmpeg + BGM)
- [ ] Content scheduling in planner
- [ ] Dashboard metrics display
- [ ] Settings and token management
- [ ] Analytics tracking

### Future: Unit Testing Setup
```bash
# Install testing libraries
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Example test
import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';

test('renders dashboard title', () => {
  render(<Dashboard />);
  expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
});
```

## Deployment Checklist

### Frontend (React App)
- [ ] Environment variables configured (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Build succeeds (`npm run build`)
- [ ] Preview works (`npm run preview`)
- [ ] Deploy to Vercel/Netlify/Cloudflare Pages

### Backend (Supabase)
- [ ] Supabase Edge Functions deployed (`supabase functions deploy`)
- [ ] Supabase secrets set:
  - OPENAI_API_KEY
  - OPENROUTER_API_KEY
  - GEMINI_API_KEY
  - HUGGINGFACE_API_KEY
  - VEO_API_KEY
  - PEXELS_API_KEY
- [ ] Database migrations applied
- [ ] RLS policies enabled on all tables
- [ ] OAuth providers configured
- [ ] Storage buckets created (generated-images, final_videos)
- [ ] Production URL added to Supabase redirect URLs
- [ ] Knowledge embeddings populated (chunk_and_embed.py)

### Python Backend (FastAPI)
- [ ] Deploy to VPS/Cloud (Railway, Render, DigitalOcean)
- [ ] FFmpeg installed on server
- [ ] Environment variables set:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - BACKEND_API_KEY
- [ ] CORS configured for frontend domain
- [ ] Health check endpoint accessible

## Quick Reference Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run preview                # Preview production build

# Supabase
supabase start                 # Start local Supabase
supabase db reset              # Reset local database
supabase functions deploy      # Deploy all Edge Functions
supabase functions deploy generate-script  # Deploy specific function
supabase functions logs generate-script    # View function logs
supabase migration new         # Create new migration
supabase secrets set KEY=value # Set Edge Function secrets

# Python Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload      # Start FastAPI dev server
uvicorn main:app --host 0.0.0.0 --port 8000  # Production server

# Knowledge Embedding Pipeline
cd docs/n8n
pip install -r requirements.txt
python chunk_and_embed.py --folder "D:\Projects\Sparkfluence_n8n\Viral_Script_Generator" --project-type viral_script
python chunk_and_embed.py --folder "D:\Projects\Sparkfluence_n8n\Image_and_Video_Generator" --project-type image_video

# Git
git status                     # Check status
git add .                      # Stage all changes
git commit -m "message"        # Commit changes
git push                       # Push to remote
```

## Environment Variables Reference

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Supabase Edge Function Secrets
```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
supabase secrets set GEMINI_API_KEY=AIza...
supabase secrets set HUGGINGFACE_API_KEY=hf_...
supabase secrets set VEO_API_KEY=...
supabase secrets set PEXELS_API_KEY=...
```

### Python Backend (.env)
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BACKEND_API_KEY=your_secure_random_key
```

### Embedding Script (.env in docs/n8n/)
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
GEMINI_API_KEY=AIza...
```

## Additional Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn UI](https://ui.shadcn.com/)
- [OpenRouter API](https://openrouter.ai/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Google Gemini API](https://ai.google.dev/docs)
- [HuggingFace FLUX](https://huggingface.co/black-forest-labs/FLUX.1-schnell)
- [VEO API Documentation](https://geminigen.ai/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

---

**Last Updated:** 2025-12-07
**Latest Changes:** 
- Clarified architecture: NO n8n, all Supabase Edge Functions
- Confirmed embedding match: Gemini 768D on both storage and query
- Added Knowledge Base file structure
- Updated RAG architecture diagram

This guide enables any AI assistant to effectively understand and work with the Sparkfluence codebase. For questions or updates, please modify this document accordingly.
