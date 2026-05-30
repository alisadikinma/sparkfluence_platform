# Carousel Image Feature — Complete Architecture Design

**Date:** 2026-03-11
**Status:** Approved
**Author:** Claude Code (gaspol-brainstorm)

---

## 1. Overview

New top-level menu "Carousel Image" in Sparkfluence. Full pipeline: import Instagram carousel posts → rebrand visuals with user's style → canvas editor → optional video conversion → multi-platform scheduling → analytics + ManyChat-style automation.

**Key decisions:**
- Top-level menu at `/carousel-images` with own session history
- IG Graph API (official) for image import — requires OAuth
- Visual-only AI generation (branding icon + watermark baked in-image)
- fabric.js canvas editor for text overlays (headline, pagination, subtitle)
- 2-mode: AI Text ON (full in-image) or OFF (editor layers)
- Analytics + Automation + Scheduling + Inbox = shared platform features (Dashboard tabs)
- Global Branding Kit at `/settings/branding`

---

## 2. Navigation & Routes

### Sidebar Structure
```
Dashboard (5 tabs: Overview | Analytics | Scheduling | Automation | Inbox)
Planner
Script Gen
Creator Lab
Ad Studio
Carousel Images  ← NEW
Gallery
```

### Route Structure
```
/carousel-images                           → CarouselHome (source library + new project)
/carousel-images/:projectId                → CarouselWorkspace
/carousel-images/:projectId/source         → Source slides view
/carousel-images/:projectId/generate       → Image generation + comparison grid
/carousel-images/:projectId/edit           → Canvas image editor (fabric.js)
/carousel-images/:projectId/video          → Video conversion (optional)
/carousel-images/:projectId/publish        → Caption generation + quick schedule

/dashboard                                 → Dashboard (Overview tab)
/dashboard/analytics                       → Analytics tab
/dashboard/scheduling                      → Scheduling tab (calendar)
/dashboard/automation                      → Automation flow builder
/dashboard/inbox                           → Conversation inbox (ManyChat-style)

/settings/branding                         → Branding Kit (global)
/settings/social-accounts                  → OAuth connection management
```

---

## 3. Workspace Flow (5 Steps)

```
[1. Source]  →  [2. Generate]  →  [3. Edit]  →  [4. Video]  →  [5. Publish]
  Import IG      Rebrand +         Canvas         VEO 3.1       Caption +
  URLs +         Compare Grid      Editor         (optional,    Quick Schedule
  Download       (2 columns)       (fabric.js)    HOOK+CTA)     + Send to Queue
```

### Step 1: Source
- Table management: paste URLs, bulk import CSV, manual upload
- IG Graph API: URL → oEmbed shortcode → Graph API media (full-res)
- Download ALL carousel slides, user can delete unwanted
- Storage: URL-only in DB (no file storage, fetch on-demand)
- Prerequisite: IG connected via /settings/social-accounts

### Step 2: Generate
- AI analyze source slides
- Keep same topic, rebrand visual style only
- Carousel plugin RAG knowledge → prompt generation (same approach as plugin)
- AI suggest slide count (5-10 based on topic complexity)
- Per-slide options: reference image, creator face, additional note
- 2-mode toggle: AI Text ON (5-paragraph prompt) / OFF (4-paragraph, visual only)
- Image models: nano-banana-2/edit (creator face) / seedream-v4/v4.5/v5 (body)
- Comparison grid: two columns scrollable (source left | regenerated right)
- Per-slide: regenerate, edit prompt, delete

### Step 3: Edit (Canvas Image Editor)
- Full-screen 3-panel layout (same pattern as Studio Editor)
- fabric.js ^6.x for canvas rendering
- Left: Slide navigator (vertical thumbnails)
- Center: Canvas viewport (4:5 ratio, zoom/pan)
- Right: Context-sensitive properties panel
- Auto-applied branding layers (editable): from Branding Kit
- Auto-generated text layers (editable): headline, subtitle, pagination, SWIPE CTA
- Toolbar: Select, Text, Shape, Crop, Filter, Undo/Redo
- Filters: 14 presets (Warm, Cool, Vintage, Dramatic, Moody, Vibrant, Cinematic, Matte, High Contrast, Desaturated, Sepia, Kodak Portra, Fuji Superia, CineStill 800T) + manual sliders
- Layers panel: z-order, visibility, lock
- Persistence: fabric.js JSON → carousel_slides.editor_state (JSONB), auto-save 3s debounce
- Export: "Save & Continue" → flatten all slides to PNG → proceed to Video step
- Keyboard shortcuts: V/T/S/C/F (tools), Ctrl+Z/Y, Del, Ctrl+D, Ctrl+S, ←→ (slides), Esc

### Step 4: Video (Optional)
- **Marked slides only** — HOOK + CTA auto-checked, user can toggle any slide
- Reuses existing `generate-videos` edge function (VEO 3.1 / Grok 3 via GeminiGen.AI)
- Same sequential queue + webhook + Realtime pattern
- **3 Motion Presets + Custom** per slide:
  - **Subtle Zoom** (default): slow cinematic zoom 1.0→1.15x, soft focus shift, text fade-in
  - **Dynamic Pan**: smooth horizontal pan, elements enter from edges, slight camera shake
  - **Parallax Layers**: background slower than foreground, text floats with depth, subtle particles
  - **Custom**: user writes own motion prompt
- **Per-slide duration selector**: 5s / 8s (default) / 10s. VEO always 8s, Grok maps: 5s→6s, 8s→10s
- **No post-processing** — raw video output only. User edits in Studio if caption/TTS/music needed.
- Cost: $0.015 per video (VEO Fast HD)

### Step 5: Publish
- Caption generation: 4 platforms (Instagram, TikTok, LinkedIn, Threads)
- Platform-specific (char limits, hashtag strategy, tone)
- Editable per platform
- Quick schedule: inline datetime picker per platform
- "Send to Queue" → pushes to scheduled_posts table
- Full scheduling management in Dashboard > Scheduling tab

---

## 4. Instagram Image Import (IG Graph API)

### Prerequisites
- User has IG Business/Creator account
- Connected via OAuth at /settings/social-accounts
- Meta App permissions: instagram_basic, instagram_manage_comments, instagram_manage_messages, instagram_content_publish, pages_show_list, business_management

### Import Flow
```
1. User paste IG URL(s) in Source Library
   e.g., https://instagram.com/p/DVq061ggYm_/?img_index=2

2. Parse URL → extract shortcode ('DVq061ggYm_')

3. oEmbed API → resolve shortcode to media_id
   GET graph.facebook.com/v18.0/instagram_oembed
   ?url={ig_url}&access_token={user_token}

4. Graph API → fetch all carousel children (full-res)
   GET /{media_id}?fields=media_type,media_url,
   children{media_url,media_type}&access_token={token}

5. Return all image URLs (up to 20 per carousel post)
   Store URLs in carousel_source_urls table
   Display as thumbnail grid in Source view

6. User can delete unwanted slides
```

### Fallback
- Not connected → "Connect Instagram" prompt → redirect /settings
- API fail → manual upload option (drag-drop images)

### Storage
- URL-only (no file storage). IG media URLs stored in DB.
- Re-fetch via API if URL expires.

---

## 5. Image Generation (Rebrand Engine)

### 2-Stage Architecture
```
Stage 1: ANALYZE (Gemini multimodal)                 Stage 2: GENERATE (fal.ai)
┌──────────────────────────────────┐                 ┌──────────────────────────────────┐
│ analyze-carousel-source          │                 │ generate-carousel-images         │
│                                  │                 │                                  │
│ Input:                           │                 │ Input:                           │
│ ├── Source images (URLs)         │ ─── analysis ──→│ ├── Analysis JSON per slide       │
│ ├── User branding kit            │     JSON        │ ├── User branding kit             │
│ └── AI text mode (ON/OFF)        │                 │ ├── RAG knowledge (carousel/*.ts) │
│                                  │                 │ ├── Reference image (if creator)  │
│ Gemini multimodal analyzes:      │                 │ └── Per-slide user notes          │
│ ├── Topic / core message         │                 │                                  │
│ ├── Text content per slide       │                 │ Builds prompt per slide:          │
│ ├── Layout structure             │                 │ ├── 5-paragraph (AI Text ON)      │
│ ├── Visual style (colors, mood)  │                 │ │   or 4-paragraph (AI Text OFF)  │
│ ├── Segment type (HOOK/BODY/CTA) │                 │ ├── + Branding baked in-image     │
│ └── Subject / product detection  │                 │ └── + Creator face ref (if A-ROLL) │
│                                  │                 │                                  │
│ Output: analysis JSON            │                 │ Calls fal.ai per slide:           │
│ (cached in carousel_slides.      │                 │ ├── nano-banana-2/edit (A-ROLL)   │
│  analysis_data JSONB)            │                 │ └── seedream-v4 (B-ROLL)          │
└──────────────────────────────────┘                 └──────────────────────────────────┘
```

**Why 2 stages?**
- Stage 1 is cheap (1 LLM call for all slides) — cache analysis for re-generation
- Stage 2 is expensive (1 fal.ai call per slide) — only re-run changed slides on regenerate
- Separation allows user to review/edit analysis before committing to image generation

### 3 Edge Functions (Split Architecture)
| Function | Purpose | Cost |
|----------|---------|------|
| `fetch-instagram-media` | URL → oEmbed → Graph API → image URLs + metadata | Free (API) |
| `analyze-carousel-source` | Gemini multimodal: all source images → analysis JSON (topic, text, layout, segment types, visual style) | ~$0.01 (1 LLM call) |
| `generate-carousel-images` | Analysis JSON + branding kit + RAG → fal.ai prompt per slide → generate | $0.03-0.08/slide |

### Generation Mode (Toggle)

User chooses how images are generated per project. Toggle at top of Generate step.

```
┌─────────────────────────────────────────────────────────────────┐
│  Generation Mode:  [🤖 AI Generate]  [✋ Manual Upload]         │
└─────────────────────────────────────────────────────────────────┘
```

#### Mode A: AI Generate (default)
Full automated pipeline — AI analyzes source → builds prompt → generates via fal.ai.
- Uses 2-stage architecture (analyze → generate) as described above
- Per-slide controls: regen, edit prompt, model select, reference image, creator face
- AI Text ON/OFF toggle available
- Cost: $0.03-0.08 per slide

#### Mode B: Manual Upload
AI builds the prompt only — user generates externally (Gemini, Midjourney, etc.), then uploads result back.
- Stage 1 runs normally: `analyze-carousel-source` → analysis JSON
- AI builds optimized prompts per slide (same RAG knowledge + branding context)
- **Prompts displayed as copyable text cards** — user copies prompt to external tool
- **Copy button** per prompt (clipboard) + **Copy All** (all prompts concatenated with slide separators)
- Each slide shows **Upload Zone** (drag-drop or click-to-browse) instead of AI-generated image
- Accepted formats: PNG, JPG, WebP (max 10MB per image)
- Upload → stored in Supabase Storage `carousel-images` bucket → URL saved to `carousel_slides.image_url`
- After upload, slide shows uploaded image in the comparison grid (same layout as AI mode)
- User can **re-upload** (replace) any slide at any time before Approve & Continue
- **No fal.ai cost** — only LLM cost for prompt generation (~$0.01 total)

```
┌─────────────────────────────────────────────────────────────────┐
│ Manual Mode — Slide 1 (HOOK)                                    │
│                                                                 │
│ ┌─ Prompt ──────────────────────────────────────────────┐       │
│ │ Cinematic close-up portrait, female creator mid-20s,  │ [📋]  │
│ │ direct eye contact, golden hour backlighting,         │       │
│ │ brand icon bottom-right 30% opacity...                │       │
│ └───────────────────────────────────────────────────────┘       │
│                                                                 │
│ ┌─ Upload ──────────────────────────────────────────────┐       │
│ │                                                       │       │
│ │     📁 Drop image here or click to browse             │       │
│ │         PNG, JPG, WebP — max 10MB                     │       │
│ │                                                       │       │
│ └───────────────────────────────────────────────────────┘       │
│                                                                 │
│ [HOOK ▾]  [☐ Video]  [🗑️]  [⋮⋮]                                │
└─────────────────────────────────────────────────────────┘
```

#### Mode Switching
- Switching from AI → Manual: keeps existing prompts, clears generated images (prompts stay for copy)
- Switching from Manual → AI: keeps uploaded images as reference, re-runs fal.ai generation
- `carousel_projects.generation_mode` column: `'ai'` | `'manual'` (default `'ai'`)

#### Hybrid Per-Slide Override
Even in AI mode, individual slides can be switched to manual upload:
- Per-slide dropdown: `[🤖 AI] [✋ Upload]` — overrides the global mode for that slide only
- Use case: AI generated 9/10 slides well, but 1 slide needs manual touch-up in Gemini
- `carousel_slides.generation_method` column: `'ai'` | `'manual'` (per-slide, follows project default unless overridden)

### AI Prompt Split (AI Generate mode)
```
AI (Nano Banana / Seedream) renders:
├── Visual scene (subject, lighting, composition, film stock)
├── Brand icon (from branding kit, baked in-image, 30% opacity)
└── @handle watermark (baked in-image, 30% opacity)

fabric.js Editor auto-generates (editable layers):
├── Headline text (power words, ALL CAPS, accent color from branding kit)
├── Subtitle text (secondary language, subtitle color from branding kit)
├── Page number "[N]/[TOTAL]" (top-left)
├── SWIPE CTA text (bottom-center, all except CTA slide)
└── + User can add: extra text, shapes, filters
```

### 2-Mode Toggle (AI Text — applies to both generation modes)
- **AI Text ON:** Full 5-paragraph prompt (text rendered in-image by AI/manual). Editor layers as backup/override.
- **AI Text OFF:** 4-paragraph prompt (visual + branding only). All text from editor layers.

### Image Models (AI Generate mode, same as Creator Lab)
- **Creator face (HOOK/Foreshadow/CTA):** nano-banana-2/edit ($0.08) — reference image for face consistency
- **B-Roll/Body (no creator face):** seedream-v4 ($0.03) / seedream-v4.5 ($0.04) / seedream-v5-lite ($0.035)
- **Fallback chain:** Same as Creator Lab (nano-banana → qwen-image-2/pro/edit → seedream-v5-lite/edit for A-ROLL; seedream-v4 → qwen-image → flux-schnell for B-ROLL)

### Comparison Grid (2-Row Stacked)
- **Top row:** Source images (from IG) — interactive (click to zoom, AI-extracted text overlay, link to original IG post)
- **Bottom row:** Result images (AI generated OR manually uploaded) — full editing controls
- **Alignment:** Source fills available columns, result extends. Extra result slides get "AI Added" emerald badge (AI mode) or "Manual" blue badge (manual mode). Empty source slots show dashed border + "No source" text.
- **Arrow indicators** from source to corresponding result slide
- **Manual mode:** Bottom row shows upload zones for slides without images, uploaded thumbnails for completed slides

#### Per-Slide Controls (Result Row)
| Control | Description |
|---------|-------------|
| **Segment Tag** | Dropdown: HOOK/FORE/BODY/PEAK/CTA. Auto-tagged by AI (via `analyze-carousel-source`), user can override. Retention border color matches tag. |
| **Generation Method** | Per-slide toggle: `[🤖 AI]` / `[✋ Upload]`. Follows project default unless overridden. |
| **Video Toggle** | Checkbox "Convert to Video". HOOK + CTA auto-checked by default. Any slide can be toggled. |
| **Regen / Re-upload** | AI mode: re-generate this slide. Manual mode: replace uploaded image. |
| **View Prompt** | Expand/collapse the AI-generated prompt for this slide (copyable in both modes). |
| **Delete** | Remove slide from set |
| **Drag Handle** | Reorder slides |
| **Zoom** | Click for fullscreen preview modal with prev/next navigation + prompt used |

#### Advanced Options (Collapsible per slide)
| Option | Description |
|--------|-------------|
| **Reference Image** | Upload/paste URL — used as style reference for AI generation (AI mode only) |
| **Creator Face** | Toggle ON/OFF — ON uses nano-banana-edit (A-ROLL), OFF uses seedream-v4 (B-ROLL). Uses profile photo as reference. (AI mode only) |
| **Additional Note** | Free-text — appended to AI prompt (e.g. "make bg darker", "add more contrast") |

#### Global Actions (Toolbar)
| Action | Description |
|--------|-------------|
| **Regenerate All** | AI mode: Re-run AI for all slides. Manual mode: disabled (grayed out). |
| **Copy All Prompts** | Copy all slide prompts to clipboard (useful for manual mode batch generation). |
| **Slide Count** | `[- N +]` control. Min 3 (HOOK + BODY + CTA), Max 10. AI adds/removes BODY slides. |
| **Approve & Continue** | Save all slides to `carousel_slides` DB → navigate to next step. **Blocked** if any slide has no image (AI or uploaded). |
| **Export ZIP** | Download all result images as ZIP (01-HOOK.png, 02-FORE.png, etc.) |

### RAG Knowledge (ported from carousel plugin)
All stored in `supabase/functions/_shared/knowledge/carousel/` as .ts exports:

| File | Source Plugin File | Content |
|------|-------------------|---------|
| `hook-science.ts` | `hook-science.md` | 5 hook categories, 100 hook bank, power words, scoring gate (3/5) |
| `visual-action-bank.ts` | `hook-visual-library.md` | 16 absurd actions, expressions, lighting, A/B/C rotation |
| `carousel-rebranding.ts` | `carousel-rebranding.md` | Brand stripping rules, subject brand preservation |
| `prompt-formulas.ts` | `prompt-formulas.md` | 5-paragraph structure, text rendering rules |
| `caption-copywriting.ts` | `caption-copywriting.md` | Platform-specific caption formulas |
| `cinematography-lut.ts` | `cinematography-lut.md` | Lighting patterns, lens specs, film stock |

### Slide Count
- AI-suggested based on topic complexity
- Simple topic → 5 slides
- Complex topic → 10 slides

### Aspect Ratio
- Default: 4:5 (1080×1350) — Instagram Feed standard

---

## 6. Canvas Image Editor (fabric.js)

### Layout
- Full-screen, 3-panel (same pattern as Studio Editor)
- Left: Slide navigator (vertical thumbnail strip)
- Center: Canvas viewport (4:5 ratio, zoom/pan/grid)
- Right: Context-sensitive properties panel

### Toolbar
| Tool | Key | Description |
|------|-----|-------------|
| Select | V | Move, resize, rotate objects |
| Text | T | Add/edit text layer |
| Shape | S | Rectangle, circle, line, arrow |
| Crop | C | Crop canvas area |
| Filter | F | Open filter panel |
| Undo | Ctrl+Z | Undo last action |
| Redo | Ctrl+Shift+Z | Redo |
| Save | Ctrl+S | Save draft |
| Duplicate | Ctrl+D | Duplicate selected |
| Delete | Del | Delete selected |
| Prev/Next | ←/→ | Navigate slides |
| Deselect | Esc | Deselect all |

### Properties Panel (context-sensitive)
- **No selection:** Slide info + canvas background
- **Text selected:** Font family, size, weight, color, alignment, line height, letter spacing, opacity
- **Shape selected:** Fill, stroke, corner radius, opacity
- **Image selected:** Opacity, filters, crop
- **Layers tab:** z-order list, visibility toggle, lock

### Filters
**14 Presets:**
Warm, Cool, Vintage, Dramatic, Moody, Vibrant, Cinematic, Matte, High Contrast, Desaturated, Sepia, Kodak Portra, Fuji Superia, CineStill 800T

**Manual sliders:**
Brightness, Contrast, Saturation, Hue, Blur, Sharpen, Vignette

### Auto-Applied Branding (from Branding Kit)
- Brand logo → fabric.js Image object (30% opacity, center, moveable)
- @handle watermark → fabric.js Text object (below logo, 30% opacity)
- Page number → fabric.js Text object (top-left, "[N]/[TOTAL]")
- SWIPE CTA → fabric.js Text object (bottom-center, all except CTA slide)

### Persistence
- fabric.js canvas → JSON serialization
- Saved to `carousel_slides.editor_state` (JSONB column)
- Auto-save draft: 3s debounce (same pattern as Studio)
- "Save & Continue" → flatten to PNG → upload to storage → proceed

### Tech Stack
- fabric.js ^6.x
- React wrapper component
- Sparkfluence design system (charcoal + emerald)

---

## 7. Branding Kit (`/settings/branding`)

### UX Flow: Guided Funnel
- **First visit:** Guided wizard — user picks discovery method → generate kit → Brand Kit Editor
- **Return visit:** Direct to Brand Kit Editor with "Re-generate" dropdown (AI Wizard / Templates / Import IG / Scan Competitors)

### 4 Discovery Methods

| Method | Phase | How It Works |
|--------|-------|--------------|
| **AI Brand Wizard** | Phase 1 | 4 steps (Niche → Audience → Vibe → Color) → AI generates 3 kit options (Safe/Bold/Contrast) |
| **Niche Templates** | Phase 1 | 12 niches × 2 variants (Light/Dark) = 24 pre-built kits in `src/lib/brandingTemplates.ts` |
| **Import from IG** | Phase 3 | Graph API fetch 12 recent posts → Gemini multimodal analyze visual style → generate kit |
| **Competitor Scan** | Phase 3 | User paste 2-3 IG post URLs → Graph API fetch → Gemini analyze → generate unique-but-inspired kit |

### AI Brand Wizard — 4 Steps

| Step | Question | Input Type |
|------|----------|------------|
| 1. Niche | "Bisnis kamu di bidang apa?" | 12 chip options (Food, Fashion, Tech, Fitness, Education, Finance, Travel, Beauty, Real Estate, Entertainment, Health, Lifestyle) + custom input |
| 2. Audience | Target age, gender, income | Chips: Gen Z/Millennial/Gen X/Boomer, All/Male/Female, Budget/Mid/Premium/Luxury |
| 3. Vibe | "Pilih 1-2 vibe" | 9 mood chips: Professional, Playful, Luxury, Bold/Edgy, Minimalist, Warm/Friendly, Futuristic, Vintage, Organic/Natural |
| 4. Color | "Warna favorit?" (optional) | 6 color family swatches + color picker + skip button |

→ `callLLM()` default (OpenRouter primary) generates **3 kit options** in strict JSON:
- **Safe** (industry standard)
- **Bold** (high contrast, daring)
- **Contrast** (unexpected twist)

Each option previewed as **CSS mock carousel slide** (instant, real-time, no AI cost).

### Niche Templates (24 total)

Stored in `src/lib/brandingTemplates.ts` as TypeScript constant (same pattern as `lookups/cinematographyLookup.ts`).

| Niche | Light Variant | Dark Variant |
|-------|--------------|-------------|
| Food & Bev | Warm Orange + Poppins | Dark + Amber + Poppins |
| Fashion | Monochrome + Playfair Display | Black + Gold + Playfair |
| Tech/SaaS | Blue Gradient + Inter | Dark Navy + Cyan + Inter |
| Fitness | Bold Red + Oswald | Black + Red + Oswald |
| Education | Green Navy + Nunito | Dark + Emerald + Nunito |
| Finance | Deep Blue + Roboto | Dark + Gold + Roboto |
| Travel | Teal Orange + Quicksand | Dark + Teal + Quicksand |
| Beauty | Rose Gold + Cormorant | Dark + Rose + Cormorant |
| Real Estate | Navy Gold + Lora | Dark + Gold + Lora |
| Entertainment | Neon + Space Grotesk | Black + Neon + Space Grotesk |
| Health | Soft Green + Open Sans | Dark + Green + Open Sans |
| Lifestyle | Warm Neutral + DM Sans | Dark + Warm + DM Sans |

### Brand Kit Editor Layout
- **2-Column:** Controls left (accordion: Identity / Color Palette / Typography / Watermark / Text Presets) + Live CSS Preview right (real-time updates)
- **Re-generate dropdown:** Re-opens any of the 4 discovery methods

### Kit Contents

**Core (flat columns):**
- `logo_url` — upload PNG/SVG
- `handle_text` — @username
- `font_family` — 1 of 20 curated Google Fonts
- `font_weight` — Bold / ExtraBold / Black

**5-Color Palette (JSONB `colors`):**
- `primary` — headlines (default #F5A623)
- `secondary` — background/cards (default #0F172A)
- `accent` — text/contrast (default #FFFFFF)
- `highlight` — CTAs/badges (default #F5A623)
- `muted` — subtitles (default #A3A3A3)

**Watermark Config (JSONB `watermark`):**
- `opacity` — 10-50% (default 30%)
- `position` — center / bottom-right / bottom-left / top-right
- `icon_size` — small / medium / large

**Text Style Presets (JSONB `text_presets`):**
- `headline` — { fontSize: 48, fontWeight: 900, color, shadow: true, strokeWidth, strokeColor }
- `subtitle` — { fontSize: 24, fontWeight: 600, color, shadow: false }
- `cta` — { fontSize: 28, fontWeight: 800, bgColor, textColor, borderRadius: 8 }
- `pagination` — { fontSize: 14, color, format: "[N]/[TOTAL]" }

### 20 Curated Google Fonts

**Sans-Serif:** Inter, Poppins, Montserrat, DM Sans, Nunito, Space Grotesk, Oswald, Open Sans, Roboto, Quicksand
**Serif:** Playfair Display, Lora, Cormorant, Merriweather
**Display:** Bebas Neue, Righteous, Anton, Archivo Black, Russo One, Teko

### Scope
- Global — applies to ALL Sparkfluence features (Carousel Images, Creator Lab, Ad Studio, etc.)
- **1 kit per account** (UNIQUE on user_id)

### Database: `user_branding_kit`
```sql
CREATE TABLE user_branding_kit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,

  -- Core (flat, queryable)
  kit_name TEXT DEFAULT 'My Brand',
  logo_url TEXT,
  handle_text TEXT,
  font_family TEXT DEFAULT 'Inter',
  font_weight TEXT DEFAULT '700',

  -- Color Palette (JSONB)
  colors JSONB DEFAULT '{
    "primary": "#F5A623",
    "secondary": "#0F172A",
    "accent": "#FFFFFF",
    "highlight": "#F5A623",
    "muted": "#A3A3A3"
  }'::jsonb NOT NULL,

  -- Watermark Config (JSONB)
  watermark JSONB DEFAULT '{
    "opacity": 30,
    "position": "center",
    "icon_size": "medium"
  }'::jsonb NOT NULL,

  -- Text Style Presets (JSONB)
  text_presets JSONB DEFAULT '{
    "headline": {"fontSize": 48, "fontWeight": 900, "color": "#FFFFFF", "shadow": true, "strokeWidth": 0, "strokeColor": "#000000"},
    "subtitle": {"fontSize": 24, "fontWeight": 600, "color": "#A3A3A3", "shadow": false},
    "cta": {"fontSize": 28, "fontWeight": 800, "bgColor": "#F5A623", "textColor": "#000000", "borderRadius": 8},
    "pagination": {"fontSize": 14, "color": "#A3A3A3", "format": "[N]/[TOTAL]"}
  }'::jsonb NOT NULL,

  -- Wizard metadata
  discovery_method TEXT,  -- 'ai_wizard' | 'template' | 'ig_import' | 'competitor_scan'
  wizard_inputs JSONB,    -- store niche/audience/vibe for re-generation

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger
CREATE TRIGGER trg_user_branding_kit_set_updated_at
  BEFORE UPDATE ON user_branding_kit
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

-- RLS
CREATE POLICY select_own_branding_kit ON user_branding_kit FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_branding_kit ON user_branding_kit FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_own_branding_kit ON user_branding_kit FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY delete_own_branding_kit ON user_branding_kit FOR DELETE USING (auth.uid() = user_id);
```

### Edge Function: `generate-brand-kit`
- Input: `{ niche, audience, vibe, color_preference }`
- Uses: `callLLM()` default (OpenRouter primary → Gemini fallback)
- Output: `{ kits: [Safe, Bold, Contrast] }` — each with colors, font, watermark, text_presets
- Temperature: 0.8 (more creative)

---

## 8. Dashboard Tabs (Shared Platform Features)

### Tab Structure
```
Dashboard
├── Overview      (existing dashboard content)
├── Analytics     (comprehensive 8-section analytics)
├── Scheduling    (calendar + post queue management)
├── Automation    (ManyChat flow builder)
└── Inbox         (conversation view per audience member)
```

All tabs are **platform-level** — apply to ALL content posted from Sparkfluence (Carousel, Creator Lab, Ad Studio, etc.).

---

## 9. Analytics Dashboard (Instagram Insights API)

### Data Source
- Instagram Insights API (requires Business/Creator account)
- Refresh: daily cron (VPS) + manual refresh button

### 8 Sections

#### 1. Overview Cards
- Total Reach (7d/30d)
- Avg Engagement Rate
- Best Performing HOOK (thumbnail + score)
- Best Converting CTA (thumbnail + conversion %)
- Total Posts / Active Experiments

#### 2. Per-Post Table
- Carousel thumbnail + title
- Impressions, Reach, Engagement Rate
- Likes, Comments, Shares, Saves
- Posted date, Platform, Source feature (Carousel/Creator Lab/etc.)
- Sortable + filterable

#### 3. Slide Type Breakdown
- Bar chart: avg engagement per slide type (HOOK vs FORE vs BODY vs CTA)
- Which HOOK visual action category performs best
- Which CTA type converts best

#### 4. Engagement Funnel
- Impressions → Likes → Comments → Shares → Saves
- Drop-off % between each stage
- Funnel comparison across projects

#### 5. Time Trends
- Line charts: daily/weekly engagement over time
- Best posting day/hour heatmap
- Follower growth trend per post

#### 6. A/B Experiment Mode
- Create experiment: same topic, 2 hook variants
- Post both → auto-track metrics
- Winner declaration (statistical significance indicator)
- Side-by-side comparison cards
- Experiment history

#### 7. Engagement Heatmap
- Which slide position (1-10) gets most engagement
- Swipe-through rate per position
- Drop-off point (where users stop swiping)

#### 8. Audience Demographics
- Age distribution (bar chart)
- Gender split (pie chart)
- Top locations (country/city)
- Active hours (when audience online)
- Follower growth timeline

### Charts Library
- **Tremor** (Tailwind-native dashboard components)

---

## 10. Scheduling & Publishing

### Platforms (Priority Order)

| Platform | API | Carousel Format |
|----------|-----|----------------|
| **Instagram** (P1) | Meta Graph API v21.0 | Native carousel (up to 10 items, image+video mix) |
| **TikTok** (P2) | TikTok Content Posting API | Photo Mode (up to 35 photos) |
| **LinkedIn** (P3) | LinkedIn Marketing API v2 | PDF document (server-side conversion via reportlab) |

### Multi-Account Support
- **1 Sparkfluence user → unlimited social accounts per platform**
- Settings page (`/settings/social-accounts`): connect/disconnect, status, token expiry, refresh
- Publish dialog: **multiselect account picker** — post to multiple accounts at once (e.g., 2 IG accounts + 1 TikTok)
- **Per-platform caption/hashtags** with tabs (IG / TikTok / LinkedIn). AI "Adapt" button auto-converts between platform styles.
- DB: `social_accounts` table (encrypted access_token, refresh_token, expires_at, platform_user_id)

### Scheduling UX (2 Entry Points)

**1. Quick Schedule (in workspace Publish step):**
- Platform checkboxes (multi-account picker)
- Post Now / Schedule (date + time + timezone)
- Caption editor with platform tabs
- Character count + hashtag count per platform

**2. Full Calendar (Dashboard > Scheduling tab):**
- Week/month view
- Post queue from ALL features (Carousel, Creator Lab, Ad Studio)
- Drag posts on calendar to reschedule
- Color-coded: gray (pending) → green (published) → red (failed)
- Click event to edit/cancel

### Post Worker (VPS Python Cron)
- `post_worker.py` — runs every 1 minute
- Query: `scheduled_posts WHERE scheduled_at <= NOW() AND status = 'pending'`
- Per post: decrypt access_token → upload media → create post → update status
- **LinkedIn PDF:** auto-convert carousel images to multi-page PDF via reportlab before upload
- Retry: 3x with exponential backoff
- Status: `pending → publishing → published | failed`

### Notifications (4 Channels)

| Channel | Method | Format |
|---------|--------|--------|
| **In-App** | Bell icon + Supabase Realtime | Success/fail per platform, clickable |
| **WhatsApp** | Fonnte API (existing token) | Message with post link + status |
| **Email** | Transactional email | Summary with post link |
| **Calendar** | Status color change | gray → green → red |

---

## 11. Automation (ManyChat Clone — IG Phase 1)

### Flow Canvas
- **Library:** Xyflow (React Flow v12+)
- Dark canvas, emerald connection lines
- Drag-drop node placement
- Zoom/pan/minimap
- Node snapping + alignment guides
- Auto-layout (dagre/elk)

### 7 Node Types

| Node | Color | Config |
|------|-------|--------|
| **Trigger** | Emerald | Comment keyword / DM keyword, match type (exact/contains) |
| **Message** | Blue | Text + image + buttons (max 3) + external link. Variables: {{username}}, {{keyword}}, {{comment_text}} |
| **Delay** | Gray | Wait X minutes/hours/days |
| **Condition** | Amber | If/else: variable check, keyword match, tag check |
| **Action** | Purple | Follow, add to list, notify owner |
| **Tag** | Teal | Add/remove labels for segmentation |
| **Randomizer** | Orange | A/B split (%, 2-4 paths) |

### Events (Meta Graph API Webhook)
- `ig_comment` → comment on post
- `ig_messaging` → DM received
- Webhook → Edge Function → match triggers → execute flow

### Flow Status
- Draft / Active / Paused / Archived

---

## 12. Inbox Tab (Dashboard)

### Features
- Per-user conversation thread view (ManyChat inbox-style)
- Full interaction history per audience member
- Manual reply option (alongside automation)
- Contact profile: username, tags, automation history
- Search/filter by tag, date, flow

---

## 13. Monitoring (Automation)

### Activity Log
- Chronological: timestamp, trigger event, flow name, action taken, status
- Filterable by flow/date/status

### Dashboard Counters (Real-time)
- Total triggered today
- Messages sent
- DMs sent
- Active conversations

---

## 14. Database Tables

### New Tables

| Table | Purpose |
|-------|---------|
| `user_branding_kit` | Global branding: logo, handle, colors, font, watermark (1 per user) |
| `carousel_projects` | Project metadata: user_id, topic, status, settings JSONB, ai_text_mode |
| `carousel_source_urls` | IG URLs + media_urls JSONB + scrape_status + source order |
| `carousel_slides` | Generated slides: project_id, slide_index, slide_type, prompt, image_url, editor_state JSONB, video_url, video_toggle |
| `social_accounts` | OAuth tokens: user_id, platform, platform_user_id, account_label, access_token (encrypted), refresh_token, expires_at, ig_page_id, is_default. **Multi-account:** 1 user can have multiple accounts per platform (e.g., 3 IG accounts). UNIQUE(user_id, platform, platform_user_id). `is_default` marks primary account per platform. |
| `scheduled_posts` | Post queue: user_id, content_type, content_id, platform, caption, scheduled_at, status, posted_at, post_id |
| `post_analytics` | Per-post metrics: post_id, platform, date, metrics JSONB (impressions, reach, likes, comments, shares, saves) |
| `ab_experiments` | Experiment tracking: name, variant_a_id, variant_b_id, winner_id, significance_score |
| `audience_insights` | Demographics: user_id, date, demographics JSONB (age, gender, location, active_hours) |
| `automation_flows` | Flow definitions: user_id, name, flow_json JSONB, status, trigger_type |
| `automation_contacts` | IG audience: ig_user_id, username, tags TEXT[], first_seen, last_interaction |
| `automation_conversations` | Chat history: contact_id, messages JSONB[], last_message_at |
| `automation_logs` | Execution log: flow_id, contact_id, event_type, action_type, status, timestamp |

---

## 15. Edge Functions

### New

| Function | Purpose | Phase |
|----------|---------|-------|
| `generate-brand-kit` | AI Wizard: 4 inputs → callLLM → 3 kit options (Safe/Bold/Contrast) | 1 |
| `fetch-instagram-media` | URL → oEmbed → Graph API → image URLs + metadata | 1 |
| `analyze-carousel-source` | Gemini multimodal: analyze source images → extract topic, text, layout, segment types | 1 |
| `generate-carousel-images` | RAG knowledge + branding kit + fal.ai generation per slide (nano-banana/seedream) | 1 |
| `generate-carousel-captions` | callLLM → per-platform captions (IG/TikTok/LinkedIn) with AI adapt | 2 |
| `social-oauth-callback` | Handle OAuth redirects (IG/TikTok/LinkedIn) → store tokens | 3 |
| `fetch-instagram-insights` | Pull analytics data from IG Insights API → post_analytics table | 4 |
| `instagram-webhook` | Receive comment/DM events → trigger automation flows | 6 |
| `execute-automation-flow` | Process triggers → walk flow graph → execute actions | 6 |

### Reused
- `generate-videos` (VEO 3.1 pipeline for video conversion)

---

## 16. Component Architecture

```
CarouselHome
├── SourceLibrary
│   ├── URLImportForm (paste/bulk)
│   ├── SourceTable (sortable, status badges, thumbnails)
│   └── ManualUploadDropzone
│
CarouselWorkspace (5 steps)
├── SourceStep (view/manage source slides)
├── GenerateStep
│   ├── GenerationSettings (model, creator face, ref images, notes, AI text mode toggle)
│   ├── ComparisonGrid (2-column scrollable)
│   └── SlideCard (prompt preview, regenerate, video toggle)
├── EditStep (CarouselImageEditor)
│   ├── SlideNavigator (vertical thumbnails)
│   ├── CanvasViewport (fabric.js, 4:5)
│   ├── Toolbar (Select/Text/Shape/Crop/Filter/Undo/Redo)
│   ├── PropertiesPanel (position/size/font/fill/opacity)
│   ├── LayersPanel (z-order/visibility/lock)
│   └── FilterPanel (14 presets + sliders)
├── VideoStep (reuse existing, filtered slides)
└── PublishStep
    ├── CaptionEditor (4 platform tabs)
    ├── QuickSchedulePicker (inline datetime per platform)
    └── PostPreview (mockup per platform)

Dashboard (5 tabs)
├── OverviewTab (existing)
├── AnalyticsTab
│   ├── OverviewCards
│   ├── PostTable (sortable/filterable)
│   ├── SlideTypeChart (Tremor BarChart)
│   ├── FunnelChart (Tremor)
│   ├── TimeTrends (Tremor LineChart)
│   ├── ABExperiments (comparison cards)
│   ├── EngagementHeatmap
│   └── AudienceDemographics
├── SchedulingTab
│   ├── CalendarView (week/month)
│   ├── PostQueue (list view)
│   └── StatusTracker
├── AutomationTab
│   ├── FlowCanvas (Xyflow)
│   ├── NodePalette (7 node types)
│   ├── FlowList (active/paused/draft)
│   └── ActivityLog
└── InboxTab
    ├── ConversationList
    ├── ChatThread
    └── ContactProfile

Settings
├── BrandingKit (/settings/branding)
└── SocialAccounts (/settings/social-accounts)
```

---

## 17. Design System

Follows existing Sparkfluence design system:
- Colors: warm charcoal (#0B0E14) + emerald (#10B981)
- Source slides: `border-l-4 border-blue-500` (original)
- Regenerated slides: `border-l-4 border-emerald-500` (new)
- Slide type badges: HOOK=emerald, FORE=amber, BODY=neutral, CTA=blue
- Flow builder: dark canvas, node cards `bg-neutral-900`, edges emerald
- Analytics: emerald (positive), red (negative), amber (neutral)
- Charts: Tremor (Tailwind-native)

---

## 18. Phasing

| Phase | Scope | Key Deliverables | Complexity |
|-------|-------|------------------|------------|
| **Phase 1** | Branding Kit + Source Library + Rebrand Engine + Comparison Grid | `user_branding_kit` table, `/settings/branding` page, `carousel_projects` + `carousel_source_urls` + `carousel_slides` tables, `fetch-instagram-media` + `analyze-carousel-source` + `generate-carousel-images` + `generate-brand-kit` edge functions, CarouselHome + CarouselWorkspace (Source + Generate steps), RAG knowledge files ported | Medium-High |
| **Phase 2** | Video Conversion + Caption Generation | VideoStep reuse, `generate-carousel-captions` edge fn, PublishStep with quick schedule, caption copywriting knowledge | Low |
| **Phase 3** | OAuth + Social Accounts + Scheduling | `social_accounts` table, Meta/TikTok/LinkedIn OAuth flows, `scheduled_posts` table, Dashboard Scheduling tab (calendar), VPS cron worker, `schedule-post-worker` edge fn | High |
| **Phase 4** | Analytics Dashboard | `post_analytics` + `ab_experiments` + `audience_insights` tables, `fetch-instagram-insights` edge fn, Dashboard Analytics tab (8 sections), Tremor charts, daily cron + manual refresh | Medium-High |
| **Phase 5** | Canvas Image Editor | fabric.js integration, CarouselImageEditor component (3-panel), auto-branding layers, 14 filter presets, editor_state persistence, "Save & Continue" export | High |
| **Phase 6** | ManyChat Automation + Inbox | `automation_flows` + `automation_contacts` + `automation_conversations` + `automation_logs` tables, Xyflow flow builder (7 nodes), Meta webhook integration, `instagram-webhook` + `execute-automation-flow` edge fns, Dashboard Automation + Inbox tabs | Very High |

---

## 19. Meta App Permissions Required

```
instagram_basic              — Read profile, media
instagram_manage_comments    — Read/reply comments (automation)
instagram_manage_messages    — Read/send DMs (automation)
instagram_content_publish    — Publish posts (scheduling)
pages_show_list              — Required by Meta for IG access
business_management          — Instagram Insights (analytics)
```

**Note:** Meta app review required. Timeline: 2-4 weeks for approval.

---

## 20. Third-Party Libraries (New)

| Library | Version | Purpose |
|---------|---------|---------|
| fabric | ^6.x | Canvas image editor |
| @xyflow/react | ^12.x | Automation flow builder |
| @tremor/react | ^3.x | Analytics dashboard charts |
| dagre | ^0.8.x | Auto-layout for flow builder |

---

**Last Updated:** 2026-03-12
