# ImageStep Port Design — v3 Workspace

**Date:** 2026-02-22
**Branch:** feat/v3-chat-redesign
**Status:** Brainstorm approved, pending implementation plan

## Goal

Port all functional code from the old `ImageGeneration.tsx` (3,099 lines) into the v3 Workspace's `ImageStep.tsx`. The current ImageStep is a 278-line stub with mock data. The old ImageGeneration has a superior, fully-featured UI.

## Approach

**Port old logic into ImageStep** — keep Workspace layout (2-column with SmartCompanion) but restore ALL features from old ImageGeneration. Reuse existing sub-components from `ImageGeneration/components/` directly (no duplication).

## Architecture

### Layout (2-column on xl:)

```
┌──────────────────────────────────────────────────────────────────┐
│ Top Bar: Order ID + Title + StepBar                              │
├──────────────────────────────────┬───────────────────────────────┤
│ CENTER — ImageStep               │ RIGHT — SmartCompanion (460px)│
│ ┌──────────────────────────────┐ │ ┌───────────────────────────┐ │
│ │ Header: title + counter +    │ │ │ Tab: Generation | Preview │ │
│ │ view mode + model + actions  │ │ │                           │ │
│ ├──────────────────────────────┤ │ │ Generation Progress:      │ │
│ │ Segment Cards (view modes):  │ │ │ - Batch progress bar      │ │
│ │ - Full (1/2 col)            │ │ │ - Per-segment status list  │ │
│ │ - Compact (rows)            │ │ │ - Model info              │ │
│ │ - Grid (2-col thumbnails)   │ │ │                           │ │
│ │                              │ │ │ Preview:                  │ │
│ │ Each card:                   │ │ │ - Focused segment preview │ │
│ │ - Segment header (type/dur)  │ │ │ - VD chips               │ │
│ │ - Script (editable + word ct)│ │ │ - Image gallery carousel  │ │
│ │ - VD chips                   │ │ │ - Options applied badges  │ │
│ │ - VisualPreviewGallery       │ │ │                           │ │
│ │ - Set Options button         │ │ └───────────────────────────┘ │
│ │ - Layout selector            │ │                               │
│ └──────────────────────────────┘ │                               │
├──────────────────────────────────┴───────────────────────────────┤
│ (No bottom nav - StepBar handles navigation)                     │
└──────────────────────────────────────────────────────────────────┘
```

### SmartCompanion Extension for Image Step

The SmartCompanion right panel gets an **ImageCompanion** mode when `activeStep === 'images'`:

1. **Generation Tab**: Batch progress (completed/total/failed), per-segment status indicators, background processing toggle
2. **Preview Tab**: Focused segment's image preview (large), VD chips, image gallery carousel for comparing variations, applied options badges

### State Management

| Old (ImageGeneration) | New (ImageStep in Workspace) |
|---|---|
| `useState` for segments | `WorkspaceContext dispatch` |
| `sessionId` from URL params | `orderId` from useParams |
| `characterDescription` local state | `state.settings.characterDescription` |
| `avatarUrl` local state | `state.settings.avatarUrl` |
| `videoSettings` local state | `state.settings` |
| `language` from LanguageContext | `state.settings.language` |
| `saveProgress()` to localStorage | `useSessionPersistence` auto-save |
| `saveDraftToDB()` manual | `useSessionPersistence` auto-save |

### Image generation state (local to ImageStep)

These remain as local `useState` in ImageStep because they're UI-transient:
- `isGeneratingAll`, `isBackgroundMode`, `generationProgress`
- `showBackgroundToast`
- `viewMode`, `expandedSegmentId`, `fullViewColumns`
- `previewImage` (fullscreen modal)
- Modal states: `regenerateModal`, `bRollModal`, `optionsModal`, `referenceImageModal`
- `imageModels` (A-ROLL/B-ROLL model selection)
- `shorteningSegmentId`, `rewritingVDSegmentId`, `mergePickerSegmentId`

### Sub-Components (REUSE from old)

All existing sub-components in `src/screens/ImageGeneration/components/` are imported directly:

```typescript
import {
  VisualPreviewGallery,
  GenerateBRollModal,
  LayoutPopover, LayoutIcon,
  parseVisualDirection, StructuredVDChips,
  CreatorOptionsModal,
  ImageGallery,
  StockImageModal,
  RegenerateModal,
  ReferenceImageModal,
} from '../../ImageGeneration/components';
```

These may need minor style tweaks (CSS variable classes → hardcoded dark theme) but structure stays identical.

### WorkspaceContext Additions Needed

New dispatch actions for image operations:
- `SET_SEGMENT_IMAGE` — update imageUrl + images array after generation
- `SET_SEGMENT_GENERATING` — toggle isGeneratingImage flag
- `SET_SEGMENT_IMAGE_ERROR` — set imageError
- `UPDATE_SEGMENT_IMAGES` — batch update images array (for gallery operations)
- `SET_SEGMENT_LAYOUT` — update layout field
- `SET_SEGMENT_OPTIONS` — update additionalNotes, includeCreatorFace, referenceImageUrl, optionsApplied

### Data Integration Map

| Component | Data Source | Existing? | Notes |
|-----------|-----------|-----------|-------|
| Segments list | `WorkspaceContext state.segments` | Yes | Has image fields |
| Session/Order ID | `useParams().orderId` | Yes | Used for DB ops |
| Video settings | `WorkspaceContext state.settings` | Yes | Duration, aspect, language |
| Character info | `state.settings.characterDescription/avatarUrl` | Yes | CREATOR shots |
| Image gen API | `generate-images` edge function | Yes | Same API |
| Image jobs DB | `image_generation_jobs` table | Yes | Same schema |
| Session save | `useSessionPersistence.saveNow()` | Yes | From Workspace |
| View mode persist | localStorage | Yes | Same keys |
| Sub-components | `ImageGeneration/components/` | Yes | Direct import |

### Features Ported

1. **3 view modes** (full/compact/grid) with localStorage persistence
2. **Full view** with 1/2 column toggle + BODY grouping
3. **Compact view** with expandable rows
4. **Grid view** with thumbnail hover overlays showing VD + generate button
5. **Batch generation** with background processing + progress toast
6. **Per-segment regeneration** with notes modal
7. **Multi-image gallery** (max 3 per segment) with select/delete
8. **Script editing** inline + AI shortening + split/merge
9. **Visual direction** structured chips display
10. **Layout selector** popover with PNG previews
11. **B-ROLL options** modal (notes, creator face, reference images)
12. **CREATOR options** modal (notes)
13. **Stock image** search (Pexels/Unsplash)
14. **Reference image** modal
15. **Image model** selection dropdown (A-ROLL/B-ROLL)
16. **Fullscreen image** preview modal
17. **Segment ON/OFF** toggle
18. **Word count** display with limit status
19. **VD rewrite** on layout change
20. **Download** individual images

### SmartCompanion for Image Step

New companion panel content for image step:

**Tab 1: Generation Progress**
- Overall progress bar (completed/total/failed)
- Per-segment status list with colored indicators
- Background processing toggle
- Model selection info

**Tab 2: Segment Preview**
- Large preview of focused/hovered segment's image
- Visual direction chips (structured)
- Image gallery carousel (compare variations)
- Applied options badges (ref image, notes, face, layout)
- Quick actions: Regenerate, Set Options, Change Layout

## Phase Plan (High-Level)

### Phase 1: Core Port (ImageStep rewrite)
- Replace stub with full implementation
- Wire up WorkspaceContext for segment data
- Port 3 view modes + all segment card UI
- Import and wire all sub-components
- Add new WorkspaceContext dispatch actions

### Phase 2: Image Generation Logic
- Port handleGenerateAllBackground
- Port startBackgroundProcessing (polling)
- Port handleRegenerateWithNotes
- Port handleSelectImage / handleDeleteImage
- Port handleBRollGenerate
- Wire up all modals (regenerate, b-roll, creator, reference, stock)

### Phase 3: SmartCompanion Extension
- Extend Workspace to show SmartCompanion on Image step
- Create ImageCompanion component (Generation + Preview tabs)
- Wire generation progress to companion panel
- Wire focused segment preview to companion

### Phase 4: Polish & Style Alignment
- Align sub-component styles (CSS vars → dark theme)
- Test all 3 view modes
- Test batch + single generation
- Test modal flows
- Ensure auto-save works via useSessionPersistence

## Design System Notes

All new UI follows Sparkfluence design system:
- Background: `#0B0E14` (base), `#161616` (surface), `#1E1E1E` (elevated)
- Accent: emerald-500 (#10B981)
- Borders: `#262626`
- Text: `#F5F5F5` (primary), `#A3A3A3` (secondary), `#737373` (muted)
- No purple, no AI slop
- Framer Motion for animations (200-300ms, no bounce)
