> **For Claude:** REQUIRED SKILL: Use gaspol-execute to implement this plan.
> **CRITICAL:** This plan specifies real integrations. During execution,
> NEVER substitute placeholders for real data sources without explicit
> user approval. If a data source doesn't exist yet, STOP and ask.

# ImageStep Port — Implementation Plan

**Date:** 2026-02-22
**Branch:** feat/v3-chat-redesign
**Design:** `docs/plans/2026-02-22-imagestep-port-design.md`

## Goal

Port all functional code from the old `ImageGeneration.tsx` (3,099 lines, 10 sub-components) into the v3 Workspace's `ImageStep.tsx` (currently a 278-line stub). This restores the superior image generation UI within the Workspace 2-column layout, adds SmartCompanion support for the image step, and uses WorkspaceContext for state management instead of standalone `useState`.

## Architecture Context (from CLAUDE.md)

- **State:** `WorkspaceContext.tsx` — useReducer with 25+ actions, `isDirty` flag triggers auto-save
- **Persistence:** `useSessionPersistence` (5s debounce auto-save) + `saveNow()` for immediate
- **Session ID:** `orderId` from `useParams()` (NOT old `sessionId` from URL search params)
- **Settings:** `WorkspaceSettings` has `duration`, `aspectRatio`, `language`, `avatarUrl`, `characterDescription`
- **Image API:** `generate-images` edge function — modes: `create_jobs`, `process_single`, `regenerate_single`
- **Image DB:** `image_generation_jobs` table — `session_id`, `segment_number`, `status` (0-3), `image_url`
- **Sub-components:** All in `src/screens/ImageGeneration/components/` — 10 exports via `index.ts`
- **Types:** `src/screens/ImageGeneration/types.ts` — `Segment`, `SegmentImage`, `IMAGE_MODELS`, `JOB_STATUS`
- **Word limits:** `src/lib/wordLimits.ts` — `getWordLimitStatus()`, `getMaxWords()`
- **Segment duration:** `src/lib/segmentDuration.ts` — `calculateSegmentDuration()`, `getDurationExplanation()`
- **Design system:** Dark theme — `#0B0E14` base, `#161616` surface, `#10B981` emerald accent, `#262626` borders
- **SmartCompanion:** Currently gated to `isScriptStep` at `Workspace.tsx:678`
- **Workspace layout:** 2-column on xl: (center flex-1 + right 460px)

## Tech Stack

- React 18 + TypeScript + Tailwind (hardcoded dark classes)
- Supabase client (`src/lib/supabase.ts`) for edge function calls + DB queries
- Framer Motion for tab animations (200-300ms, no bounce)
- lucide-react for icons

## Data Integration Map

| Feature | Data Source | Hook/API | Exists? | Action |
|---------|-----------|----------|---------|--------|
| Segments | `WorkspaceContext.state.segments` | `useWorkspace()` | Yes | Use directly |
| Order ID | `useParams().orderId` | React Router | Yes | Use as session_id for DB |
| Language | `WorkspaceContext.state.settings.language` | `useWorkspace()` | Yes | Use directly |
| Aspect ratio | `WorkspaceContext.state.settings.aspectRatio` | `useWorkspace()` | Yes | Use directly |
| Duration | `WorkspaceContext.state.settings.duration` | `useWorkspace()` | Yes | Use directly |
| Avatar URL | `WorkspaceContext.state.settings.avatarUrl` | `useWorkspace()` | Yes | Use for CREATOR ref |
| Character desc | `WorkspaceContext.state.settings.characterDescription` | `useWorkspace()` | Yes | Use for CREATOR prompt |
| Segment image update | `dispatch SET_SEGMENT_IMAGE` | WorkspaceContext | Yes | Use existing action |
| Segment generating flag | `dispatch SET_SEGMENT_GENERATING_IMAGE` | WorkspaceContext | Yes | Use existing action |
| Segment image error | `dispatch SET_SEGMENT_IMAGE_ERROR` | WorkspaceContext | Yes | Use existing action |
| Segment layout | `dispatch SET_SEGMENT_LAYOUT` | WorkspaceContext | Yes | Use existing action |
| Toggle segment | `dispatch TOGGLE_SEGMENT` | WorkspaceContext | Yes | Use existing action |
| Edit script/VD | `dispatch EDIT_SEGMENT` | WorkspaceContext | Yes | Use existing action |
| Batch images update | `dispatch UPDATE_SEGMENT_IMAGES` | WorkspaceContext | **No** | Create new action |
| Segment options | `dispatch SET_SEGMENT_OPTIONS` | WorkspaceContext | **No** | Create new action |
| Batch segment update | `dispatch BATCH_UPDATE_SEGMENTS` | WorkspaceContext | **No** | Create new action |
| Image generation API | `generate-images` edge function | `supabase.functions.invoke` | Yes | Same API as old |
| Image jobs query | `image_generation_jobs` table | `supabase.from()` | Yes | Same queries |
| VD rewrite API | `rewrite-visual-direction` edge fn | `supabase.functions.invoke` | Yes | Same API |
| Script shorten API | `autoShorten` edge fn call | `supabase.functions.invoke` | Yes | Port from old |
| Save session | `useSessionPersistence.saveNow()` | Prop from Workspace | Yes | Pass down from Workspace |
| VisualPreviewGallery | `ImageGeneration/components/` | Direct import | Yes | Import directly |
| GenerateBRollModal | `ImageGeneration/components/` | Direct import | Yes | Import directly |
| LayoutPopover | `ImageGeneration/components/` | Direct import | Yes | Import directly |
| CreatorOptionsModal | `ImageGeneration/components/` | Direct import | Yes | Import directly |
| RegenerateModal | `ImageGeneration/components/` | Direct import | Yes | Import directly |
| ReferenceImageModal | `ImageGeneration/components/` | Direct import | Yes | Import directly |
| StockImageModal | `ImageGeneration/components/` | Direct import | Yes | Import directly |
| Word limit util | `src/lib/wordLimits.ts` | Direct import | Yes | Import directly |
| User auth | `useAuth()` | AuthContext | Yes | Use for user.id |
| Saved avatars | `user_avatars` table | `supabase.from()` | Yes | Query on mount |
| Generation progress | Local useState | N/A (UI-transient) | N/A | Create locally |
| View mode | localStorage `sparkfluence_view_mode` | Direct read/write | Yes | Same key |
| Image preview modal | Local useState | N/A (UI-transient) | N/A | Create locally |

---

## Phase 1: WorkspaceContext Extensions

**Estimated time:** 15 min

**Files:**
- Modify: `src/contexts/WorkspaceContext.tsx`

**Steps:**

1. Add missing optional fields to `WorkspaceSegment` interface:
   ```typescript
   // Add after existing fields (line ~82):
   creatorCostume?: string;
   creatorAppearance?: string;
   structuredVD?: { scene: string; camera: string; lighting: string; color: string; mood: string; fx: string };
   additionalNotes?: string;
   optionsApplied?: boolean;
   previousScript?: string;
   shortenedByAI?: boolean;
   jobId?: string;
   referenceImageSource?: 'unsplash' | 'pexels' | 'upload';
   ```

2. Add new dispatch action types to `WorkspaceAction` union:
   ```typescript
   | { type: 'UPDATE_SEGMENT_IMAGES'; segmentId: string; images: WorkspaceSegment['images']; selectedImageUrl?: string }
   | { type: 'SET_SEGMENT_OPTIONS'; segmentId: string; options: Partial<Pick<WorkspaceSegment, 'additionalNotes' | 'includeCreatorFace' | 'referenceImageUrl' | 'referenceImageSource' | 'optionsApplied' | 'layout'>> }
   | { type: 'BATCH_UPDATE_SEGMENTS'; updates: Array<{ segmentId: string; changes: Partial<WorkspaceSegment> }> }
   ```

3. Add reducer cases for the 3 new actions in `workspaceReducer`:
   - `UPDATE_SEGMENT_IMAGES`: Replace segment's images array + optionally update imageUrl, set isDirty
   - `SET_SEGMENT_OPTIONS`: Merge partial options into segment, set isDirty
   - `BATCH_UPDATE_SEGMENTS`: Apply multiple segment updates in one dispatch, set isDirty

4. Run `npx tsc --noEmit` to verify types compile

**Verification:**
- [ ] `tsc --noEmit` passes with zero new errors
- [ ] WorkspaceSegment has all fields needed by old ImageGeneration
- [ ] 3 new dispatch actions added with correct reducer handling
- [ ] All existing actions still work (no regressions)

---

## Phase 2: ImageStep Core UI — Header + View Modes

**Estimated time:** 30 min

**Files:**
- Rewrite: `src/screens/Workspace/steps/ImageStep.tsx`

**Steps:**

1. Delete the entire stub content of ImageStep.tsx (278 lines of mock data)

2. Create the new ImageStep component with imports:
   ```typescript
   import { useWorkspace } from '../../../contexts/WorkspaceContext';
   import { useAuth } from '../../../contexts/AuthContext';
   import { useParams } from 'react-router-dom';
   import { supabase } from '../../../lib/supabase';
   import { getWordLimitStatus, type LanguageCode } from '../../../lib/wordLimits';
   import {
     VisualPreviewGallery, GenerateBRollModal, type BRollOptions,
     LayoutPopover, LayoutIcon, parseVisualDirection, StructuredVDChips,
     CreatorOptionsModal, RegenerateModal, ReferenceImageModal,
   } from '../../ImageGeneration/components';
   import {
     type SegmentImage, type ImageModelSettings,
     JOB_STATUS, IMAGE_MODELS, SUPPORTED_DURATIONS, LAYOUT_OPTIONS,
   } from '../../ImageGeneration/types';
   ```

3. Set up component with local state:
   - `viewMode` (localStorage-persisted, default 'full')
   - `fullViewColumns` (localStorage-persisted, default 1)
   - `expandedSegmentId` (for compact view)
   - `imageModels` (ImageModelSettings)
   - `showModelDropdown` (boolean)
   - `previewImage` (string | null for fullscreen modal)
   - Modal states: `regenerateModal`, `optionsModal`, `referenceImageModal`

4. Read workspace state: `const { state, dispatch } = useWorkspace();`
   - Extract: `state.segments`, `state.settings`, `state.orderId`
   - Get `user` from `useAuth()`
   - Get `orderId` from `useParams()` (fallback to `state.orderId`)

5. Compute derived values:
   - `enabledSegments` = segments filtered by `isEnabled !== false`
   - `imagesGenerated` = count of segments with imageUrl
   - `allHaveImages` = all enabled segments have imageUrl
   - `totalDuration` = sum of durationSeconds

6. Build the **header bar** (sticky top): Title + image counter + view mode toggle + model dropdown + Generate All / Regenerate All button. Style with hardcoded dark theme classes (`bg-[#161616]`, `border-[#262626]`, etc.)

7. Build the **3 view mode renderers** (port directly from old ImageGeneration lines 2284-2963):
   - **Compact view** (lines 2284-2398): Collapsible rows with expand-to-full-card
   - **Grid view** (lines 2401-2535): 2-col grid with hover overlay showing VD + generate button
   - **Full view** (lines 2537-2963): 1/2 col with BODY grouping, full segment cards with:
     - Header (index, type badge, ON/OFF toggle, duration select, layout popover)
     - Script textarea (editable) + word count + AI shorten/split/merge buttons
     - VD chips (StructuredVDChips)
     - VisualPreviewGallery (right column)
     - Set Options button + applied options badges

8. Build the **image preview modal** (fullscreen, port from old lines 2988-3019)

9. Wire all segment operations to WorkspaceContext dispatch:
   - Script edit → `dispatch({ type: 'EDIT_SEGMENT', segmentId, field: 'script', value })`
   - Toggle → `dispatch({ type: 'TOGGLE_SEGMENT', segmentId })`
   - Duration → `dispatch({ type: 'ADJUST_DURATION', segmentId, durationSeconds })`
   - Layout → `dispatch({ type: 'SET_SEGMENT_LAYOUT', segmentId, layout })`
   - Options → `dispatch({ type: 'SET_SEGMENT_OPTIONS', segmentId, options })`

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] ImageStep renders all segments from WorkspaceContext (not mock data)
- [ ] 3 view modes work: full (1/2 col), compact (expand/collapse), grid (hover overlay)
- [ ] View mode persists in localStorage
- [ ] Script editing updates WorkspaceContext via dispatch
- [ ] Segment badges (type, shot type, emotion, transition) render correctly
- [ ] VD chips render via StructuredVDChips
- [ ] Word count shows correct status (green/amber/red)
- [ ] Image preview modal opens on click
- [ ] No placeholder/TODO comments in new code

---

## Phase 3: Image Generation Logic

**Estimated time:** 30 min

**Files:**
- Modify: `src/screens/Workspace/steps/ImageStep.tsx` (add generation handlers)

**Steps:**

1. Add generation-specific local state:
   - `isGeneratingAll`, `isBackgroundMode`, `generationProgress` ({current, total, completed, failed})
   - `showBackgroundToast`
   - `shorteningSegmentId`, `rewritingVDSegmentId`, `mergePickerSegmentId`
   - `processingIntervalRef` (useRef for polling interval)
   - `hasInitialSyncedRef` (useRef to prevent double-sync)
   - `savedAvatars` (array from user_avatars table)

2. Port `fetchSegmentImages()` (old lines 355-395):
   - Query `image_generation_jobs` table by orderId + user.id
   - Return `Map<number, SegmentImage[]>` grouped by segment_number
   - Use orderId (not old sessionId)

3. Port `syncImagesWithSegments()` (old lines 397-439):
   - Takes imageMap + current segments → returns updated segments
   - Auto-selects latest completed image if none selected
   - Uses `dispatch({ type: 'BATCH_UPDATE_SEGMENTS', updates })` instead of `setSegments`

4. Port initial sync useEffect (old lines 722-760):
   - Runs once after mount when segments are loaded
   - Fetches images from DB via `fetchSegmentImages(orderId)`
   - Updates segments via `BATCH_UPDATE_SEGMENTS` dispatch

5. Port `handleGenerateAllBackground()` (old lines 902-990):
   - Filter enabled segments without images
   - Call `generate-images` edge fn with mode `create_jobs`
   - Use `state.settings.avatarUrl` for creator reference (instead of old local state)
   - Use `state.settings.language` for content language
   - Update segments with jobIds via `BATCH_UPDATE_SEGMENTS`
   - Start background polling

6. Port `startBackgroundProcessing()` (old lines 762-900):
   - 3s polling interval calling `generate-images` with mode `process_single`
   - On job completion: fetch all images for segment, update via `UPDATE_SEGMENT_IMAGES`
   - On all_complete: stop polling, final sync
   - Use `orderId` instead of old `sessionId`

7. Port `handleRegenerateAll()` (old lines 992-1060):
   - Confirm dialog
   - Same flow as generateAll but for segments that already have images

8. Port `handleRegenerateWithNotes()` (old lines 1570-1695):
   - Query DB for max generation_number
   - Call `generate-images` with mode `regenerate_single`
   - Start background polling for result

9. Port `handleSelectImage()` (old lines 1479-1523):
   - Update DB: set is_selected for clicked image, false for others
   - Update segment via `UPDATE_SEGMENT_IMAGES` dispatch

10. Port `handleDeleteImage()` (old lines 1526-1568):
    - Confirm dialog
    - Delete from DB
    - Update segment via `UPDATE_SEGMENT_IMAGES` dispatch

11. Port `handleDownloadImage()` (old lines 1984-2016):
    - Fetch blob + create download link

12. Port `handleShortenScript()` (old lines 1107-1145):
    - Call `callLLM` via edge function for AI shortening
    - Update script via `EDIT_SEGMENT` dispatch
    - Store previousScript for undo

13. Port `rewriteVisualDirection()` (old lines 1710-1754):
    - Call `rewrite-visual-direction` edge function
    - Update VD + structuredVD via `EDIT_SEGMENT` dispatch

14. Port `handleApplyBRollOptions()` + `handleApplyCreatorOptions()` (old lines 1758-1801):
    - Update segment options via `SET_SEGMENT_OPTIONS` dispatch
    - Trigger VD rewrite in background

15. Wire all handlers to UI buttons from Phase 2

16. Wire background toast notification UI (port from old lines 2064-2104)

17. Load `savedAvatars` on mount from `user_avatars` table (for B-ROLL modal picker)

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] Generate All creates jobs and starts background polling
- [ ] Background processing updates segment images in real-time
- [ ] Progress toast shows correct counts
- [ ] Per-segment regeneration works with notes modal
- [ ] Image selection (gallery) updates DB + UI
- [ ] Image deletion removes from DB + UI
- [ ] AI script shortening works on over-limit segments
- [ ] VD rewrite triggers on layout change
- [ ] B-ROLL and CREATOR options modals save correctly
- [ ] Download image works
- [ ] All operations use orderId (not old sessionId)

---

## Phase 4: Modal Wiring + Sub-component Integration

**Estimated time:** 15 min

**Files:**
- Modify: `src/screens/Workspace/steps/ImageStep.tsx` (add modal JSX)

**Steps:**

1. Add modal JSX at bottom of ImageStep return (port from old lines 3020-3097):
   - `<RegenerateModal>` — for CREATOR shot regeneration with notes
   - `<ReferenceImageModal>` — for B-ROLL reference image picker
   - `<GenerateBRollModal>` — for B-ROLL options (as options picker, not generate)
   - `<CreatorOptionsModal>` — for CREATOR notes

2. Wire modal open/close handlers:
   - `setRegenerateModal({ isOpen: true, segment })` from VisualPreviewGallery onRegenerate
   - `setOptionsModal({ isOpen: true, segment })` from "Set Options" button
   - `setReferenceImageModal({ isOpen: true, segment })` (if needed separately)

3. Wire modal callbacks:
   - RegenerateModal → `handleRegenerateWithNotes`
   - GenerateBRollModal → `handleApplyBRollOptions`
   - CreatorOptionsModal → `handleApplyCreatorOptions`
   - ReferenceImageModal → `handleReferenceImageSelect`

4. Port `handleReferenceImageSelect()` (old lines 1697-1708):
   - Update segment referenceImageUrl via `SET_SEGMENT_OPTIONS`

5. Verify sub-components render with correct props:
   - VisualPreviewGallery receives: images, segmentId, isCreatorShot, isGenerating, etc.
   - LayoutPopover receives: value, onChange
   - StructuredVDChips receives: structuredVD object

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] All 4 modals open and close correctly
- [ ] RegenerateModal submits and triggers regeneration
- [ ] B-ROLL options modal saves notes + includeCreatorFace + reference images
- [ ] CREATOR options modal saves notes
- [ ] VisualPreviewGallery renders images, handles select/delete/regenerate
- [ ] LayoutPopover shows PNG previews and updates layout
- [ ] No console errors from prop type mismatches

---

## Phase 5: SmartCompanion Extension for Image Step

**Estimated time:** 25 min

**Files:**
- Create: `src/screens/Workspace/components/SmartCompanion/ImageCompanion.tsx`
- Modify: `src/screens/Workspace/Workspace.tsx` (extend SmartCompanion visibility)

**Steps:**

1. In `Workspace.tsx`, change the SmartCompanion gate from script-only to script+images:
   - Line 428: change `const isScriptStep = activeStep === 'script';` → `const showCompanion = activeStep === 'script' || activeStep === 'images';`
   - Line 678: change `{isScriptStep && (` → `{showCompanion && (`
   - Conditionally render: ScriptCompanion (SmartCompanion) for script step, ImageCompanion for images step

2. Create `ImageCompanion.tsx` with 2 tabs (Framer Motion animated, same pattern as SmartCompanion):
   - **Tab: Progress** — generation progress panel
   - **Tab: Preview** — focused segment preview

3. **Progress tab** content:
   - Overall progress bar: `{completed}/{total}` with emerald fill bar
   - Failed count (if > 0, red badge)
   - Per-segment status list: each row = segment number + type badge + status icon:
     - Pending (gray clock), Generating (emerald spinning loader), Completed (emerald checkmark), Failed (red X)
   - Image model info: current A-ROLL + B-ROLL model names
   - "Generate All" / "Stop" button (mirrors main area)

4. **Preview tab** content:
   - If a segment is focused (`focusedSegmentId`): show large 9:16 image preview
   - Below image: VD chips (StructuredVDChips)
   - Image gallery thumbnails (small strip for comparing variations)
   - Applied options badges (reference, notes, face, layout)
   - Quick action buttons: Regenerate, Set Options

5. Wire props from Workspace.tsx to ImageCompanion:
   - `segments`, `focusedSegmentId`, `onFocusSegment`
   - Generation state: passed from ImageStep → up to Workspace via callback or shared ref
   - **Approach:** ImageStep exposes generation state via a `useImperativeHandle` ref, or Workspace reads from context. Simplest: lift `generationProgress` + `isGeneratingAll` into a lightweight state that Workspace passes down.

6. **Simpler approach for progress sharing:** ImageStep accepts an `onProgressChange` callback prop from Workspace. ImageStep calls it whenever `generationProgress` or `isGeneratingAll` changes. Workspace stores it in local state and passes to ImageCompanion.

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] SmartCompanion panel visible on both Script and Images steps (xl: breakpoint)
- [ ] Script step still shows existing SmartCompanion (OverviewTab/IssuesTab/StyleTab)
- [ ] Images step shows ImageCompanion with Progress + Preview tabs
- [ ] Progress tab shows per-segment status indicators
- [ ] Preview tab shows focused segment's image (large preview)
- [ ] Tab switching animated with Framer Motion (150ms fade+slide)
- [ ] No regressions on Script step SmartCompanion

---

## Phase 6: Style Alignment + Polish

**Estimated time:** 15 min

**Files:**
- Possibly modify: Sub-components in `src/screens/ImageGeneration/components/` (minor class tweaks)
- Modify: `src/screens/Workspace/steps/ImageStep.tsx` (final polish)

**Steps:**

1. Audit all imported sub-components for CSS variable classes that need hardcoding:
   - `bg-card` → `bg-[#161616]`
   - `bg-surface` → `bg-[#1E1E1E]`
   - `bg-muted` → `bg-[#262626]`
   - `bg-page` → `bg-[#0B0E14]`
   - `text-text-primary` → `text-[#F5F5F5]` or `text-white`
   - `text-text-secondary` → `text-neutral-400`
   - `text-text-muted` → `text-neutral-500`
   - `border-border-default` → `border-[#262626]`
   - `bg-primary` → `bg-emerald-500`
   - `text-primary` → `text-emerald-500`
   - `shadow-theme` → `shadow-lg` or remove

   **Note:** Only change classes in sub-components if they visually clash. The CSS variables may already resolve correctly if the theme is set. Test first, only change what's broken.

2. Verify segment type badge colors match design system:
   - HOOK/PEAK: emerald
   - FORE/BODY: amber
   - CTA: blue
   - LOOP-END: neutral-600
   - CREATOR shot: pink
   - B-ROLL shot: blue

3. Test all 3 view modes visually:
   - Full view: 1-col and 2-col, BODY grouping renders correctly
   - Compact view: rows collapse/expand, expanded card shows full content
   - Grid view: hover overlay readable, VD chips visible, generate button works

4. Test background processing toast:
   - Appears when batch generation starts
   - Progress bar updates
   - Dismissible with X button
   - Disappears when all complete

5. Test fullscreen image preview:
   - Click image → fullscreen modal
   - Download button works
   - Close on backdrop click or X button

6. Ensure `saveNow()` is called after image operations that modify segment data:
   - After image generation completes → auto-save via isDirty
   - After applying options → auto-save via isDirty
   - After layout change → auto-save via isDirty
   (All these go through dispatch which sets isDirty → useSessionPersistence handles it)

7. Run `npm run build` to verify no build errors

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] All sub-components render with correct dark theme colors (no white/light flash)
- [ ] Segment type badges use correct color scheme
- [ ] All 3 view modes are visually polished
- [ ] Background toast renders correctly positioned (fixed top-center)
- [ ] Image preview modal is fullscreen with correct z-index
- [ ] Auto-save triggers after image operations (check browser network tab)
- [ ] No console errors or warnings

---

## Execution Notes

### Key Mapping: Old Segment → WorkspaceSegment

| Old Field | WorkspaceSegment Field | Notes |
|-----------|----------------------|-------|
| `id` (string number "1") | `id` | Same |
| `segmentId` | `segmentId` | Same |
| `type` ("HOOK", "BODY-1") | `segmentType` | **RENAMED** |
| `shotType` (string) | `shotType` ('CREATOR' \| 'B-ROLL') | Stricter type |
| `script` | `script` | Same |
| `visualDirection` | `visualDirection` | Same |
| `images` (SegmentImage[]) | `images` (simpler array) | WorkspaceSegment images missing some fields |
| `imageUrl` | `imageUrl` | Same |
| `layout` | `layout` | Same |
| `durationSeconds` | `durationSeconds` | Same |
| `isEnabled` | `isEnabled` | Same |

### Critical: orderId vs sessionId

The old ImageGeneration used `sessionId` from URL search params or localStorage. The new ImageStep MUST use `orderId` from `useParams()` or `state.orderId`. All DB queries (`image_generation_jobs`, `generate-images` edge fn) use this as `session_id`.

### Critical: Segment updates go through dispatch

The old code used `setSegments(prev => prev.map(...))`. The new code MUST use WorkspaceContext dispatch actions. For bulk updates (e.g., after background processing), use `BATCH_UPDATE_SEGMENTS`.

### Sub-component Prop Compatibility

The old sub-components (VisualPreviewGallery, etc.) expect the old `Segment` type. The new ImageStep works with `WorkspaceSegment`. When passing to sub-components, map the field names:
- `segment.type` in old = `segment.segmentType` in new
- Create a thin adapter: `const asOldSegment = (ws: WorkspaceSegment) => ({ ...ws, type: ws.segmentType })`

---

## Phase Dependencies

```
Phase 1 (Context) ─────┐
                        ├──→ Phase 2 (Core UI) ──→ Phase 3 (Gen Logic) ──→ Phase 4 (Modals)
                        │                                                        │
                        └──→ Phase 5 (SmartCompanion) ───────────────────────────┘
                                                                                 │
                                                                                 ▼
                                                                          Phase 6 (Polish)
```

- Phase 1 is prerequisite for everything
- Phase 2 + 5 can run in parallel (independent)
- Phase 3 depends on Phase 2 (needs UI to wire handlers)
- Phase 4 depends on Phase 3 (needs handlers for modal callbacks)
- Phase 6 depends on all others (final polish)
