# Carousel GenerateStep Enhancement Plan

**Date:** 2026-03-16
**Status:** Planning
**Scope:** SourceStep data persistence + GenerateStep UI overhaul + Edge function prompt enhancement

---

## Overview

Enhance the carousel image generation workflow to:
1. Pass validation data from SourceStep → GenerateStep via DB
2. Auto-show comparison grid (skip "Analyze Source" button)
3. Per-slide configuration modals (CREATOR vs B-ROLL)
4. Model selector (A-ROLL / B-ROLL)
5. Visual rules from carousel prompt plugin integrated into edge function

---

## Phase 1: SourceStep → DB Persistence

### What
Save validation results (slide_type, claim, needs_verification) to `carousel_slides` table when user clicks "Continue to Generate".

### Changes
- **SourceStep.tsx** — `handleProceed()`: Before navigating, insert/upsert `carousel_slides` rows with:
  - `slide_order` (from image index)
  - `slide_type` (from validation: hook/foreshadow/body/cta)
  - `source_image_url` (from source media URL)
  - `analysis_data` JSONB: `{ claim, claim_type, needs_verification, reason, confidence, evidence, source_url }`
- **Data flow:** localStorage validation → DB carousel_slides → GenerateStep reads from DB

### Slide Type Mapping
| Validation slide_type | carousel_slides.slide_type |
|---|---|
| hook | HOOK |
| foreshadow | FORE |
| body | BODY |
| cta | CTA |
| opinion | BODY (default) |
| unknown | BODY (default) |

---

## Phase 2: GenerateStep UI Overhaul

### 2A: Auto-Analyze on Mount
- On mount, check if `carousel_slides` exist for this project
- If slides exist with `slide_type` from Phase 1 → skip "Analyze Source", show grid directly
- Call `analyze-carousel-source` in background to **enrich** existing slides (visual details: colors, composition, mood) WITHOUT re-classifying slide_type
- Show loading state: "Enriching visual analysis..." while background enrichment runs

### 2B: Comparison Grid Layout
```
┌──────────────────────────────────────────────────┐
│ Header: Generate                                  │
│ [Model Selector ▾]  [AI Generate | Manual Upload] │
├──────────────────────────────────────────────────┤
│                                                    │
│  ┌─────────┐  →  ┌─────────┐   ⚙️ 🎬 ⏭️         │
│  │ Source 1 │     │ Result 1│   Configure │ Video │ Skip │
│  │ (HOOK)   │     │ or      │                      │
│  │          │     │ [Config] │                      │
│  └─────────┘     └─────────┘                      │
│                                                    │
│  ┌─────────┐  →  ┌─────────┐   ⚙️ 🎬 ⏭️         │
│  │ Source 2 │     │ Result 2│                      │
│  │ (FORE)   │     │         │                      │
│  └─────────┘     └─────────┘                      │
│                                                    │
│  ... (repeat for all slides)                       │
│                                                    │
│  [Generate All]  [Continue to Edit →]              │
└──────────────────────────────────────────────────┘
```

### 2C: Per-Slide Controls
Each slide row shows:
- **Type badge** (HOOK/FORE/BODY/CTA) with color
- **Configure button** (⚙️) → opens modal based on shot type
- **Video toggle** (🎬) → enable/disable for VideoStep
- **Skip toggle** (⏭️) → exclude from generation
- **Regenerate** button (after generation)
- **Manual upload** option (drag-drop replacement)

### 2D: CREATOR Modal (HOOK, FORESHADOW, CTA)
```
┌─────────────────────────────────────┐
│ Configure HOOK (CREATOR)        ✕   │
│ "Hook text from analysis..."        │
│                                     │
│ Catatan Tambahan (opsional)         │
│ ┌─────────────────────────────────┐ │
│ │ Environment outdoor cafe,       │ │
│ │ golden hour, pencahayaan...     │ │
│ └─────────────────────────────────┘ │
│                                     │
│  [Batal]  [Terapkan Opsi]           │
└─────────────────────────────────────┘
```

Fields:
- `additionalNotes` (textarea) — custom instructions for AI prompt
- Creator face auto-included (CREATOR shots always use Nano Banana with face ref)

### 2E: B-ROLL Modal (BODY)
```
┌──────────────────────────────────────────────────┐
│ Configure BODY (B-ROLL)                      ✕   │
│ "Body text from analysis..."                      │
│                                                    │
│ Catatan Tambahan          │ Reference Image        │
│ ┌───────────────────┐    │ 🔍 [modern office] [Cari]│
│ │ Pencahayaan lebih  │    │ ✨ modern office │ tech │
│ │ dramatis...        │    │ ┌──┐┌──┐┌──┐┌──┐┌──┐  │
│ └───────────────────┘    │ │  ││  ││  ││  ││  │  │
│                           │ └──┘└──┘└──┘└──┘└──┘  │
│ ☑ Sertakan Wajah Creator │                        │
│   Avatar Script Ini ▾     │ [Atau paste URL...]    │
│                           │                        │
│  [Batal]                  [Terapkan Opsi]          │
└──────────────────────────────────────────────────┘
```

Fields:
- `additionalNotes` (textarea)
- `referenceImageUrl` (from stock search or URL paste)
- `includeCreatorFace` (boolean toggle)
- Stock image search via `callStockImageSearch()` with AI auto-keyword from slide content

### 2F: Model Selector Dropdown
```
┌─────────────────────────────────┐
│ ✨ Models ▲                      │
├─────────────────────────────────┤
│ Image Model Selection            │
│                                  │
│ A-ROLL (HOOK, FORE, CTA)        │
│ ┌────────────────────────────┐  │
│ │ Auto (Nano Banana 2) — $0.08│  │
│ └────────────────────────────┘  │
│                                  │
│ B-ROLL (BODY)                    │
│ ┌────────────────────────────┐  │
│ │ Auto (Seedream v4) — $0.03 │  │
│ └────────────────────────────┘  │
│                                  │
│ Selected models apply to new gen │
└─────────────────────────────────┘
```

Options from CLAUDE.md `aiModels.ts`:
- A-ROLL: nano-banana-edit ($0.08) | qwen-image-2-pro-edit ($0.075) | seedream-v5-lite-edit ($0.035)
- B-ROLL: seedream-v4 ($0.03) | seedream-v4-5 ($0.04) | qwen-image ($0.035)

---

## Phase 3: analyze-carousel-source Enhancement

### What
Modify to accept pre-classified slide_type and only enrich visual details.

### Changes to Edge Function
- **Input** adds optional `slide_types: Record<number, string>` — pre-classified from validation
- If `slide_types` provided: use those, DON'T re-classify
- Focus LLM prompt on extracting:
  - `textContent` (all visible text)
  - `visualStyle` (dominantColors, mood, composition)
  - `subjectDetection` (hasCreator, hasProduct, description)
  - `layout` (full, split-left, split-right, etc.)
- Skip segment type classification rules from prompt

### Response Enhancement
- Add `hookCategory` field for HOOK slides (curiosity_gap, visual_shock, etc.)
- Add `foreshadowType` field for FORE slides (steps_tease, fear_urgency, etc.)
- Add `ctaType` field for CTA slides (polarize, question, identity_tag, engagement_reward)

---

## Phase 4: generate-carousel-images Prompt Enhancement

### What
Integrate visual rules from carousel prompt plugin into image generation prompts.

### Visual Rules Integration (from plugin)

#### HOOK Prompts
- Use 1 of 16 visual actions based on topic (auto-selected or user-configured)
- WOW 8/8 quality gate (lighting, depth, atmosphere, color, emotion, camera, texture, cinematic ref)
- Rembrandt/Split lighting 4:1, 3200K, CU 85mm f/1.8
- Creator expression matching hook category
- Pattern interrupt visual composition

#### FORESHADOW Prompts
- Visual continuity with HOOK (same wardrobe, connected scene)
- Pull-back from CU to MCU
- Butterfly/Loop lighting 3:1, 3500K
- FOMO expression (concerned urgency or teasing smirk)
- Lower intensity than HOOK (3/6 vs 6/6)

#### BODY Prompts
- Focus on content visualization
- Progressive lighting build (2→4/6 intensity)
- Reference image integration if provided
- Optional creator face (B-ROLL with creator = MCU with subject matter)

#### CTA Prompts
- 4 CTA types with specific compositions (Polarize, Question, Identity Tag, Engagement Reward)
- Butterfly lighting 2:1, 3500K (warmest)
- Direct eye contact, inviting expression
- Billboard-scale text treatment

### Prompt Building Pipeline
```
1. Read slide from DB (slide_type, analysis_data, source_image_url)
2. Read user config (additionalNotes, referenceImageUrl, includeCreatorFace)
3. Read branding kit (colors, fonts, watermark)
4. Select visual rules based on slide_type
5. Build cinematic prompt:
   - Subject description (from analysis)
   - Visual action (for HOOK, auto-selected from topic)
   - Lighting + camera specs (from slide type rules)
   - WOW elements (8 mandatory)
   - Branding integration
   - Additional notes from user
6. Call fal.ai with appropriate model:
   - CREATOR: nano-banana-edit with image_urls (face ref + source image)
   - B-ROLL: seedream-v4 (text-to-image, no ref)
```

---

## Implementation Order

| # | Task | Files | Depends On |
|---|------|-------|-----------|
| 1 | SourceStep: save validation to DB on Continue | `SourceStep.tsx` | — |
| 2 | GenerateStep: auto-show grid, basic comparison layout | `GenerateStep.tsx` | #1 |
| 3 | GenerateStep: CREATOR config modal | `GenerateStep.tsx` | #2 |
| 4 | GenerateStep: B-ROLL config modal with stock image search | `GenerateStep.tsx` | #2 |
| 5 | GenerateStep: Model selector dropdown | `GenerateStep.tsx` | #2 |
| 6 | GenerateStep: per-slide video/skip toggles | `GenerateStep.tsx` | #2 |
| 7 | analyze-carousel-source: accept pre-classified types, enrich only | `analyze-carousel-source/index.ts` | #1 |
| 8 | generate-carousel-images: visual rules prompt building | `generate-carousel-images/index.ts` | #7 |
| 9 | RAG knowledge integration (hook-science, prompt-formulas) | `_shared/knowledge/carousel/` | #8 |
| 10 | Testing & deploy | All edge functions | #7, #8 |

---

## Data Integration Map

| Component | Data Source | Existing? | Notes |
|-----------|-----------|-----------|-------|
| Validation results | localStorage → carousel_slides | Partial | Need to persist on Continue |
| Source images | carousel_source_urls | YES | Already loaded |
| Slide analysis | analyze-carousel-source edge fn | YES | Modify to enrich-only mode |
| Stock image search | callStockImageSearch() | YES | Reuse from apiKeyRotation |
| Image generation | generate-carousel-images edge fn | YES | Add visual rules + config |
| Creator face ref | voice_prompts table | YES | Profile avatar |
| Branding kit | useBrandingKit hook | YES | Already used |
| Model config | aiModels.ts | YES | IMAGE_MODELS.aRoll / bRoll |
| Visual rules | carousel/ knowledge files | YES (plugin) | Need to port to edge fn |

---

## Risk & Considerations

1. **Plugin knowledge files are .md** — Edge functions can't import .md. Need to convert relevant rules to .ts exports (like existing knowledge files pattern)
2. **16 visual actions for HOOK** — Complex prompt building. Start with top 5 most common, expand later.
3. **Stock image search rate limits** — Pexels 200 req/hr, Unsplash 50 req/hr. Already handled by pool rotation.
4. **Nano Banana face reference** — Needs creator avatar URL from voice_prompts or user upload. If no avatar uploaded, fallback to Seedream (no face).
5. **GenerateStep is currently 515 lines** — Will grow significantly. Consider splitting into sub-components (ComparisonGrid, CreatorModal, BRollModal, ModelSelector).

---

## Files to Create/Modify

### New Files
- `src/screens/CarouselImages/components/CreatorConfigModal.tsx`
- `src/screens/CarouselImages/components/BRollConfigModal.tsx`
- `src/screens/CarouselImages/components/ModelSelector.tsx`
- `supabase/functions/_shared/knowledge/carousel/hook-visual-rules.ts` (ported from plugin .md)
- `supabase/functions/_shared/knowledge/carousel/cta-visual-rules.ts` (ported from plugin .md)

### Modified Files
- `src/screens/CarouselImages/steps/SourceStep.tsx` — persist validation to DB
- `src/screens/CarouselImages/steps/GenerateStep.tsx` — full UI overhaul
- `supabase/functions/analyze-carousel-source/index.ts` — enrich-only mode
- `supabase/functions/generate-carousel-images/index.ts` — visual rules prompt
- `src/types/carousel.ts` — add config fields to CarouselSlide type
