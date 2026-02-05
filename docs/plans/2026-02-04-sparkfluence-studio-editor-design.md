# Sparkfluence Studio — CapCut-Like AI Video Editor

**Date:** 2026-02-04
**Revised:** 2026-02-05
**Status:** Implementation In Progress (Option A: Custom Build)
**Cost:** $0/month (Scenario A: team ≤ 3)

---

## Overview

Replace the current Video Generation + FullVideo steps with a single **Sparkfluence Studio** — a CapCut-like timeline editor where AI auto-composes the video and users can fine-tune every layer.

### Problem Statement

Current pipeline generates one flat image per segment, missing the visual richness that viral Indonesian creators achieve:
- Split-screen layouts (creator foreground + b-roll background)
- Sticker/asset overlays (topic-relevant icons popping up)
- Step indicators (1, 2, 3 badges for listicle content)
- Dynamic effects (money flying, confetti, alert pulses)
- Professional transitions between segments

### Solution

A hybrid AI + manual editor:
1. **AI auto-composes** all layers based on script analysis
2. **Users fine-tune** via a timeline editor (drag, resize, add/remove layers)
3. **Server-side rendering** via existing VPS (FFmpeg pipeline)

---

## Pipeline (Revised)

```
Step 1: SCRIPT              (unchanged — Gemini 2.0 Flash)
Step 2: IMAGE GENERATION    (enhanced — per-layer assets)
Step 3: TTS + MUSIC         (unchanged — Chatterbox + Minimax)
Step 4: VIDEO CLIPS         (unchanged — Kling 2.5 / Wan 2.5)
Step 5: SPARKFLUENCE STUDIO (NEW — replaces old Video Gen + FullVideo)
```

Video clips are generated BEFORE the editor opens. Users see real video on the timeline (WYSIWYG).

### Data Handoff (Step 4 → Step 5)

VideoGeneration passes data to Studio via `location.state` with `sessionStorage` fallback:

```typescript
interface PipelineInput {
  segments: PipelineSegment[];  // From VideoGeneration's Segment[]
  settings: { duration, aspectRatio, resolution, language };
  scriptId: string;
  title: string;
  ttsAudioUrls?: Record<string, string>;
  bgmUrl?: string;
}
```

Studio calls `buildProjectFromPipeline()` to convert this into a `SparkfluenceProject`.

---

## Editor UI Structure

```
┌─────────┬───────────────────────────┬───────────────────────────┐
│         │                           │                           │
│  ASSET  │     CANVAS PREVIEW        │    SEGMENT PROPERTIES     │
│  PANEL  │        (9:16)             │                           │
│  (208px)│                           │  Segment: BODY-1          │
│ [Media] │   ┌───────────────┐       │  Duration: 8s             │
│  └ All  │   │   B-ROLL bg   │       │  Layout: [Split 60/40]    │
│    segs │   │               │       │                           │
│    imgs │   │  ┌─────────┐ │       │  Layers:                  │
│    vids │   │  │CREATOR  │ │       │  ☑ Background (b-roll)    │
│         │   │  │  image   │ │       │  ☑ Creator (avatar)       │
│ [Sticker│   │  └─────────┘ │       │  ☑ Sticker: TAX icon      │
│  Library]│   │  ⚠️  📊     │       │  ☑ Effect: alert pulse    │
│         │   │ "PAJAK NAIK" │       │  ☑ Text: subtitle         │
│ [Effect │   └───────────────┘       │                           │
│  Library]│                           │  + Add Layer              │
│ [Text]  │   ◀ ⏸ ▶   00:16/00:45    │                           │
│ [Audio] │                           │  AI Suggestions:          │
│  (224px)│                           │  💡 Add split-screen      │
│         │                           │  💡 Add ⚠️ sticker       │
├─────────┴───────────────────────────┴───────────────────────────┤
│                                                                 │
│  TIMELINE — Full Video (208px height)                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ VIDEO  │ HOOK-5s │ FORE-8s │BODY1-8s│BODY2-8s│PEAK │ CTA  ││
│  │ STICKER│         │         │⚠️ TAX  │        │     │      ││
│  │ EFFECT │         │         │▓▓alert▓│        │💰fly│      ││
│  │ TEXT   │"Tau gak"│"Cerita" │"Pajak" │"Tips1" │"Peak"│"Fol"││
│  │ TTS    │ ♪♪♪♪♪♪  │ ♪♪♪♪♪♪  │ ♪♪♪♪♪  │ ♪♪♪♪♪  │♪♪♪♪♪│♪♪♪♪││
│  │ BGM    │─────────────────── BGM ────────────────────────────││
│  └─────────────────────────────────────────────────────────────┘│
│  Zoom: [−][100%][+]   ⟲ Undo  ⟳ Redo   00:16/00:45            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer Architecture

Every segment is composed of independent layers (bottom to top):

```
Layer 5: TEXT        → Subtitles, captions
Layer 4: EFFECTS     → CSS-based effects (Phase 4: Lottie particles)
Layer 3: STICKERS    → Topic assets (icons, badges, indicators)
Layer 2: CREATOR     → Creator footage/image (foreground)
Layer 1: BACKGROUND  → B-roll video/image (full screen or partial)
Layer 0: AUDIO       → TTS + BGM + SFX (separate tracks)
```

### Layout Templates Per Segment

| Layout | Description | Use Case |
|--------|-------------|----------|
| Full Screen | Single video/image fills 9:16 | B-roll only segments |
| Split 60/40 | Creator 60% bottom, b-roll 40% top | Creator + topic visual |
| Split 50/50 | Equal halves | Side-by-side comparison |
| PiP (Picture-in-Picture) | Small creator overlay on b-roll | Creator reacting to content |
| Creator Center | Creator centered, gradient/blur bg | Talking head segments |

AI auto-selects layout based on segment type and script content.

---

## AI Auto-Composition Logic

When the editor opens, AI analyzes the script and auto-populates all layers:

```
Script segment: "Tau gak lo, pajak kita naik 12%!"
  → segment_type: BODY
  → emotion: shock
  → keywords: ["pajak", "naik", "12%"]

AI Auto-Compose Result:
  Layout:     Split 60/40 (creator talking about a topic)
  Layer 1:    B-roll background (dark gradient or topic visual)
  Layer 2:    Creator video clip (bottom 60%)
  Layer 3:    📊 tax chart sticker → top-right, pop-in at 1.5s
  Layer 3:    ⚠️ warning sign → top-left, shake animation at 2.0s
  Layer 4:    Red alert pulse effect (shock emotion)
  Layer 5:    "PAJAK NAIK 12%" subtitle → bold white, bottom-center
```

### Auto-Composition Pipeline

1. `buildProjectFromPipeline()` — Convert pipeline segments to composition
2. `autoComposeAll()` — For each segment:
   a. `selectLayout()` — Based on segmentType + hasCreatorVideo
   b. `suggestStickersForText()` — Keyword → sticker lookup (top 1 match auto-added)
   c. `suggestEffects()` — Emotion + keywords → effect lookup (top 1 match auto-added)
3. Suggestions panel shows additional matches for user to apply manually

### Sticker Suggestion Rules

| Script Pattern | Sticker Suggestion |
|---------------|-------------------|
| Numbers/statistics ("naik 12%") | Chart/graph icon |
| Money/finance ("uang", "pajak") | Money bag, tax icon, dollar sign |
| Warning/danger ("bahaya", "hati-hati") | Warning triangle, alert icon |
| List/steps ("3 tips", "pertama") | Numbered badges (1, 2, 3) |
| Food ("makanan", "resep") | Food-related stickers |
| Tech ("iPhone", "laptop") | Device icons |
| Emotion (shock, excitement) | Emoji overlays, exclamation marks |

### Effect Suggestion Rules

| Emotion/Keyword | Effect |
|----------------|--------|
| shock | Red alert pulse, camera shake |
| excitement | Confetti, sparkles |
| money/wealth | Money flying, gold coins |
| fire/hot | Fire particles |
| sadness | Rain drops, blue tint |
| celebration | Confetti burst |
| danger | Red vignette pulse |

---

## Composition Data Model

Single JSON describes the entire project (used for preview and server render):

```typescript
// Full type definitions: src/types/studio.ts

interface SparkfluenceProject {
  id: string;
  userId: string;
  scriptId: string;
  title: string;
  resolution: { w: 1080, h: 1920 };  // 9:16
  fps: 30;
  totalDurationInFrames: number;

  segments: SegmentComposition[];
  audio: AudioMix;
  transitions: TransitionItem[];

  createdAt: string;
  updatedAt: string;
}

interface SegmentComposition {
  id: string;
  segmentType: 'HOOK' | 'FORE' | 'BODY' | 'PEAK' | 'CTA' | 'LOOP_END';
  startFrame: number;
  durationInFrames: number;
  layout: 'full' | 'split-60-40' | 'split-50-50' | 'pip' | 'creator-center';
  layers: LayerItem[];
  script: string;
  emotion: string;
  visualDirection: string;
}

interface LayerItem {
  id: string;
  type: 'video' | 'image' | 'lottie' | 'text' | 'effect';
  src: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  zIndex: number;
  opacity: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
  inFrame: number;      // relative to segment start
  outFrame: number;
  animation?: { enter, exit, enterDurationFrames, exitDurationFrames };
  text?: { content, fontFamily, fontSize, color, strokeColor, strokeWidth, align };
  lottie?: { animationData, loop, playbackRate };
  effect?: { preset, intensity, color };
}
```

---

## Rendering Pipeline

### Server-Only Approach (Revised from Hybrid)

**Why:** `@remotion/web-renderer` is experimental alpha, missing z-index support (fatal for multi-layer composition). All exports go through the existing VPS.

```
USER CLICKS "EXPORT"
        │
        ▼
  SEND composition.json TO VPS
        │
        ▼
  VPS (Python FastAPI + FFmpeg)
  ├── Parse composition.json
  ├── Download all media assets
  ├── Build FFmpeg filter_complex:
  │   ├── Layer compositing (z-order)
  │   ├── Text overlay (drawtext filter)
  │   ├── Sticker overlay (overlay filter)
  │   ├── Transitions (xfade filter)
  │   └── Audio mixing (amix/ducking)
  ├── Render to MP4
  └── Upload to Supabase Storage
        │
        ▼
  RETURN video_url TO CLIENT
```

### Preview (Browser-Only)
- `@remotion/player` provides real-time frame-accurate preview
- No rendering/export in browser — preview only
- Fallback: Static div-based layer preview (CSS positioned elements)

---

## State Management

### Architecture: React Context + useReducer

Consistent with existing codebase pattern (AuthContext, ThemeContext, etc.).

```
StudioContext
├── project: SparkfluenceProject  (the composition data)
├── selection: { segmentId, layerId }
├── playback: { isPlaying, currentFrame }
├── zoom: number
├── activePanel: 'media' | 'stickers' | 'effects' | 'text' | 'audio'
├── isDirty: boolean
│
├── dispatch()          → Reducer actions for all mutations
├── undo() / redo()     → History stack (max 50 entries)
└── pushHistory()       → Save current state before mutation
```

### Reducer Actions

| Action | Description |
|--------|-------------|
| SET_PROJECT | Initialize from pipeline or load saved |
| SELECT_SEGMENT / SELECT_LAYER | Selection changes |
| SET_PLAYING / SET_CURRENT_FRAME | Playback control |
| UPDATE_SEGMENT | Change segment properties |
| SET_SEGMENT_LAYOUT | Change layout template |
| ADD_LAYER / UPDATE_LAYER / REMOVE_LAYER | Layer CRUD |
| TOGGLE_LAYER_VISIBILITY / TOGGLE_LAYER_LOCK | Layer toggles |
| ADD_TRANSITION / UPDATE_TRANSITION / REMOVE_TRANSITION | Transition management |
| UPDATE_AUDIO_TRACK / ADD_AUDIO_TRACK / REMOVE_AUDIO_TRACK | Audio management |
| RESTORE_PROJECT | Undo/redo (replaces entire project) |

---

## Tech Stack

### Framework (all FREE for team ≤ 3)

| Component | Library | Cost | Purpose |
|-----------|---------|------|---------|
| Video engine | Remotion | FREE (≤3 team) | Frame-by-frame React video composition |
| Preview | @remotion/player | FREE | Real-time video preview in React |
| Timeline | Custom (React + Tailwind) | FREE | Segment-based multi-track timeline |
| Canvas | Custom (CSS positioned divs) | FREE | Layer positioning and preview |
| State | React Context + useReducer | FREE | Composition state + undo/redo |
| Text animation | CSS + Remotion interpolate | FREE | Text effects in preview |

**Removed from original plan:**
- ~~designcombo/react-video-editor~~ → Requires React 19 + Next.js, no license
- ~~Fabric.js~~ → Not used by designcombo; replaced by CSS positioning
- ~~@remotion/web-renderer~~ → Experimental, missing z-index support
- ~~GSAP~~ → Remotion's `interpolate()` + CSS suffice
- ~~wavesurfer.js~~ → Phase 5 (not needed for MVP)

### Phase 4+ Libraries (installed later)

| Component | Library | Purpose |
|-----------|---------|---------|
| Lottie stickers | @remotion/lottie | Animated sticker rendering |
| Captions | @remotion/captions | Word-by-word subtitles |
| Transitions | @remotion/transitions | GL shader transitions |

### Asset Sources (all FREE)

| Asset Type | Source | Cost | Library Size |
|-----------|--------|------|-------------|
| Animated stickers | LottieFiles (free tier) | FREE | 100K+ animations |
| GIF stickers | Tenor API (Google) | FREE | 300M+ |
| Static stickers | Flaticon (free tier) | FREE | 81K+ (attribution) |
| Stock images | Pixabay API | FREE | 1.9M+ |
| BGM (pre-made) | Pixabay Music | FREE | 1,000+ tracks |
| BGM (AI-generated) | Minimax Music v2 | Existing cost | Unlimited |
| Sound effects | Pixabay SFX | FREE | 110K+ |
| Transitions | GL Transitions | FREE | 60+ shaders |
| Fonts | Google Fonts | FREE | 1,500+ families |

### Rendering

| Method | Technology | Cost |
|--------|-----------|------|
| Server render | FFmpeg on existing VPS | FREE (already running) |
| Upgrade path | @remotion/renderer on VPS (Node.js) | FREE (add later) |

---

## Total Cost

```
NEW monthly cost:  $0/month  (Scenario A: team ≤ 3)

Existing costs (unchanged):
├── fal.ai (image/video/TTS/music generation)
├── Gemini API
├── Supabase
├── VPS (Python FastAPI + FFmpeg)
└── Domain + hosting
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Editor framework | Custom + Remotion Player | Stay on React 18, full control, no license issues |
| Canvas interaction | CSS positioned divs | Simpler than Fabric.js, works with Remotion |
| Asset sourcing | Pre-built free libraries | Faster, more reliable than AI-generated |
| Video gen timing | Before editor | WYSIWYG — users see real video clips |
| Rendering | Server-only (FFmpeg) | @remotion/web-renderer is experimental |
| Composition format | JSON (SparkfluenceProject) | Universal — same data for preview + server render |
| AI composition | Auto-suggest with override | AI does heavy lifting, users fine-tune |
| State management | React Context + useReducer | Consistent with existing codebase |
| Undo/redo | History stack (snapshot) | Simple, reliable (max 50 entries) |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| ← | Seek back 1 frame |
| → | Seek forward 1 frame |
| Shift+← | Seek back 1 second |
| Shift+→ | Seek forward 1 second |
| Home | Go to start |
| End | Go to end |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |
| Delete / Backspace | Remove selected layer |
| Ctrl+S | Save composition |

---

## Sticker Format Standards

| Format | Use | Specs |
|--------|-----|-------|
| Lottie JSON | Animated stickers, effects | Max 500KB, loop or one-shot |
| PNG | Static stickers | 512x512px, transparent background |
| WebP | Delivery optimization | Compressed from PNG/Lottie |

### Sticker Metadata Schema

```json
{
  "id": "sticker_tax_001",
  "name": "Tax Document",
  "category": "finance",
  "tags": ["tax", "pajak", "money", "document", "finance", "government"],
  "format": "lottie",
  "animated": true,
  "src": "/assets/stickers/finance/tax-document.json",
  "thumbnail": "/assets/stickers/finance/tax-document-thumb.webp",
  "dimensions": { "w": 512, "h": 512 }
}
```

### Sticker Categories

| Category | Examples | Keywords |
|----------|---------|----------|
| Finance | Money bag, tax icon, chart, wallet | uang, pajak, investasi, saham |
| Tech | Phone, laptop, code, chip | teknologi, AI, gadget, apps |
| Food | Dishes, ingredients, utensils | makanan, resep, masak |
| Health | Heart, medical, fitness | sehat, olahraga, diet |
| Education | Book, graduation, pen | belajar, sekolah, tips |
| Emoji | Expressions, reactions | shock, happy, sad, angry |
| Badges | Numbers (1-10), checkmarks, stars | pertama, kedua, tips, langkah |
| Effects | Sparkles, fire, arrows, frames | wow, penting, perhatian |
| Social | Like, share, subscribe, bell | subscribe, follow, like |

---

## Implementation Phases

### Phase 1: Editor Foundation ✅ COMPLETED
- [x] TypeScript type definitions (SparkfluenceProject, LayerItem, etc.)
- [x] Composition JSON utilities (factories, conversions, serialization)
- [x] Pipeline → Project conversion (buildProjectFromPipeline)
- [x] StudioContext with useReducer (all CRUD actions)
- [x] Undo/redo history stack
- [x] Remotion composition components (segment renderer, layer renderers)
- [x] Main Studio screen with 3-panel + timeline layout
- [x] Canvas preview (static div-based, Remotion Player ready)
- [x] Multi-track timeline (VIDEO, STICKER, EFFECT, TEXT, TTS, BGM)
- [x] Playback controls (play/pause, seek, frame stepping)
- [x] Keyboard shortcuts
- [x] Route added: /studio
- [x] Data handoff from VideoGeneration via location.state + sessionStorage

### Phase 2: Layer System ✅ COMPLETED
- [x] Layer CRUD (add, update, remove, reorder)
- [x] Layer visibility toggle and lock
- [x] Properties panel with position/size/opacity editors
- [x] Layout templates (full, split 60/40, split 50/50, PiP, creator center)
- [x] Text layer with stroke outline and color picker
- [x] Sticker layer from asset panel

### Phase 3: AI Auto-Composition ✅ COMPLETED
- [x] useAutoCompose hook
- [x] Keyword → sticker suggestion rules (stickerLibrary.ts)
- [x] Emotion → effect suggestion rules (effectLibrary.ts)
- [x] Auto layout selection per segment type
- [x] AI Suggestions panel in PropertiesPanel
- [x] "AI Auto-Compose All" one-click button
- [x] autoComposeAll() runs on first load

### Phase 4: Effects & Animation (NEXT)
- [ ] Install @remotion/lottie for animated stickers
- [ ] Install @remotion/captions for word-by-word subtitles
- [ ] Install @remotion/transitions for GL transitions
- [ ] Canvas-based particle effects (confetti, money, fire, etc.)
- [ ] Sticker entrance/exit animations (already CSS-based, upgrade to Remotion spring)
- [ ] TransitionPicker UI component

### Phase 5: Asset Library Integration
- [ ] Tenor API integration (GIF stickers via edge function proxy)
- [ ] LottieFiles API integration (animated stickers)
- [ ] Pixabay API integration (stock images, music, SFX)
- [ ] Search + category browsing in AssetPanel
- [ ] Favorites/recently used persistence
- [ ] Asset caching strategy

### Phase 6: Server Rendering
- [ ] New VPS endpoint: POST /api/render-composition
- [ ] Composition → FFmpeg filter_complex translation
- [ ] Layer compositing in FFmpeg (overlay, drawtext, xfade)
- [ ] Audio mixing (TTS + BGM ducking)
- [ ] Progress reporting via job-status endpoint
- [ ] Upload final video to Supabase Storage
- [ ] Alternative: Add Node.js + @remotion/renderer to VPS

### Phase 7: Database (when needed)
- [ ] Supabase table: `compositions` (id, user_id, script_id, title, composition_json, created_at, updated_at)
- [ ] RLS policies for compositions table
- [ ] Auto-save draft compositions
- [ ] Load/resume saved compositions

---

## Files Created

### New Files (Phase 1-3)

| File | Purpose | Lines |
|------|---------|-------|
| `src/types/studio.ts` | All TypeScript interfaces | ~210 |
| `src/lib/composition.ts` | JSON utilities, factories, conversions | ~240 |
| `src/lib/stickerLibrary.ts` | Sticker catalog + keyword search | ~180 |
| `src/lib/effectLibrary.ts` | Effect presets + emotion mapping | ~130 |
| `src/contexts/StudioContext.tsx` | State management + undo/redo | ~270 |
| `src/hooks/useAutoCompose.ts` | AI auto-composition logic | ~170 |
| `src/hooks/useStudioExport.ts` | Export + save composition | ~130 |
| `src/remotion/VideoComposition.tsx` | Main Remotion composition | ~60 |
| `src/remotion/layers/SegmentRenderer.tsx` | Segment → layers renderer | ~100 |
| `src/remotion/layers/VideoLayer.tsx` | Video layer component | ~30 |
| `src/remotion/layers/ImageLayer.tsx` | Image layer component | ~30 |
| `src/remotion/layers/TextLayer.tsx` | Text/subtitle renderer | ~50 |
| `src/remotion/layers/EffectLayer.tsx` | CSS effect renderer | ~25 |
| `src/components/studio/Timeline.tsx` | Multi-track timeline | ~200 |
| `src/components/studio/Canvas.tsx` | Preview canvas | ~190 |
| `src/components/studio/AssetPanel.tsx` | Asset browser (5 tabs) | ~270 |
| `src/components/studio/PropertiesPanel.tsx` | Layer inspector + AI suggestions | ~300 |
| `src/components/studio/PlaybackControls.tsx` | Keyboard shortcuts handler | ~70 |
| `src/screens/SparkfluenceStudio/SparkfluenceStudio.tsx` | Main editor screen | ~230 |

### Modified Files
| File | Change |
|------|--------|
| `src/index.tsx` | Added import + route `/studio` |

### npm Packages Required

```json
{
  "remotion": "4.0.248",
  "@remotion/player": "4.0.248",
  "@remotion/media-utils": "4.0.248"
}
```

**All packages must use the exact same version (no caret ^).**

### Vite Config
No changes needed. `@remotion/player` works with the standard `@vitejs/plugin-react`.

---

## Removed Files (Phase 7 — after Studio is stable)
- `src/screens/FullVideo/FullVideo.tsx` — Replaced by Studio
- `src/screens/FullVideoPreview/FullVideoPreview.tsx` — Replaced by Studio preview

---

## References

### Key Libraries
- Remotion: https://remotion.dev
- GL Transitions: https://gl-transitions.com
- LottieFiles: https://lottiefiles.com
- Tenor API: https://tenor.com/gifapi
- Pixabay API: https://pixabay.com/api/docs/
- Google Fonts: https://fonts.google.com

---

**Last Updated:** 2026-02-05
**Approved By:** Product Owner
**Approach:** Option A (Custom Build + Remotion, no designcombo)
**Total New Cost:** $0/month (Scenario A)
