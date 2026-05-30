# Image Generation Overhaul - Design Document

**Date:** 2026-02-02
**Status:** Approved
**Scope:** Prompt engineering overhaul, auto-reference search, dual keyframes, negative prompts, post-processing

---

## Problem

1. Generated images look "AI-generated" -- missing natural imperfections, film texture, realistic lighting
2. Specific subjects (Tesla Model S, iPhone 16, Eiffel Tower) render as generic objects without reference images
3. VEO 3.1 supports start + end frame via `ref_images` but Sparkfluence only sends 1 image
4. No comprehensive negative prompts to exclude AI artifacts
5. No post-processing for cinematic color/grain
6. Prompt templates lack real camera specs, film stock references, texture instructions

---

## Solution

Full pipeline overhaul: cinematic prompt restructure, auto-reference image search for specific subjects, AI-decided dual keyframes (start + end), comprehensive negative prompts, and optional cinematic post-processing.

---

## 1. Image Prompt Engineering Overhaul

### New Prompt Structure (All Models)

Every image prompt now includes 6 layers:

```
[Subject + Action]
+ [Camera Body + Lens + ISO]
+ [Lighting Pattern + Temperature]
+ [Color/Film Stock Grade]
+ [Texture/Imperfection Instructions]
+ [Anti-AI Suffix]
```

### CREATOR Shots (Talking Head)

```
"The person from the reference image with [expression],
[body language/gesture], [energy description].

Camera: [Shot type] on Canon EOS R5, [lens] f/[aperture], ISO [value],
[angle], [movement hint].
Lighting: [Pattern] from [angle], [ratio], [temperature]K,
[catchlight/shadow detail].
Color: [Film stock] look, [tone description], [grade style].
Texture: Natural skin with visible pores, fine facial hair,
subtle imperfections, no airbrushing.
Outfit: [contextual costume from script].

Style: Professional photography, photorealistic.
NOT AI-generated. Natural imperfections, authentic textures."
```

### B-ROLL Shots (Scenes/Products)

```
"[Subject + scene description].

Camera: Shot on [camera body], [lens], f/[aperture], ISO [value],
[movement: tracking/dolly/static].
Lighting: [Time of day], [direction], [quality],
[highlights/shadows description].
Color: [Color grade style], [film stock] look,
[contrast], [atmosphere detail].
Atmosphere: [Environmental details: haze, dust, reflections].

Style: Professional [category] photography, editorial quality.
NOT: cartoon, cgi, 3d render, illustration, artificial, plastic."
```

### Camera/Lens Lookup by Segment Type

| Segment | Camera | Lens | Aperture | Angle |
|---------|--------|------|----------|-------|
| HOOK | Canon EOS R5 | 85mm | f/1.8 | Eye-level, slight push-in |
| FORE (B-ROLL) | RED Komodo | 50mm | f/2.8 | Slight high angle |
| BODY (B-ROLL) | Sony A7R IV | 35-85mm | f/2.8-4.0 | Varies by content |
| PEAK (B-ROLL) | RED Komodo | 100mm | f/2.0 | Low angle, dramatic |
| CTA | Canon EOS R5 | 85mm | f/1.8 | Eye-level, direct |

### Film Stock by Mood

| Mood | Film Stock | Color Character |
|------|-----------|-----------------|
| Warm/friendly | Kodak Portra 400 | Warm skin tones, soft contrast |
| Cinematic/dramatic | Kodak Vision3 500T | Rich shadows, warm highlights |
| Cool/tech | Fuji Provia 100F | Neutral-cool, high detail |
| Moody/serious | Kodak Tri-X 400 | High contrast, grain texture |
| Bright/energetic | Kodak Ektar 100 | Vivid, saturated, sharp |

### Files to Modify

- `supabase/functions/generate-images/index.ts` -- `buildCinematicPrompt()`, `buildFullCinematographyPrompt()`
- `supabase/functions/_shared/lookups/cinematographyLookup.ts` -- add camera/film stock lookup tables
- `supabase/functions/_shared/prompts/visualEnhancer.ts` -- update emotion→cinematography specs

---

## 2. Auto-Reference Image Search (Specific Subject Problem)

### Flow

```
Script Generation
  ▼
Subject Extraction (LLM, during script gen)
  ├── Detect specific subjects in visual_direction
  ├── Extract: "Tesla Model S", "iPhone 16 Pro", "Eiffel Tower"
  ├── Classify: PRODUCT | LANDMARK | BRAND | FOOD | GENERIC
  └── Output per segment: detected_subjects[]
  ▼
Auto Image Search (Google Custom Search / Serper.dev)
  ├── Search each unique subject (deduplicate across segments)
  ├── Filter: photo (not illustration), high-res, landscape/portrait match
  ├── Return top 3 results per subject
  └── Cache in subject_reference_cache table
  ▼
Image Generation
  ├── B-ROLL with specific subject: auto-searched ref + cinematic prompt
  ├── CREATOR: avatar ref only (existing)
  └── B-ROLL generic: text-to-image only (existing)
  ▼
UI: User Override
  ├── See auto-selected reference thumbnail per segment
  ├── Click to swap with different search result
  ├── Upload own reference image
  └── Remove reference (fall back to text-only)
```

### Subject Detection Output (added to script generation)

```typescript
// NEW fields per segment
{
  detected_subjects: [
    {
      name: "Tesla Model S",
      type: "PRODUCT",
      search_query: "Tesla Model S 2024 side view photo",
      confidence: 0.95
    }
  ]
}
```

### Subject Type Rules

| Type | Auto-Search? | Example |
|------|:---:|---------|
| PRODUCT (brand + model) | YES | Tesla Model S, iPhone 16, Nike Air Max |
| LANDMARK | YES | Eiffel Tower, Taj Mahal, Monas |
| FOOD (specific dish) | YES | Nasi Goreng, Ramen, Croissant |
| BRAND (logo/identity) | YES | Apple logo, Nike swoosh |
| GENERIC scene | NO | "busy street", "modern office" |
| ABSTRACT concept | NO | "success", "innovation" |

### Image Search API

**Primary:** Serper.dev (2,500 free queries/month, fast)
**Fallback:** Google Custom Search (100/day free)
**Generic scenes:** Pexels API (unlimited free)

Keys stored in existing `api_keys_pool` table with rotation.

### Database: subject_reference_cache

```sql
CREATE TABLE subject_reference_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_name text NOT NULL,
  subject_type text NOT NULL,
  search_query text NOT NULL,
  image_urls jsonb NOT NULL,       -- top 3 search results [{url, thumbnail, source}]
  selected_index int DEFAULT 0,    -- which result is currently selected
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,          -- created_at + 30 days
  UNIQUE(subject_name)
);

CREATE INDEX idx_subject_ref_name ON subject_reference_cache(subject_name);
```

### Files to Modify

- `supabase/functions/generate-script/index.ts` -- add subject detection to output
- `supabase/functions/generate-images/index.ts` -- consume detected_subjects, auto-search, use as ref
- `src/screens/ImageGeneration/ImageGeneration.tsx` -- show reference thumbnails, allow override

---

## 3. Start/End Frame (Dual Keyframe for VEO 3.1)

### GeminiGen VEO 3.1 Support

VEO 3.1 accepts up to 2 images in `ref_images` parameter:
- `ref_images[0]` = start frame
- `ref_images[1]` = end frame
- VEO interpolates motion between them

### AI-Decided Dual Keyframe Logic

| Segment Type | Keyframes | Reason |
|---|:---:|---|
| HOOK | 1 | Simple talking head |
| FORE | 1 | Teaser visual, builds curiosity |
| BODY (standard) | 1 | Static explanation/demonstration |
| BODY (with motion/action) | **2** | Action detected in visual_direction |
| PEAK | **2 (always)** | Dramatic reveal/transformation |
| CTA / LOOP-END | 1 | Talking head with gesture |

### Decision Logic

Script generation adds per segment:

```typescript
{
  needs_end_frame: boolean,
  end_frame_description: string | null
}
```

**AI decides `needs_end_frame: true` when:**
- visual_direction contains transformation verbs (drive, walk, open, reveal, transform)
- Segment type is PEAK (always)
- Content type is transformation/before-after
- visual_direction describes motion from state A to state B

### Image Generation Flow

```
IF needs_end_frame:
  1. Generate start_image from visual_direction
  2. Generate end_image from end_frame_description
  3. Both images use same model, style, camera settings (consistency)
  4. Store both in image_generation_jobs (start_image_url, end_image_url)
ELSE:
  1. Generate start_image only (current behavior)
```

### Video Generation Flow Change

```typescript
// CURRENT: buildVideoFormData()
formData.append('ref_images', startImageUrl);

// NEW: buildVideoFormData()
formData.append('ref_images', startImageUrl);
if (endImageUrl) {
  formData.append('ref_images', endImageUrl);  // VEO uses as end frame
}
```

### UI Changes (ImageGeneration screen)

For segments with `needs_end_frame: true`:

```
┌──────────────────────────────────────────┐
│  PEAK - "The big reveal moment"          │
│                                          │
│  ┌──────────┐    →→→   ┌──────────┐    │
│  │ START    │           │ END      │    │
│  │ FRAME    │     →     │ FRAME    │    │
│  │          │           │          │    │
│  └──────────┘           └──────────┘    │
│                                          │
│  [Regen Start] [Regen End] [Regen Both]  │
└──────────────────────────────────────────┘
```

### Cost Impact

- ~30% of segments need end frame (PEAK always + some BODYs)
- Image generation cost increase: ~15-20%
- Video generation cost: unchanged

### Database Changes

```sql
-- Add to image_generation_jobs
ALTER TABLE image_generation_jobs
  ADD COLUMN end_frame_url text,
  ADD COLUMN end_frame_description text,
  ADD COLUMN is_end_frame boolean DEFAULT false;
```

### Files to Modify

- `supabase/functions/generate-script/index.ts` -- add needs_end_frame, end_frame_description
- `supabase/functions/generate-images/index.ts` -- generate 2 images when needed
- `supabase/functions/generate-videos/index.ts` -- send 2 ref_images to VEO
- `supabase/functions/_shared/config/aiModels.ts` -- update buildVideoFormData()
- `src/screens/ImageGeneration/ImageGeneration.tsx` -- dual frame UI

---

## 4. Negative Prompts & Post-Processing

### Centralized Quality Constants

```typescript
export const IMAGE_QUALITY = {
  NEGATIVE_PROMPT_STANDARD:
    "cartoon, cg, 3d, unreal, anime, cgi, render, artwork, illustration, "
    + "oversaturated, artificial, synthetic, plastic texture, plastic skin, "
    + "perfect skin, airbrushed, smooth skin, glossy, "
    + "low quality, blurry, pixelated, noisy, overexposed, "
    + "text, watermark, logo, signature, border, frame, "
    + "deformed, disfigured, bad anatomy, extra limbs",

  NEGATIVE_PROMPT_CREATOR:
    "cartoon, cg, 3d, anime, illustration, "
    + "plastic skin, airbrushed, uncanny valley, "
    + "deformed face, asymmetric eyes, extra fingers, "
    + "watermark, text, logo, border",

  NEGATIVE_PROMPT_BROLL:
    "cartoon, cg, 3d render, illustration, painting, "
    + "artificial, synthetic, oversaturated, "
    + "low quality, blurry, pixelated, "
    + "text, watermark, logo, people, faces, hands",

  ANTI_AI_SUFFIX:
    "Style: Professional photography, photorealistic. "
    + "NOT AI-generated looking. Natural imperfections, authentic textures.",

  QUALITY_BOOSTER:
    "8K resolution, high detail, sharp focus, "
    + "professional photography, photorealistic, "
    + "natural lighting, cinematic depth of field"
}
```

### Model-Specific Injection

| Model | Negative Prompt | Positive Suffix |
|-------|:---:|:---:|
| Seedream v4 | NOT supported | ANTI_AI_SUFFIX appended |
| Qwen Image | NEGATIVE_PROMPT used | QUALITY_BOOSTER prepended |
| Nano Banana Edit | NOT supported | ANTI_AI_SUFFIX appended |

### Optional Cinematic Post-Processing

Toggle: "Cinematic Mode" in settings (default OFF for speed).

When enabled:
1. Subtle film grain (sigma 3-5, Gaussian noise)
2. Color grade (warm shift for CREATOR, teal-orange for B-ROLL)
3. Slight vignette (edges darkened 10-15%)

Implementation: Client-side Canvas API (no server cost, no latency on generation).

### Files to Modify

- `supabase/functions/generate-images/index.ts` -- inject quality constants per model
- `supabase/functions/_shared/config/aiModels.ts` -- add IMAGE_QUALITY constants

---

## Complete File Change Summary

| File | Change Type |
|------|-------------|
| `supabase/functions/generate-script/index.ts` | **MODIFY** -- add subject detection, needs_end_frame, end_frame_description |
| `supabase/functions/generate-images/index.ts` | **MODIFY** -- prompt overhaul, auto-search integration, dual image generation, quality constants |
| `supabase/functions/generate-videos/index.ts` | **MODIFY** -- send 2 ref_images when end_frame exists |
| `supabase/functions/_shared/config/aiModels.ts` | **MODIFY** -- IMAGE_QUALITY constants, buildVideoFormData dual ref |
| `supabase/functions/_shared/lookups/cinematographyLookup.ts` | **MODIFY** -- camera/lens/film stock lookup tables |
| `supabase/functions/_shared/prompts/visualEnhancer.ts` | **MODIFY** -- enhanced cinematography specs |
| `src/screens/ImageGeneration/ImageGeneration.tsx` | **MODIFY** -- dual frame UI, reference image override |
| `supabase/migrations/YYYYMMDD_image_gen_enhancements.sql` | **NEW** -- subject_reference_cache table, image_generation_jobs columns |

---

## 5. Thumbnail Generation

### Overview

Generate clickbait thumbnail during image generation phase. Thumbnail = AI background image + bold text overlay (MrBeast style).

### Thumbnail Structure (2 Layers)

**Layer 1: Background Image (AI-generated)**
- Composite of key visual elements from video
- Creator face with expressive emotion (shocked/excited)
- Key subject/product visible
- Dramatic lighting, high contrast, vibrant colors
- Generated via fal.ai (same pipeline as other segment images)

**Layer 2: Clickbait Title Overlay (text rendering)**
- Bold, large text (Impact/Montserrat Black font)
- High contrast: yellow text + black stroke, or white + red
- 3-5 words MAX (readable at 120x68px mobile size)
- Positioned: top or center of image
- Optional: emoji, arrows, highlight circles

### Script Generation Output (NEW)

```typescript
{
  thumbnail: {
    background_prompt: "Split composition: left side shows [creator]
      with shocked expression pointing right. Right side shows
      [key subject]. High contrast, dramatic lighting,
      vibrant YouTube thumbnail style.",
    clickbait_title: "TESLA'S SECRET FEATURE",
    title_color: "#FFFF00",
    title_stroke: "#000000",
    title_position: "top-center",
    emoji: "🤯",
    has_arrow: true
  }
}
```

### Generation Flow

```
Script Generation
  │ outputs: thumbnail.background_prompt + clickbait_title
  ▼
Image Generation Phase
  │ Generate background (Nano Banana if creator face, Seedream v4 if no face)
  ▼
Text Overlay (server-side Sharp or client-side Canvas)
  │ Render bold title, stroke, shadow, emoji
  ▼
Store as thumbnail_url in generation_sessions
  ▼
UI: User can regenerate image, edit title text, or upload custom
```

### Thumbnail Composition Rules

1. Face with expression -- 70% of top thumbnails have expressive face
2. 3-5 words MAX -- readable at tiny mobile size
3. High contrast -- must stand out in feed
4. Subject visible -- key product/topic recognizable
5. No clutter -- 2-3 elements max, simple composition

### UI in ImageGeneration Screen

```
┌──────────────────────────────────────┐
│  THUMBNAIL                           │
│  ┌────────────────────────────┐      │
│  │  🤯 TESLA'S SECRET         │      │
│  │     FEATURE                │      │
│  │  [Creator] → [Subject]     │      │
│  └────────────────────────────┘      │
│                                      │
│  Title: [TESLA'S SECRET FEATURE ✏️]  │
│  [Regenerate] [Edit Title] [Upload]  │
└──────────────────────────────────────┘
```

### Database

```sql
-- Add to generation_sessions
ALTER TABLE generation_sessions
  ADD COLUMN thumbnail_url text,
  ADD COLUMN thumbnail_title text,
  ADD COLUMN thumbnail_config jsonb;
```

### Files to Modify

- `supabase/functions/generate-script/index.ts` -- add thumbnail spec to output
- `supabase/functions/generate-images/index.ts` -- generate thumbnail background image
- `src/screens/ImageGeneration/ImageGeneration.tsx` -- thumbnail preview + edit UI

---

## Complete File Change Summary (Updated)

| File | Change Type |
|------|-------------|
| `supabase/functions/generate-script/index.ts` | **MODIFY** -- add subject detection, needs_end_frame, end_frame_description, thumbnail spec |
| `supabase/functions/generate-images/index.ts` | **MODIFY** -- prompt overhaul, auto-search, dual images, quality constants, thumbnail generation |
| `supabase/functions/generate-videos/index.ts` | **MODIFY** -- send 2 ref_images when end_frame exists |
| `supabase/functions/_shared/config/aiModels.ts` | **MODIFY** -- IMAGE_QUALITY constants, buildVideoFormData dual ref |
| `supabase/functions/_shared/lookups/cinematographyLookup.ts` | **MODIFY** -- camera/lens/film stock lookup tables |
| `supabase/functions/_shared/prompts/visualEnhancer.ts` | **MODIFY** -- enhanced cinematography specs |
| `src/screens/ImageGeneration/ImageGeneration.tsx` | **MODIFY** -- dual frame UI, reference image override, thumbnail UI |
| `supabase/migrations/YYYYMMDD_image_gen_enhancements.sql` | **NEW** -- subject_reference_cache, image_generation_jobs columns, generation_sessions columns |

---

## Verification

1. **Prompt quality:** Generate 10 CREATOR images → visual check for natural skin, real photography feel
2. **Prompt quality:** Generate 10 B-ROLL images → check no "AI look" (plastic, oversaturated)
3. **Subject accuracy:** Generate "Tesla Model S" with auto-reference → verify correct car model
4. **Subject accuracy:** Generate "Eiffel Tower" with auto-reference → verify correct landmark
5. **Dual keyframe:** Generate PEAK segment with start + end frame → verify VEO creates smooth transition
6. **Dual keyframe:** Verify HOOK segments still work with single frame (backward compat)
7. **Negative prompts:** Compare Qwen Image output with/without negative prompts
8. **Auto-search cache:** Generate same subject twice → verify cache hit (no redundant API call)
9. **User override:** Upload custom reference → verify it replaces auto-searched image
10. **Cost check:** Compare image generation cost before/after (target: ≤20% increase)
11. **Thumbnail:** Generate thumbnail for 5 different topics → verify clickbait title readable, creator face visible
12. **Thumbnail title:** Verify 3-5 words, high contrast, MrBeast style
13. **Thumbnail edit:** Change title text in UI → verify re-render with new text
