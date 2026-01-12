# Sparkfluence v2.0 - Complete Technical Specification

> **For Claude Code Execution**  
> **Last Updated:** January 2026

---

## ⚡ Quick Status for Claude Code

```
✅ DATABASE: READY (schema executed, .env configured)
✅ CONNECTION: Use .env file for Supabase credentials
📁 API DOCS: D:\Projects\fal_ai_model\ (READ BEFORE IMPLEMENTING)
📁 PROJECT: D:\Projects\sparkfluence_platform\
```

---

## Table of Contents
1. [User Flow Summary](#1-user-flow-summary)
2. [Screens to Update](#2-screens-to-update)
3. [Image Generation Flow](#3-image-generation-flow)
4. [Video Generation Flow](#4-video-generation-flow)
5. [New Components](#5-new-components)
6. [API Integrations](#6-api-integrations)
7. [Edge Functions](#7-edge-functions)
8. [API Documentation Reference](#8-api-documentation-reference)
9. [Model Constants](#9-model-constants)
10. [Environment Variables](#10-environment-variables)
11. [Priority Order](#11-priority-order)

---

## 1. User Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE USER FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  /script-lab                                                                    │
│  └─→ Enter topic, generate script                                              │
│      └─→ Script with segments created                                          │
│                                                                                 │
│  /image-generation                                                              │
│  └─→ Per segment:                                                               │
│      ├─→ [Generate] → Creates 1st image                                        │
│      ├─→ [Regenerate] → Appends 2nd image (NOT replace)                        │
│      ├─→ [Regenerate] → Appends 3rd image                                      │
│      ├─→ [Add Reference] → Opens modal:                                        │
│      │   ├─→ Search Unsplash/Pexels (keyword editable)                        │
│      │   ├─→ OR Upload own image                                               │
│      │   └─→ Selected image added to gallery                                   │
│      └─→ Click to SELECT final image (1 per segment)                          │
│                                                                                 │
│  └─→ [Continue to Video Generation]                                            │
│      └─→ Selected images passed to next step                                   │
│                                                                                 │
│  /video-generation                                                              │
│  └─→ Per segment:                                                               │
│      ├─→ Shows selected image                                                  │
│      ├─→ Image analyzed by Gemini Vision API                                   │
│      ├─→ Video prompt AUTO-GENERATED from image analysis                       │
│      ├─→ User can edit prompt (optional)                                       │
│      └─→ [Generate Video] → Sends to Wan 2.5 / Kling 2.5                      │
│                                                                                 │
│  └─→ [Combine Final Video]                                                     │
│      └─→ FFmpeg combines all segments + voice + music                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Screens to Update

### 2.1 `/script-lab` (ScriptLab.tsx)
**Changes:**
- [ ] Remove `MODEL_OPTIONS` and model selector dropdown
- [ ] Keep only: topic input, duration, aspect ratio, language
- [ ] Fix refresh button to reload topic suggestions
- [ ] **Generate unique Order ID** when script is created
- [ ] Display Order ID prominently in UI (for tracking through entire flow)
- [ ] Order ID format: `SF-{timestamp}-{random}` (e.g., `SF-20260112-A3X9`)

### 2.2 `/topic-selection` (TopicSelection.tsx) 
**Same form as ScriptLab, update similarly:**
- [ ] Remove `MODEL_OPTIONS` constant and model selector
- [ ] Remove `model` state variable
- [ ] Remove model from form submission
- [ ] Fix refresh button rate limiting issues

### 2.3 `/video-editor` → Rename to `/image-generation`
**Major refactor:**
- [ ] Rename folder `VideoEditor` → `ImageGeneration`
- [ ] Update route in `src/index.tsx`
- [ ] Add header model selector (AUTO / Flux Kontext / Nano Banana Edit)
- [ ] NO duration selector (auto from script)
- [ ] Add multi-image gallery per segment (regenerate = append)
- [ ] Add stock image modal (Unsplash + Pexels)
- [ ] Add user upload option
- [ ] Add cost estimator component

### 2.4 `/video-generation` (VideoGeneration.tsx)
**Major refactor:**
- [ ] Add header model selector (Wan 2.5 / Kling 2.5)
- [ ] Duration auto-calculated from segment type (NOT user-selectable)
- [ ] Show selected image + auto-generated video prompt
- [ ] Allow user to edit video prompt
- [ ] Add options panel (subtitles, music toggle)
- [ ] Add music library selector (new + history)
- [ ] Add cost estimator

### 2.5 `/onboarding` (Onboarding.tsx)
**Add voice recording:**
- [ ] Add "Record Voice" step after avatar upload
- [ ] Voice recorder component (WebAudio API)
- [ ] **Minimum 2 minutes duration** for quality voice cloning
- [ ] Show recording timer and progress bar
- [ ] Upload to `voice-references` bucket
- [ ] Save URL to `user_profiles.voice_reference_url`

### 2.6 `/profile` (Profile.tsx)
**Add voice re-upload:**
- [ ] Section to view current voice reference (with playback)
- [ ] Button to re-record/re-upload voice
- [ ] Same 2-minute minimum requirement
- [ ] Voice recorder component (reuse from onboarding)
- [ ] Update `user_profiles.voice_reference_url` on save

### 2.7 Route Changes (src/index.tsx)

```typescript
// Before
<Route path="/video-editor" element={<VideoEditor />} />

// After
<Route path="/image-generation" element={<ImageGeneration />} />
```

---

## 3. Image Generation Flow

### 3.1 Segment Image Gallery (Multiple Images per Segment)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  SEGMENT 2: BODY-1 (10s) - "Fitur kamera iPhone 15 Pro yang revolutionary"    │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Generated Images (click to select):                                           │
│                                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                                     │
│  │          │  │          │  │    ✓     │  ← Selected (green border)          │
│  │   📷 1   │  │   📷 2   │  │   📷 3   │                                     │
│  │          │  │          │  │          │                                     │
│  └──────────┘  └──────────┘  └──────────┘                                     │
│   Gen #1        Gen #2        Gen #3 ✓                                        │
│                                                                                │
│  [🔄 Regenerate]  [+ Add Reference]  [🗑️ Clear All]                           │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘

Key behaviors:
- Duration shown per segment (5s or 10s) - AUTO calculated, not user input
- First generate: 1 image
- Each "Regenerate" click: **Opens popup with note input** (see 3.3)
- User clicks image to SELECT it (only 1 selected per segment)
- Selected image = used for video generation
```

### 3.2 Regenerate Popup (NEW)

```
┌────────────────────────────────────────────────────────┐
│  🔄 Regenerate Image                                      │
├────────────────────────────────────────────────────────┤
│                                                          │
│  Any additional notes for this regeneration?            │
│  (Optional - leave empty to use same prompt)            │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ e.g., "Make it more dramatic lighting"            │  │
│  │ or "Add more warm colors"                         │  │
│  │ or "Show product from different angle"            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ────────────────────────────────────────────────────  │
│                                                          │
│  Or add new image reference:                            │
│  [📷 Upload Reference Image]                            │
│                                                          │
├────────────────────────────────────────────────────────┤
│                         [Cancel]  [🔄 Regenerate]        │
└────────────────────────────────────────────────────────┘

Behavior:
- Note is OPTIONAL - user can skip and regenerate with same prompt
- If note provided → append to original prompt: "{original_prompt}. Additional: {note}"
- If image reference uploaded → use as reference for image-to-image model
- Save note in `image_generation_jobs.regeneration_note` for tracking
```

### 3.3 B-ROLL Reference Modal (Dynamic Search)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📸 Add Image Reference                                              [X]       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🔍  iPhone 15 Pro camera                              [Search]         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│        ↑                                                                        │
│        Auto-filled from segment keyword, USER CAN EDIT                         │
│                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  [📷 Stock Images]  [📤 My Uploads]                        ← Tabs              │
│                                                                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                       │
│  │        │ │        │ │        │ │        │ │        │                       │
│  │  Img1  │ │  Img2  │ │  Img3  │ │  Img4  │ │  Img5  │    From Unsplash     │
│  │        │ │        │ │        │ │        │ │        │    or Pexels          │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘                       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                       │
│  │        │ │        │ │        │ │        │ │        │                       │
│  │  Img6  │ │  Img7  │ │  Img8  │ │  Img9  │ │ Img10  │                       │
│  │        │ │        │ │        │ │        │ │        │                       │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘                       │
│                                                                                 │
│  [Load More from Unsplash/Pexels...]                                           │
│                                                                                 │
│  ───────────────────────── OR ─────────────────────────                        │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                         │   │
│  │     📤 Drag & drop image here or click to upload                       │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                               [Cancel]  [Use Selected Image]   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Video Generation Flow

### 4.1 Image → Video Prompt Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     IMAGE → VIDEO PROMPT PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  STEP 1: User selects final image per segment                                   │
│          ↓                                                                      │
│  STEP 2: System analyzes image using Gemini 2.0 Flash Vision (FREE)            │
│          ↓                                                                      │
│  STEP 3: Generate video prompt based on:                                        │
│          - Image content/composition                                            │
│          - Original script text                                                 │
│          - Segment type (HOOK/B-ROLL/CTA)                                      │
│          ↓                                                                      │
│  STEP 4: Send to Wan 2.5 / Kling 2.5 for video generation                      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Image Analysis → Video Prompt Example

```
INPUT (Selected Image):
┌──────────────────────────────┐
│                              │
│    [iPhone 15 Pro image      │
│     showing camera system    │
│     on wooden table]         │
│                              │
└──────────────────────────────┘

GEMINI VISION ANALYSIS (JSON):
{
  "description": "iPhone 15 Pro smartphone on wooden table, 
                  focus on triple camera system, natural lighting,
                  shallow depth of field, professional product shot",
  "objects": ["smartphone", "iPhone", "camera", "table", "wood"],
  "style": "product photography, clean, minimal",
  "lighting": "natural, soft, warm tones",
  "composition": "centered, close-up, shallow DOF",
  "suggested_motion": "slow push-in or orbit"
}

AUTO-GENERATED VIDEO PROMPT:
"Cinematic close-up of iPhone 15 Pro on wooden table, 
camera slowly pushing in on the triple camera system.
Natural warm lighting with soft shadows.
Subtle reflection on screen. Shallow depth of field.
Professional product video style. 5 seconds duration.
No camera shake, smooth motion."
```

### 4.3 Video Generation Screen

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  /video-generation                                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Video Model: [Wan 2.5 ▼]    [⚙️ Options]                                       │
│                                                                                 │
│  ═══════════════════════════════════════════════════════════════════════════   │
│                                                                                 │
│  SEGMENT 1: HOOK (5s)                                                           │
│  ┌──────────────┐  ┌────────────────────────────────────────────────────────┐  │
│  │              │  │ Video Prompt (auto-generated from image):              │  │
│  │  [Selected   │  │                                                        │  │
│  │   Image]     │  │ "Close-up of young Indonesian creator speaking        │  │
│  │              │  │  directly to camera, energetic expression, studio      │  │
│  │              │  │  lighting, slight head movement, natural blink..."     │  │
│  └──────────────┘  │                                                        │  │
│                    │ [✏️ Edit Prompt]                                       │  │
│                    └────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  Status: ⏳ Pending    [▶️ Generate Video]                                     │
│                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  SEGMENT 2: BODY-1 (10s)                                                        │
│  ┌──────────────┐  ┌────────────────────────────────────────────────────────┐  │
│  │              │  │ Video Prompt (auto-generated from image):              │  │
│  │  [Selected   │  │                                                        │  │
│  │   iPhone     │  │ "iPhone 15 Pro on wooden surface, camera slowly        │  │
│  │   Image]     │  │  orbits around device, focus pulls to camera module,   │  │
│  │              │  │  warm natural lighting, subtle reflections..."         │  │
│  └──────────────┘  │                                                        │  │
│                    │ [✏️ Edit Prompt]                                       │  │
│                    └────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  Status: ⏳ Pending    [▶️ Generate Video]                                     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. New Components

### 5.1 Component Structure

```
src/components/features/
├── ImageGeneration/
│   ├── SegmentImageGallery.tsx   # Multi-image grid per segment
│   ├── StockImageModal.tsx       # Unsplash/Pexels search + upload
│   ├── ImageModelSelector.tsx    # AUTO, Flux Kontext, Nano Banana
│   └── index.ts
├── VideoGeneration/
│   ├── VideoPromptEditor.tsx     # Show image + editable prompt
│   ├── VideoModelSelector.tsx    # Wan 2.5, Kling 2.5
│   └── index.ts
├── CostEstimator/
│   ├── CostEstimator.tsx
│   ├── CostBreakdown.tsx
│   └── index.ts
├── VoiceRecorder/
│   ├── VoiceRecorder.tsx         # Record voice for cloning
│   ├── AudioWaveform.tsx
│   └── index.ts
└── MusicLibrary/
    ├── MusicLibrarySelector.tsx  # Select from history or generate new
    ├── MusicPlayer.tsx
    └── index.ts
```

### 5.2 VoiceRecorder Component

```typescript
interface VoiceRecorderProps {
  minDuration: number;          // 120 seconds (2 minutes)
  maxDuration?: number;         // Optional max (default: 180s / 3 min)
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  existingAudioUrl?: string;    // For playback of current recording
}

// Features:
// - Real-time recording with WebAudio API
// - Visual waveform display
// - Timer showing current duration
// - Progress bar to 2-minute minimum
// - Warning if stopped before minimum
// - Playback of recorded audio before save
// - Upload to Supabase Storage
```

### 5.3 RegeneratePopup Component

```typescript
interface RegeneratePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: (note?: string, referenceImage?: File) => void;
  segmentType: string;
  originalPrompt: string;
}

// Features:
// - Optional textarea for additional notes
// - Optional image upload for new reference
// - Preview of uploaded reference
// - Cancel and Regenerate buttons
// - Note saved to image_generation_jobs.regeneration_note
```

### 5.4 SegmentImageGallery Props

```typescript
interface SegmentImage {
  id: string;
  image_url: string;
  generation_number: number;
  source_type: 'generated' | 'stock' | 'uploaded';
  is_selected: boolean;
  created_at: string;
}

interface SegmentImageGalleryProps {
  sessionId: string;
  segmentId: string;
  segmentType: string;
  keyword: string;            // For stock search auto-fill
  images: SegmentImage[];
  onSelect: (imageId: string) => void;
  onRegenerate: () => void;
  onAddReference: () => void;  // Opens StockImageModal
  onClearAll: () => void;
}
```

### 5.5 StockImageModal Props

```typescript
interface StockImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialKeyword: string;     // Auto-filled, user can edit
  onSelectImage: (image: StockImage) => void;
  onUploadImage: (file: File) => void;
}
```

### 5.6 VideoPromptEditor Props

```typescript
interface VideoPromptEditorProps {
  segmentId: string;
  selectedImage: {
    url: string;
    analysis: ImageAnalysis;
  };
  generatedPrompt: string;
  onPromptChange: (prompt: string) => void;
  onResetToGenerated: () => void;
}
```

---

## 6. API Integrations

### 6.1 Stock Image Search (Unsplash + Pexels)

```typescript
interface StockSearchRequest {
  query: string;
  provider?: 'unsplash' | 'pexels' | 'both';
  page?: number;
  per_page?: number;  // Default: 20
}

interface StockImage {
  id: string;
  provider: 'unsplash' | 'pexels';
  url_thumb: string;
  url_regular: string;
  url_full: string;
  width: number;
  height: number;
  photographer: string;
  photographer_url: string;
  alt_description: string;
}

// Unsplash API
const UNSPLASH_API = 'https://api.unsplash.com/search/photos';
// Headers: Authorization: Client-ID {UNSPLASH_ACCESS_KEY}

// Pexels API  
const PEXELS_API = 'https://api.pexels.com/v1/search';
// Headers: Authorization: {PEXELS_API_KEY}
```

### 6.2 Image Analysis (Gemini 2.0 Flash Vision - FREE)

```typescript
interface ImageAnalysis {
  description: string;
  objects: string[];
  style: string;
  lighting: string;
  composition: string;
  colors: string[];
  mood: string;
  suggested_motion: string;
}

async function analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { 
              inline_data: { 
                mime_type: 'image/jpeg', 
                data: await fetchImageAsBase64(imageUrl) 
              }
            },
            { 
              text: `Analyze this image for video generation. Return JSON:
              - description: detailed description
              - objects: array of main objects
              - style: visual style
              - lighting: lighting description
              - composition: how elements are arranged
              - colors: dominant colors
              - mood: emotional tone
              - suggested_motion: recommended camera movement for 5-10s video`
            }
          ]
        }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    }
  );
  return response.json();
}
```

### 6.3 Generate Video Prompt from Image

```typescript
function generateVideoPrompt(params: {
  image_analysis: ImageAnalysis;
  segment_type: string;
  script_text: string;
  duration_seconds: number;
}): string {
  const { image_analysis, segment_type, script_text, duration_seconds } = params;
  
  return `
Cinematic ${duration_seconds}-second video.

SCENE: ${image_analysis.description}
OBJECTS: ${image_analysis.objects.join(', ')}
STYLE: ${image_analysis.style}
LIGHTING: ${image_analysis.lighting}
MOOD: ${image_analysis.mood}

CAMERA MOTION: ${image_analysis.suggested_motion}

${segment_type === 'HOOK' || segment_type === 'CTA' 
  ? 'Subject speaks directly to camera with natural micro-movements.'
  : 'No human subjects. Focus on product/scene motion.'}

TECHNICAL: Smooth motion, no artifacts, professional quality.
  `.trim();
}
```

---

## 7. Edge Functions

| Function | Status | Purpose |
|----------|--------|---------|
| `search-stock-images` | NEW | Search Unsplash + Pexels |
| `analyze-image` | NEW | Gemini Vision API analysis |
| `generate-video-prompt` | NEW | Create prompt from image analysis |
| `generate-script` | UPDATE | Remove model param, add session creation |
| `generate-images` | UPDATE | Multi-model, source_type, generation_number |
| `generate-videos` | UPDATE | Wan 2.5, Kling 2.5, image-based prompts |
| `generate-voice` | NEW | Chatterbox TTS integration |
| `generate-music` | NEW | Minimax Music v2 integration |
| `calculate-cost` | NEW | Cost estimation API |

---

## 8. API Documentation Reference

### ⚠️ CRITICAL: Read API Docs Before Implementation!

All fal.ai API documentation is stored in:
```
D:\Projects\fal_ai_model\
```

**Claude Code MUST read the relevant PDF documentation before implementing any generation feature.**

### 8.1 Documentation Structure

```
D:\Projects\fal_ai_model\
├── image\
│   ├── FLUX.1 Kontext [pro] _Image to Image _ fal.ai.pdf    ← For HOOK, CTA (with avatar)
│   ├── Nano Banana _Image to Image _fal.ai.pdf              ← For HOOK, CTA (with avatar)
│   ├── Bytedance Seedream v4 _Text to Image _ fal.ai.pdf    ← For B-ROLL (no face)
│   └── Qwen Image _ Text to Image _ fal.ai.pdf              ← For B-ROLL (no face)
├── video\
│   ├── Wan 2.5 Image to Video _Image to Video _fal.ai.pdf   ← Primary video model
│   └── Kling Video _ Image to Video _ fal.ai.pdf            ← Alternative video model
├── Chatterbox Turbo _Text to Speech _ fal.ai.pdf          ← Voice generation (TTS)
└── Minimax Music _Text to Audio _ fal.ai.pdf              ← Background music generation
```

### 8.2 Implementation Checklist

**Before implementing `generate-images` Edge Function:**
- [ ] Read `image/FLUX.1 Kontext [pro] _Image to Image _ fal.ai.pdf`
- [ ] Read `image/Nano Banana _Image to Image _fal.ai.pdf`
- [ ] Read `image/Bytedance Seedream v4 _Text to Image _ fal.ai.pdf`
- [ ] Read `image/Qwen Image _ Text to Image _ fal.ai.pdf`

**Before implementing `generate-videos` Edge Function:**
- [ ] Read `video/Wan 2.5 Image to Video _Image to Video _fal.ai.pdf`
- [ ] Read `video/Kling Video _ Image to Video _ fal.ai.pdf`

**Before implementing `generate-voice` Edge Function:**
- [ ] Read `Chatterbox Turbo _Text to Speech _ fal.ai.pdf`

**Before implementing `generate-music` Edge Function:**
- [ ] Read `Minimax Music _Text to Audio _ fal.ai.pdf`

### 8.3 Key Info to Extract from Docs

| Document | Key Info to Note |
|----------|------------------|
| Image models | Endpoint URL, request schema, image_size params, style options |
| Video models | Duration options (5s/10s), aspect_ratio, resolution, image input format |
| Chatterbox | Voice reference input, language support, audio output format |
| Minimax Music | Prompt format, duration, mood/genre options |

**⚠️ CRITICAL: For EACH model, check and document:**

| Check | What to Look For |
|-------|------------------|
| **Seed Support** | Does it have `seed` parameter? What's the valid range? |
| **Negative Prompt** | Does it have `negative_prompt` parameter? |
| **Required Fields** | What fields are mandatory vs optional? |
| **Rate Limits** | Any request limits per minute/hour? |

**Update `MODEL_CAPABILITIES` config after reading each doc!**

---

## 9. Model Constants

### 9.1 Image Models

```typescript
// For HOOK, CTA, B-ROLL with reference
export const IMAGE_MODELS_WITH_REF = [
  { id: 'auto', name: 'AUTO', description: 'Auto-select best model' },
  { id: 'flux-pro/kontext', name: 'Flux Kontext Pro', price: 0.04 },
  { id: 'nano-banana/edit', name: 'Nano Banana Edit', price: 0.039 },
];

// For B-ROLL without reference
export const IMAGE_MODELS_NO_REF = [
  { id: 'bytedance/seedream/v4/text-to-image', name: 'Seedream v4', price: 0.03 },
  { id: 'qwen-image', name: 'Qwen Image', price: 0.02 },
];
```

### 9.2 Video Models

```typescript
export const VIDEO_MODELS = [
  { 
    id: 'wan-25-preview/image-to-video', 
    name: 'Wan 2.5 Preview',
    durations: [5, 10],  // Only 5s and 10s available
    pricePerSecond: 0.10,
  },
  { 
    id: 'kling-video/v2.5-turbo/standard/image-to-video', 
    name: 'Kling 2.5 Turbo',
    durations: [5, 10],  // Only 5s and 10s available
    basePrice: 0.21,
    pricePerSecond: 0.042,
  },
];
```

### 9.3 Auto-Duration Logic (Applies to BOTH Image & Video Generation)

**⚠️ IMPORTANT: User does NOT select duration anywhere!**

Duration is auto-assigned based on:
1. **Segment type** (HOOK, FORE, CTA, etc.)
2. **Total video duration** selected in `/script-lab` (30s, 60s, 90s)

**Duration rules by segment type:**

| Segment Type | Duration | Notes |
|--------------|----------|-------|
| HOOK | 5s | Always 5s |
| FORE | 5s | Always 5s |
| CTA | 5s | Always 5s |
| LOOP-END | 5s | Always 5s |
| BODY-X | 5s or 10s | Depends on total video duration |
| PEAK | 5s or 10s | Depends on total video duration |

**BODY/PEAK duration based on total video duration:**

| Total Duration | BODY/PEAK Duration | Reason |
|----------------|-------------------|--------|
| 30s | 5s | Short video, keep segments tight |
| 60s | 10s | Standard length |
| 90s | 10s | More segments, not longer segments |

```typescript
// Auto-duration calculation - used in BOTH image & video generation
function getSegmentDuration(
  segmentType: string, 
  totalDuration: '30s' | '60s' | '90s'
): 5 | 10 {
  // Fixed 5s segments
  if (['HOOK', 'FORE', 'CTA', 'LOOP-END'].includes(segmentType)) {
    return 5;
  }
  
  // BODY and PEAK depend on total duration
  if (totalDuration === '30s') {
    return 5;  // Short video = shorter segments
  }
  
  return 10;  // 60s and 90s = 10s for BODY/PEAK
}
```

**Where duration is used:**
- `/image-generation`: Duration shown per segment card (display only)
- `/video-generation`: Duration shown per segment card + sent to video API
- Cost calculation: Based on segment duration

---

### 9.4 Order ID System

**Purpose:** Unique identifier to track a video project from script to final output.

```typescript
// Order ID Generation
interface OrderIdConfig {
  prefix: 'SF';                    // Sparkfluence
  timestamp: string;               // YYYYMMDD
  random: string;                  // 4 alphanumeric chars
}

function generateOrderId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SF-${date}-${random}`;  // e.g., SF-20260112-A3X9
}
```

**Order ID Usage:**
| Screen | Display | Storage |
|--------|---------|----------|
| `/script-lab` | Header badge after script generated | `generation_sessions.order_id` |
| `/image-generation` | Header badge (readonly) | Referenced from session |
| `/video-generation` | Header badge (readonly) | Referenced from session |
| `/final-video` | Header badge + in filename | `final_videos.order_id` |

**Database:**
```sql
ALTER TABLE generation_sessions 
  ADD COLUMN order_id VARCHAR(20) UNIQUE NOT NULL;

-- Index for fast lookup
CREATE INDEX idx_generation_sessions_order_id ON generation_sessions(order_id);
```

---

### 9.5 Seed for Consistency

**Purpose:** Ensure reproducible results and maintain visual consistency across regenerations.

**⚠️ IMPORTANT: Check API docs first! Not all models support seed.**

```typescript
// Seed Configuration
const SEED_CONFIG = {
  min: 0,
  max: 2147483647,  // 2^31 - 1 (safe integer for most models)
};

// Generate unique seed for each generation
function generateSeed(orderId: string, segmentIndex: number, generationNumber: number): number {
  // Create deterministic but unique seed from order context
  const baseHash = hashString(`${orderId}-${segmentIndex}-${generationNumber}`);
  return Math.abs(baseHash) % SEED_CONFIG.max;
}

// Simple hash function
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}
```

**Seed Storage:**
```sql
-- Image jobs
ALTER TABLE image_generation_jobs ADD COLUMN seed BIGINT;

-- Video jobs  
ALTER TABLE video_generation_jobs ADD COLUMN seed BIGINT;
```

**⚠️ CHECK API DOCS in `D:\Projects\fal_ai_model\` for each model:**

| Model | API Doc | Seed Support | Range |
|-------|---------|--------------|-------|
| Flux Kontext Pro | `image/FLUX.1 Kontext [pro]...pdf` | ❓ Check | ❓ |
| Nano Banana | `image/Nano Banana...pdf` | ❓ Check | ❓ |
| Seedream v4 | `image/Bytedance Seedream v4...pdf` | ❓ Check | ❓ |
| Qwen Image | `image/Qwen Image...pdf` | ❓ Check | ❓ |
| Wan 2.5 | `video/Wan 2.5...pdf` | ❓ Check | ❓ |
| Kling 2.5 | `video/Kling Video...pdf` | ❓ Check | ❓ |

**Implementation Rule:**
```typescript
// Only include seed if model supports it
const request = {
  prompt: generatedPrompt,
  // ... other params
  ...(MODEL_SUPPORTS_SEED[modelId] && { seed: generateSeed(...) }),
};
```

---

### 9.6 Negative Prompt

**Purpose:** Prevent unwanted elements in generated images/videos.

**⚠️ IMPORTANT: Check API docs first! Not all models support negative_prompt.**

```typescript
// Standard Negative Prompts by Content Type
export const NEGATIVE_PROMPTS = {
  // For CREATOR segments (HOOK, CTA) - with face
  creator: `
    blurry, low quality, distorted, artifacts, deformed face, 
    extra limbs, bad anatomy, watermark, text overlay, logo, 
    oversaturated, underexposed, grainy, pixelated
  `.trim(),
  
  // For B-ROLL segments - no humans
  broll: `
    blurry, low quality, distorted, artifacts, 
    human face, person, people, hands, fingers,
    text, watermark, logo, cartoon, anime, illustration, 
    painting, oversaturated, underexposed, flat lighting
  `.trim(),
  
  // For video generation
  video: `
    blurry, low quality, distorted, artifacts, glitchy,
    morphing, flickering, unstable, jittery camera,
    text overlay, watermark, logo, subtitles
  `.trim(),
};
```

**⚠️ CHECK API DOCS in `D:\Projects\fal_ai_model\` for each model:**

| Model | API Doc | Negative Prompt Support |
|-------|---------|------------------------|
| Flux Kontext Pro | `image/FLUX.1 Kontext [pro]...pdf` | ❓ Check |
| Nano Banana | `image/Nano Banana...pdf` | ❓ Check |
| Seedream v4 | `image/Bytedance Seedream v4...pdf` | ❓ Check |
| Qwen Image | `image/Qwen Image...pdf` | ❓ Check |
| Wan 2.5 | `video/Wan 2.5...pdf` | ❓ Check |
| Kling 2.5 | `video/Kling Video...pdf` | ❓ Check |

**Implementation Rule:**
```typescript
// Only include negative_prompt if model supports it
const request = {
  prompt: generatedPrompt,
  // ... other params
  ...(MODEL_SUPPORTS_NEGATIVE[modelId] && { 
    negative_prompt: isCreatorSegment 
      ? NEGATIVE_PROMPTS.creator 
      : NEGATIVE_PROMPTS.broll 
  }),
  ...(MODEL_SUPPORTS_SEED[modelId] && { seed: generateSeed(...) }),
};
```

**After checking docs, update this config:**
```typescript
// To be filled after reading API docs
export const MODEL_CAPABILITIES = {
  'flux-pro/kontext': {
    supports_seed: false,        // Update after checking
    supports_negative: false,    // Update after checking
    seed_range: [0, 0],          // Update if supported
  },
  'nano-banana/edit': {
    supports_seed: false,
    supports_negative: false,
    seed_range: [0, 0],
  },
  // ... etc for all models
};
```

---

## 10. Environment Variables

```bash
# NEW - Stock Image APIs
UNSPLASH_ACCESS_KEY=xxx
PEXELS_API_KEY=xxx

# EXISTING - Already have
GEMINI_API_KEY=xxx      # For Vision API (FREE)
FAL_AI_API_KEY=xxx      # For image/video generation
```

---

## 10.1 Additional Database Schema Updates

**Add to `00000000000000_complete_schema.sql` or create new migration:**

```sql
-- Order ID for session tracking
ALTER TABLE generation_sessions 
  ADD COLUMN order_id VARCHAR(20) UNIQUE NOT NULL;
CREATE INDEX idx_generation_sessions_order_id ON generation_sessions(order_id);

-- Seed and regeneration tracking for images
ALTER TABLE image_generation_jobs 
  ADD COLUMN seed BIGINT,
  ADD COLUMN regeneration_note TEXT,
  ADD COLUMN regeneration_reference_url TEXT;

-- Seed for videos
ALTER TABLE video_generation_jobs 
  ADD COLUMN seed BIGINT;

-- Voice reference duration tracking
ALTER TABLE user_profiles
  ADD COLUMN voice_reference_duration_seconds INTEGER;
```

---

## 11. Priority Order

### ✅ COMPLETED
| # | Task | Status |
|---|------|--------|
| 1 | Run `00000000000000_complete_schema.sql` | ✅ **DONE** |
| 2 | Configure Supabase connection in `.env` | ✅ **DONE** |

**Database is READY!** Claude Code can connect directly using `.env` configuration.

### 🚧 PENDING
| # | Task | Type |
|---|------|------|
| 3 | Create storage buckets (if not auto-created) | Supabase |
| 4 | **Read API docs in `D:\Projects\fal_ai_model\`** | **Documentation** |
| 5 | Update Edge Functions | Backend |
| 6 | ScriptLab & TopicSelection - Remove model selector | Frontend |
| 7 | VideoEditor → ImageGeneration - Rename & refactor | Frontend |
| 8 | Add SegmentImageGallery + StockImageModal | Frontend |
| 9 | VideoGeneration - Add image-based prompts | Frontend |
| 10 | Onboarding - Add voice recorder | Frontend |
| 11 | Add CostEstimator components | Frontend |
| 12 | Testing & deployment | QA |

---

**Document Version:** 2.1  
**SQL Schema:** `00000000000000_complete_schema.sql` ✅ EXECUTED  
**Database:** Connected via `.env`
