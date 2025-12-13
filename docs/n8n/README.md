# N8N AI Agents - Sparkfluence

## Overview

The Sparkfluence N8N AI system is a comprehensive 3-workflow automation platform designed to transform content ideas into viral-ready short-form videos for Indonesian Gen-Z audiences. The system integrates multiple AI models (Gemini, OpenAI, VEO 3.1) with RAG (Retrieval Augmented Generation) using Supabase vector database to deliver scripts, images, and videos that follow proven viral patterns.

**Key Capabilities:**
- AI-powered viral script generation using psychological hooks and proven frameworks
- Hollywood-grade cinematic image generation with facial consistency
- Professional video generation using Google VEO 3.1 with motion and audio
- Indonesian Gen-Z linguistic optimization and cultural adaptation
- RAG-enhanced content grounded in viral methodology knowledge base

---

## Architecture

```
┌─────────────────┐
│   Website UI    │
│  (React/Next)   │
└────────┬────────┘
         │
         │ HTTP POST (webhooks)
         ▼
┌─────────────────────────────────────────┐
│            N8N Workflows                │
│  ┌──────────────────────────────────┐  │
│  │  1. Script Generation            │  │
│  │     Gemini + Google Search + RAG │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  2. Image Generation             │  │
│  │     Gemini + DALL-E + RAG        │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  3. Video Generation             │  │
│  │     Gemini + VEO 3.1 + RAG       │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
         │
         │ API Calls
         ▼
┌─────────────────────────────────────────┐
│         External AI Services            │
│  ┌────────────┬─────────┬────────────┐  │
│  │ Gemini 2.0 │ DALL-E  │  VEO 3.1   │  │
│  │   Flash    │    3    │ GeminiGen  │  │
│  └────────────┴─────────┴────────────┘  │
└─────────────────────────────────────────┘
         │
         │ Embeddings & Vector Search
         ▼
┌─────────────────────────────────────────┐
│      Supabase Backend                   │
│  ┌──────────────────────────────────┐  │
│  │  PostgreSQL + pgvector           │  │
│  │  - Knowledge embeddings          │  │
│  │  - Semantic search               │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## Workflows

### 1. Script Generation Workflow
**Purpose:** Generate viral-ready short-form video scripts optimized for Indonesian Gen-Z TikTok/Instagram audiences

**Process Flow:**
1. **Input Validation:** Receive topic, niche, duration, platform
2. **Web Search:** Use Google Custom Search API for trending angles and current context
3. **RAG Retrieval:** Semantic search against 16 knowledge files using OpenAI embeddings
4. **Virality Validation:** Check against 7 Virality Factors (Pro/Contra, Relatability, Celebrity, Trending, Emotion, Shock, Comedy)
5. **Script Generation:** Gemini 2.0 Flash produces 4-part structure (Hook, Foreshadow, Body, Ending)
6. **Output:** Complete script with 3 hook variants, retention editing guide, platform optimization

**Key Knowledge Sources:**
- Seefluencer Core Framework (7 Virality Factors)
- Killer Script Blueprint (4-part structure)
- Psychology of Viral Hooks (250+ hook library)
- Indonesian Gen-Z Edutainment Playbook (slang, tone, cultural nuances)
- Retention Editing Playbook (visual specs, pacing)

**Outputs:**
- Script in 4 segments: HOOK, FORESHADOW, BODY, ENDING/CTA
- Indonesian Gen-Z language (code-mixed, current slang 2024-2025)
- Production direction with emotional labels and scene transitions
- Retention editing guide with SFX timing and visual concepts

### 2. Image Generation Workflow
**Purpose:** Generate Hollywood-grade cinematic images for each video segment with facial consistency

**Process Flow:**
1. **Script Analysis:** Parse segment emotions, transitions, visual requirements
2. **RAG Retrieval:** Search cinematography knowledge (lighting patterns, lens specs, color grading)
3. **Face Reference Handling:** Ali Sadikin Ma facial identity (`alisadikinface.png`)
4. **Prompt Engineering:** Gemini creates detailed image prompts using:
   - Emotion → Expression mapping
   - Lighting patterns (Rembrandt, Butterfly, Loop, Split)
   - Film stock emulation (Kodak Vision3 500T, Portra 400)
   - Camera specs (lens, aperture, shot size)
5. **Image Generation:** DALL-E 3 with cinematic specifications
6. **Output:** Image per segment + Thumbnail with creator face

**Technical Specs:**
- Aspect Ratio: **9:16 vertical** (all outputs)
- Resolution: Minimum 1280×720
- Style: Photorealistic, cinematic, Hollywood blockbuster aesthetic (2015-2025)
- Creator shots: Hook, CTA, Loop-End, Thumbnail
- B-roll shots: Foreshadow, Body, Peak, Twist

**Key Knowledge Sources:**
- AI Video Production Technical Reference (emotion/expression mapping, lighting tables)
- Hollywood Cinematography Addendum (creator-specific lighting recommendations)
- VEO 3.1 Enhanced (motion preparation)

### 3. Video Generation Workflow
**Purpose:** Convert static images into professional video clips with motion, audio, and transitions

**Process Flow:**
1. **Image-to-Video Setup:** Receive generated images from Workflow 2
2. **Motion Prompt Engineering:** Gemini creates VEO prompts using:
   - Camera movements (dolly push-in, tracking, orbit, static)
   - Subject micro-movements (blinks, breathing, gestures)
   - Ambient motion (particles, environmental elements)
   - Audio specifications (dialogue, ambient, exclusions)
3. **Segment Processing:** Each segment ≤8 seconds (VEO constraint)
4. **Video Generation:** GeminiGen.AI VEO 3.1 API
5. **Status Polling:** Check generation status until complete
6. **Output:** Video clips ready for assembly

**Technical Specs:**
- Platform: GeminiGen.AI VEO 3.1 API
- Model: `veo-3.1-fast` for speed or `veo-3.1` for quality
- Duration: 8 seconds per clip (fixed)
- Resolution: 1080p or 720p
- Aspect Ratio: 9:16 vertical
- Frame Rate: 24fps (fixed)
- Audio: Enabled with dialogue constraints (12-15 words per 8s)

**Key Knowledge Sources:**
- VEO 3.1 Enhanced (camera movement library, emotion-to-motion mapping)
- AI Video Production Technical Reference (VEO prompt templates)
- GeminiGen.AI API Documentation (endpoint specs, parameters)

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Orchestration** | N8N (self-hosted/cloud) | Workflow automation and integration |
| **LLM (Primary)** | Gemini 2.0 Flash Experimental | Script generation, prompt engineering |
| **Search** | Google Custom Search API | Trending content research |
| **Image Generation** | OpenAI DALL-E 3 | Cinematic image creation |
| **Video Generation** | GeminiGen.AI VEO 3.1 (`veo-3.1-fast`) | Text-to-video and image-to-video |
| **Vector Database** | Supabase PostgreSQL + pgvector | RAG knowledge storage |
| **Embeddings** | OpenAI `text-embedding-3-small` | Semantic search |
| **Database** | Supabase PostgreSQL | Metadata, user data, video records |

---

## Video Structure (MVP - 30s Short-Form)

| Segment | Duration | Description | Visual Type |
|---------|----------|-------------|-------------|
| **HOOK** | 6s | Attention grabber - stops scroll immediately | Creator face (Ali Sadikin) |
| **BODY_1** | 8s | Main content part 1 - problem/setup | B-roll or creator |
| **BODY_2** | 8s | Main content part 2 - solution/explanation | B-roll or creator |
| **ENDING_CTA** | 8s | Conclusion + Call to Action | Creator face (Ali Sadikin) |

**Total:** 30 seconds (4 clips, each ≤8s for VEO compatibility)

**Future Extensions:**
- 60s format: Add FORESHADOW (5s), BODY_3 (8s), PEAK (7s)
- 90s format: Add multiple body segments and transition shots

---

## Setup Steps

### 1. Database Setup
Run the Supabase SQL schema to create vector-enabled tables:

```bash
# In Supabase SQL Editor, execute:
supabase_vector_schema.sql
```

This creates:
- `knowledge_embeddings` table with pgvector extension
- Semantic search functions
- Indexes for performance

### 2. Environment Variables
Create a `.env` file in your N8N directory:

```env
# OpenAI (for DALL-E & Embeddings)
OPENAI_API_KEY=sk-...

# Supabase (for vector database)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Google Search
GOOGLE_SEARCH_API_KEY=AIza...
GOOGLE_SEARCH_CX=your-custom-search-engine-id

# GeminiGen.AI (for VEO 3.1)
VEO_API_KEY=your-geminigen-api-key

# Gemini (for LLM)
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Populate Vector Database
Run the embedding script to chunk and embed all knowledge files:

```bash
python chunk_and_embed.py
```

This will:
- Read all 16 knowledge files from source folders
- Chunk them into semantic segments
- Generate embeddings using OpenAI `text-embedding-3-small`
- Store in Supabase `knowledge_embeddings` table

### 4. Import N8N Workflows
1. Open your N8N instance
2. Import workflows from JSON files:
   - `workflow_1_script_generator.json`
   - `workflow_2_image_generator.json`
   - `workflow_3_video_generator.json`
3. Update webhook URLs in each workflow
4. Configure credentials for each service

### 5. Configure Website Integration
Update your React/Next.js website with N8N webhook URLs:

```javascript
const API_ENDPOINTS = {
  generateScript: 'https://your-n8n.app/webhook/generate-script',
  generateImages: 'https://your-n8n.app/webhook/generate-images',
  generateVideos: 'https://your-n8n.app/webhook/generate-videos',
  checkVideoStatus: 'https://your-n8n.app/webhook/check-video-status'
};
```

---

## Environment Variables

| Variable | Service | Purpose |
|----------|---------|---------|
| `OPENAI_API_KEY` | OpenAI | DALL-E 3 image generation + text embeddings |
| `SUPABASE_URL` | Supabase | PostgreSQL database connection |
| `SUPABASE_SERVICE_KEY` | Supabase | Admin access for vector operations |
| `GOOGLE_SEARCH_API_KEY` | Google Cloud | Custom Search API for trending research |
| `GOOGLE_SEARCH_CX` | Google Cloud | Custom Search Engine ID |
| `VEO_API_KEY` | GeminiGen.AI | VEO 3.1 video generation access |
| `GEMINI_API_KEY` | Google AI Studio | Gemini 2.0 Flash LLM access |

---

## API Endpoints

### POST /webhook/generate-script
Generate viral script with RAG-enhanced knowledge

**Request Body:**
```json
{
  "topic": "AI replacing jobs in 2025",
  "niche": "Tech/AI",
  "duration": 30,
  "platform": ["tiktok", "instagram"],
  "objective": "education",
  "creativeStyle": "edutainment"
}
```

**Response:**
```json
{
  "success": true,
  "script": {
    "segments": [
      {
        "type": "HOOK",
        "script": "Wait... AI ini baru aja ngambil alih 3 pekerjaan yang lo kira aman!",
        "duration": 6,
        "emotion": "shock",
        "transition": "cut"
      },
      // ... more segments
    ],
    "hookVariants": [...],
    "retentionGuide": {...},
    "viralityFactors": ["Shock", "FOMO", "Trending"]
  }
}
```

### POST /webhook/generate-images
Generate cinematic images for all script segments

**Request Body:**
```json
{
  "script": { /* script object from previous endpoint */ },
  "creatorReference": "alisadikinface.png"
}
```

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "segmentType": "HOOK",
      "imageUrl": "https://...",
      "promptUsed": "Close-up of bald Indonesian man...",
      "technicalSpecs": {...}
    },
    // ... images for each segment
  ],
  "thumbnail": {
    "imageUrl": "https://...",
    "promptUsed": "..."
  }
}
```

### POST /webhook/generate-videos
Convert images to videos using VEO 3.1

**Request Body:**
```json
{
  "images": [ /* images array from previous endpoint */ ],
  "script": { /* script object */ }
}
```

**Response:**
```json
{
  "success": true,
  "status": "processing",
  "videoRequestIds": [
    {
      "segmentType": "HOOK",
      "veoRequestId": "uuid-...",
      "status": "processing"
    },
    // ... for each segment
  ]
}
```

### POST /webhook/check-video-status
Poll VEO generation status

**Request Body:**
```json
{
  "videoRequestIds": ["uuid-1", "uuid-2", ...]
}
```

**Response:**
```json
{
  "success": true,
  "videos": [
    {
      "segmentType": "HOOK",
      "status": "completed",
      "videoUrl": "https://...",
      "duration": 6
    },
    // ... for each segment
  ],
  "allComplete": true
}
```

---

## Files in This Directory

| File | Purpose |
|------|---------|
| `README.md` | This documentation file |
| `supabase_vector_schema.sql` | Database schema for pgvector RAG |
| `chunk_and_embed.py` | Script to populate vector database with knowledge |
| `api_contracts.md` | Detailed API request/response specifications |
| `workflow_1_script_agent.md` | Gemini system prompt for script generation |
| `workflow_2_image_agent.md` | Gemini system prompt for image generation |
| `workflow_3_video_agent.md` | Gemini system prompt for video generation |
| `workflow_1_script_generator.json` | N8N workflow export (script) |
| `workflow_2_image_generator.json` | N8N workflow export (images) |
| `workflow_3_video_generator.json` | N8N workflow export (videos) |
| `knowledge/` | Source knowledge files (16 files from 2 folders) |
| `reference_images/` | Creator face references and visual assets |

---

## Knowledge Base Sources

### Viral_Script_Generator (10 files):
1. **Project_Instruction.md** - Agent identity, output format, constraints
2. **Killer_Script_Blueprint_CONSOLIDATED.md** - 4-part script structure (Hook-Foreshadow-Body-Ending)
3. **Psychology_of_Viral_Hooks_CONSOLIDATED.md** - 250+ hook templates, psychological triggers
4. **The_Ultimate_250_Video_Hook_Library_for_2025.md** - Hook categories and templates by emotion
5. **Indonesian_GenZ_Edutainment_Playbook.md** - Gen-Z slang, tone, language rules, code-mixing
6. **Seefluencer Core Framework.md** - 7 Virality Factors, winning content cycle
7. **TikTok and Short-Form Platform Mastery.md** - Algorithm signals, platform optimization
8. **Retention Editing Playbook.md** - Visual specs, pacing (1-3s cuts), SFX timing
9. **Case Studies and Viral Patterns.md** - Real creator success stories, proven patterns
10. **Creator Growth and Personal Branding.md** - Niche selection, voice authenticity

### Image_and_Video_Generator (6 files):
1. **project_instruction.md** - AI Film Director role, creator face allocation rules
2. **AI_Video_Production_Technical_Reference.md** - Emotion mapping, lighting patterns, cinematography
3. **VEO_3_1_Enhanced.md** - Camera movements, motion library, I2V prompting
4. **Hollywood_Cinematography_Addendum.md** - Creator-specific lighting, quick decision tools
5. **Video Generation Veo - GeminiGen AI Documentation.pdf** - VEO 3.1 API specs, parameters, model differences

---

## RAG Implementation Details

**Embedding Model:** OpenAI `text-embedding-3-small` (1536 dimensions)
**Vector Database:** Supabase PostgreSQL with pgvector extension
**Search Method:** Cosine similarity
**Chunk Size:** 1000-1500 characters with 200 character overlap
**Top-K Retrieval:** 5-10 most relevant chunks per query

**Query Flow:**
1. User input → Embed query using OpenAI
2. Vector similarity search in Supabase
3. Retrieve top relevant knowledge chunks
4. Inject into Gemini context window
5. Generate output grounded in knowledge

---

## Platform-Specific Optimizations

### TikTok
- Aspect Ratio: 9:16 vertical
- Hashtags: 1-2 macro + 1-2 micro + 1 unique
- Hook: Maximum 3 seconds
- Caption: Question-based for comment engagement

### Instagram Reels
- Aspect Ratio: 9:16 vertical
- First frame: High visual impact
- Music: Trending audio preferred
- CTA: "Save this" or "Share with friend who..."

### YouTube Shorts
- Aspect Ratio: 9:16 vertical
- SEO: Strong opening statement for search
- Retention: High information density
- Loop: Seamless ending back to hook

---

## Creator Identity

**Name:** Ali Sadikin Ma
**Reference File:** `alisadikinface.png`

**Physical Traits:**
- Indonesian male, late 30s
- Bald, round face
- Warm skin undertone
- Dark brown eyes
- Rectangular gunmetal semi-rimless glasses
- Clean-shaven
- Confident, approachable presence

**Mandatory Appearances:**
- Hook shot (first impression)
- CTA/Ending shot (final connection)
- Thumbnail (click-worthy impact)

---

## Production Workflow Summary

```
1. Content Ideation
   └─> Website user inputs topic + preferences

2. Script Generation (Workflow 1)
   ├─> Google Search for trending angles
   ├─> RAG retrieval from 16 knowledge files
   ├─> Gemini generates 4-part viral script
   └─> Output: Script with Indonesian Gen-Z language

3. Image Generation (Workflow 2)
   ├─> Parse script emotions and transitions
   ├─> RAG retrieval for cinematography specs
   ├─> Gemini engineers detailed image prompts
   ├─> DALL-E generates cinematic images
   └─> Output: Images per segment + thumbnail

4. Video Generation (Workflow 3)
   ├─> Gemini engineers VEO motion prompts
   ├─> GeminiGen.AI VEO 3.1 I2V generation
   ├─> Status polling until complete
   └─> Output: Video clips (≤8s each)

5. Final Assembly (Manual/Future Automation)
   ├─> Combine video clips
   ├─> Add background music
   ├─> Export final video
   └─> Ready for platform upload
```

---

## Cost Estimates (Per Video)

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| **Gemini 2.0 Flash** | 3 workflows × ~5K tokens | ~$0.05 |
| **OpenAI Embeddings** | RAG queries × 5 searches | ~$0.01 |
| **DALL-E 3** | 4-5 images (1024×1792) | ~$0.20 |
| **VEO 3.1 Fast** | 4 clips × 8s (9:16, 720p, audio) | ~$4.80 |
| **Google Search API** | 3-5 queries | ~$0.02 |
| **Supabase** | Vector queries + storage | ~$0.01 |
| **Total per video** | | **~$5.09** |

*Costs based on current API pricing as of 2025-01. VEO is the most expensive component.*

---

## Troubleshooting

### Common Issues

**Issue:** RAG returns irrelevant results
**Solution:** Check embedding quality, adjust chunk size, verify vector index

**Issue:** VEO generation fails
**Solution:** Verify image resolution ≥1280×720, check dialogue ≤15 words per 8s, ensure aspect ratio is 9:16

**Issue:** Creator face inconsistency
**Solution:** Ensure `alisadikinface.png` reference is included in all creator shots (Hook, CTA, Thumbnail)

**Issue:** Indonesian language sounds robotic
**Solution:** Check RAG retrieval includes `Indonesian_GenZ_Edutainment_Playbook.md`, verify code-mixing and slang usage

**Issue:** Script lacks virality factors
**Solution:** Verify web search is working, check virality validation step, ensure ≥2 factors present

---

## Future Enhancements

- [ ] Auto-assembly of video clips into final video
- [ ] Background music library integration
- [ ] Multi-creator support with face swapping
- [ ] Real-time webhook status updates (WebSocket)
- [ ] Video analytics and performance tracking
- [ ] A/B testing for hook variants
- [ ] Bulk video generation (batch processing)
- [ ] Direct platform upload (TikTok/Instagram API)

---

## Support & Documentation

- **N8N Documentation:** https://docs.n8n.io
- **Gemini API:** https://ai.google.dev/docs
- **OpenAI API:** https://platform.openai.com/docs
- **GeminiGen.AI VEO:** https://geminigen.ai/docs
- **Supabase Vector:** https://supabase.com/docs/guides/ai

---

**Last Updated:** 2025-12-06
**Version:** 1.0.0 (MVP)
**Status:** Phase 1 Complete - Ready for Phase 2 (Database Implementation)
