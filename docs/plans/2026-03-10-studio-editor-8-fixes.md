> **For Claude:** REQUIRED SKILL: Use gaspol-execute to implement this plan.
> **CRITICAL:** This plan specifies real integrations. During execution,
> NEVER substitute placeholders for real data sources without explicit
> user approval. If a data source doesn't exist yet, STOP and ask.

## Goal

Fix 8 studio editor issues: independent entity management (delete/move per track item), media/audio import with Pixabay API, transition picker on video track, text bounding box auto-fit, and cross-segment text expansion. These fixes transform the studio from a rigid segment-based editor into a proper multi-track editor where each layer is independently controllable.

## Architecture Context

**From CLAUDE.md:**
- State: `src/contexts/StudioContext.tsx` — useReducer, 41 actions, undo/redo (50 max)
- Types: `src/types/studio.ts` — SparkfluenceProject, SegmentComposition, LayerItem, OverlayTrack, AudioMix
- Left panel: `src/components/studio/AssetPanel.tsx` — 5 tabs (Media, Audio, Text, Stickers, Effects)
- Timeline: `src/components/studio/Timeline.tsx` — multi-track (Video, T1, T2+, TTS, BGM)
- Player overlay: `src/components/studio/PlayerOverlay.tsx` — text bounding boxes + drag
- Trim: `src/hooks/useTrimInteraction.ts` — MIN_DURATION=30 frames, maxDurationInFrames constraint
- Clip: `src/components/studio/timeline/TimelineClip.tsx` — filmstrip, drag-to-move, trim handles
- Transitions: `src/components/studio/panels/TransitionPicker.tsx` — 6 types, 0.3-1.0s duration
- Entry: `src/screens/Workspace/steps/StudioEditor.tsx` — 3-panel layout, keyboard shortcuts
- Design: emerald (#10B981) + charcoal (#0B0E14), Tailwind, lucide-react icons

## Tech Stack

- React 18 + TypeScript + Tailwind CSS
- Existing StudioContext useReducer pattern (no new state libraries)
- Pixabay API (free, commercial-ready, no attribution needed)
- Supabase client for querying past videos (`video_generation_jobs` table)

---

## Data Integration Map

| Feature | Data Source | Hook/API | Exists? | Action |
|---------|-----------|----------|---------|--------|
| Project state | StudioContext | `useStudio()` | Yes | Use existing |
| Segment data | `SparkfluenceProject.segments[]` | via context | Yes | Use existing |
| Overlay tracks | `SparkfluenceProject.overlayTracks[]` | via context | Yes | Use existing |
| Audio tracks | `SparkfluenceProject.audio` (AudioMix) | via context | Yes | Use existing |
| Transition picker | `TransitionPicker` component | import | Yes | Wire to video track diamonds |
| Past generated videos | `video_generation_jobs` table | Supabase query | Yes (table) | Query status=2 for user |
| Past session data | `chat_sessions` table | Supabase query | Yes (table) | Query video_data JSONB |
| Pixabay Music/SFX | Pixabay Audio API | `https://pixabay.com/api/` | External | New: fetch + search |
| Trim interaction | `useTrimInteraction` hook | import | Yes | Modify max constraint |
| Text bounding box | `PlayerOverlay` | component | Yes | Modify sizing logic |
| Undo/redo | `pushHistory()` from context | `useStudio()` | Yes | Use existing |

---

## Phase 1: Independent Delete per Track Item (Issues 1 & 8)

**Estimated time:** 15 minutes

**Goal:** Delete on timeline removes ONLY that specific item (video/text/audio). Delete from Media panel removes everything. Each track entity is independent.

**Files:**
- Modify: `src/contexts/StudioContext.tsx`
- Modify: `src/components/studio/AssetPanel.tsx`
- Modify: `src/screens/Workspace/steps/StudioEditor.tsx`
- Modify: `src/components/studio/Timeline.tsx`

**Steps:**

1. **StudioContext — Add `REMOVE_VIDEO_FROM_TIMELINE` action:**
   - New action: removes ONLY the video layer (`type === 'video'` or `type === 'image'`) from a segment's layers array
   - Segment stays on timeline (structure preserved), but video/image layer removed
   - Existing `DELETE_SEGMENT` becomes "delete from Media" — removes segment entirely

2. **StudioContext — Ensure `REMOVE_LAYER` only removes the targeted layer:**
   - Current `REMOVE_LAYER` (line 194-209) already works per-layer — verify it doesn't cascade
   - This handles: delete text = only text gone, delete effect = only effect gone

3. **StudioContext — Ensure `REMOVE_AUDIO_TRACK` only removes specific audio:**
   - Current `REMOVE_AUDIO_TRACK` (line 316-326) already works per-track — verify independence

4. **Timeline — Add delete button per clip on right-click or selection:**
   - Video clip delete → dispatch `REMOVE_LAYER` for video/image layers in that segment
   - Text clip delete → dispatch `REMOVE_LAYER` for that text layer
   - Audio clip delete → dispatch `REMOVE_AUDIO_TRACK` for that audio item

5. **AssetPanel MediaPanel — Add delete button per segment:**
   - Click delete on media asset → dispatch `DELETE_SEGMENT` (removes everything)
   - Add confirmation: "Hapus media ini? Video di timeline juga akan dihapus."

6. **StudioEditor — Update Delete/Backspace keyboard shortcut:**
   - Currently (line 934-938): deletes entire segment
   - Change: delete the SELECTED item only (check `selection.layerId` first, fallback to segment)

**Verification:**
- [ ] Delete video clip from timeline → segment structure stays, video layer removed
- [ ] Delete text clip from timeline → only that text layer removed
- [ ] Delete audio from timeline → only that audio track removed
- [ ] Delete from Media panel → entire segment + all layers removed
- [ ] Delete/Backspace key → deletes selected layer, not entire segment
- [ ] Undo restores deleted items correctly
- [ ] tsc --noEmit passes

---

## Phase 2: Import Video Modal (Issue 2)

**Estimated time:** 20 minutes

**Goal:** Import button in Media panel opens modal showing past generated videos from all user sessions.

**Files:**
- Create: `src/components/studio/panels/ImportVideoModal.tsx`
- Modify: `src/components/studio/AssetPanel.tsx`
- Modify: `src/contexts/StudioContext.tsx` (if new action needed)

**Steps:**

1. **Create `ImportVideoModal.tsx`:**
   - Modal with backdrop (same pattern as ExportModal)
   - On mount: query `video_generation_jobs` table:
     ```sql
     SELECT id, segment_type, video_url, thumbnail_url, prompt, created_at, order_id
     FROM video_generation_jobs
     WHERE user_id = ? AND status = 2 AND video_url IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 50
     ```
   - Also query `chat_sessions` for session titles:
     ```sql
     SELECT order_id, topic FROM chat_sessions WHERE user_id = ?
     ```
   - Display grid: thumbnail + segment type + session title + date
   - Search/filter by session name
   - Select video → adds as new segment or overlay clip to project

2. **AssetPanel MediaPanel — Add Import button:**
   - Button at top: `📤 Import` — opens ImportVideoModal
   - Also allow importing local files (file input accept="video/*")

3. **StudioContext — Handle imported video:**
   - Use existing `ADD_SEGMENT` or `ADD_OVERLAY_CLIP` action
   - Build SegmentComposition from imported video URL + metadata
   - `pushHistory('Import video')` for undo support

**Verification:**
- [ ] Import button visible in Media panel
- [ ] Modal loads past videos from `video_generation_jobs` (real Supabase query)
- [ ] Videos grouped/labeled by session title
- [ ] Selecting video adds it to project timeline
- [ ] File upload (video/*) also works
- [ ] tsc --noEmit passes

---

## Phase 3: Independent Text Movement (Issue 3)

**Estimated time:** 10 minutes

**Goal:** Dragging one text layer moves ONLY that text, not all text layers.

**Files:**
- Modify: `src/contexts/StudioContext.tsx`
- Modify: `src/screens/Workspace/steps/StudioEditor.tsx`

**Steps:**

1. **StudioContext — Add `MOVE_TEXT_LAYER` action:**
   - New action: `{ type: 'MOVE_TEXT_LAYER', segmentId: string, layerId: string, position: {x, y} }`
   - Only updates position on the specific layer in the specific segment
   - Keep `MOVE_ALL_TEXT_LAYERS` available but don't use it for drag

2. **StudioEditor — Update `onLayerMove` handler (line 1177-1185):**
   - Change segment text path from `MOVE_ALL_TEXT_LAYERS` to `MOVE_TEXT_LAYER`
   - Keep overlay path (`UPDATE_OVERLAY_CLIP`) unchanged
   ```tsx
   onLayerMove={(segId, layerId, position) => {
     const isOverlay = (state.project.overlayTracks || []).some(t => t.id === segId);
     if (isOverlay) {
       dispatch({ type: 'UPDATE_OVERLAY_CLIP', trackId: segId, clipId: layerId, changes: { position } });
     } else {
       dispatch({ type: 'MOVE_TEXT_LAYER', segmentId: segId, layerId, position });
     }
   }}
   ```

**Verification:**
- [ ] Drag text A → only text A moves, text B stays in place
- [ ] Overlay text clips still move independently (existing behavior preserved)
- [ ] Undo restores text to original position
- [ ] tsc --noEmit passes

---

## Phase 4: Text Bounding Box Auto-Fit (Issue 4)

**Estimated time:** 10 minutes

**Goal:** The drag rectangle in PlayerOverlay wraps tightly around the actual rendered text, not a large fixed-height box.

**Files:**
- Modify: `src/components/studio/PlayerOverlay.tsx`

**Steps:**

1. **Add ref-based text measurement:**
   - For each visible text layer, render the text content in a hidden measurement div (or use the visible one)
   - Use `useRef` + `useEffect` to measure actual rendered height via `getBoundingClientRect()`
   - Store measured heights in a `Map<layerId, number>`

2. **Alternative (simpler): Calculate height from text content:**
   - Estimate height: `lineCount * fontSize * lineHeight` where lineCount = `Math.ceil(textLength / charsPerLine)`
   - `charsPerLine` estimated from `size.w / (fontSize * 0.6)` (approximate character width)
   - Add padding: 16px top/bottom
   - Use this as bounding box height instead of fixed `layer.size.h`

3. **Update bounding box rendering (line 175-223):**
   - Replace `previewH = layer.size.h * scaleY` with calculated auto-fit height
   - Keep width as-is (`layer.size.w * scaleX`)
   - Ensure corner handles sit at actual box edges

4. **Tighten label position:**
   - Move label from `-top-5` to `-top-4` (closer to box)

**Verification:**
- [ ] Bounding box height matches visible text content (no large gap)
- [ ] Short text (1 line) = small box, long text (4 lines) = taller box
- [ ] Corner handles at actual corners
- [ ] Drag still works correctly with new box dimensions
- [ ] tsc --noEmit passes

---

## Phase 5: Cross-Segment Text Expansion (Issue 5)

**Estimated time:** 10 minutes

**Goal:** Text clips can be trimmed/expanded left and right across segment boundaries, up to total project duration (CTA end).

**Files:**
- Modify: `src/components/studio/Timeline.tsx`
- Modify: `src/contexts/StudioContext.tsx`
- Modify: `src/hooks/useTrimInteraction.ts`

**Steps:**

1. **Timeline — Pass `totalProjectFrames` as maxDurationInFrames for text clips:**
   - Already partially done (line 247: `maxDurationInFrames: totalFrames`)
   - Verify this propagates to `TimelineClip` → `useTrimInteraction`

2. **StudioContext TRIM_SEGMENT — Allow text layers to extend beyond segment:**
   - Current logic (line 387-410) adjusts layer inFrame/outFrame within segment bounds
   - For text layers: allow `outFrame > seg.durationInFrames` (cross-segment rendering)
   - For video/image layers: keep existing segment boundary constraint

3. **useTrimInteraction — Use project total frames as max:**
   - When `maxDurationInFrames` is passed (from Timeline), use it as expansion limit
   - Left trim: `startFrame` can go to 0 (beginning of project)
   - Right trim: `startFrame + duration` can go to `totalProjectFrames` (end of CTA)

4. **Timeline text track `handleTextTrim` (line 597-612):**
   - Currently dispatches per-segment TRIM logic
   - Change: for text clips, directly update `inFrame`/`outFrame` on the layer
   - Allow negative `inFrame` (meaning text starts before segment) — or convert to absolute frame coordinates

5. **PlayerOverlay — Render cross-segment text:**
   - Already handles this via absolute frame check (line 62-75)
   - Verify: text with `outFrame > segDuration` still renders in next segment's timeframe

**Verification:**
- [ ] Text clip in BODY-1 can be dragged left into FORE territory
- [ ] Text clip can be dragged right across multiple segments
- [ ] Text clip cannot extend past CTA end (total project duration)
- [ ] Text clip cannot extend before frame 0
- [ ] Video clips still constrained to segment boundaries
- [ ] tsc --noEmit passes

---

## Phase 6: Transition Picker on Video Track (Issue 6)

**Estimated time:** 10 minutes

**Goal:** Clicking transition diamond on video track opens TransitionPicker popover to change transition type (not just fade on/off).

**Files:**
- Modify: `src/components/studio/Timeline.tsx`

**Steps:**

1. **Verify TransitionPicker is already wired (recent commit):**
   - Timeline.tsx line 790-810 already renders TransitionPicker in a popover
   - Diamond click toggles `activeTransitionPicker` state
   - `onSelect` dispatches `UPDATE_TRANSITION` or creates via `handleTransitionDrop`

2. **Debug why it's not working:**
   - Check if the popover `<div>` positioning is correct (`bottom: '100%'`, `marginBottom: 8`)
   - Check z-index: popover needs z-50 to appear above timeline clips
   - Check if `activeTransitionPicker` state resets properly on outside click

3. **Fix: Ensure TransitionPicker opens on diamond click:**
   - If diamond has no transition yet: create default fade THEN open picker
   - If diamond has transition: open picker directly with current type pre-selected
   - Picker `onSelect` → `UPDATE_TRANSITION` with new type + duration
   - Picker `onRemove` → `REMOVE_TRANSITION`
   - Picker `onClose` → `setActiveTransitionPicker(null)`

4. **Fix potential positioning issue:**
   - Diamond is inside a `relative` container
   - Popover absolute positioned above diamond
   - May need `portal` rendering or adjusting container overflow

**Verification:**
- [ ] Click diamond → TransitionPicker popover appears above it
- [ ] Can select all 6 transition types (fade, slide, wipe, flip, clock, iris)
- [ ] Duration slider works (0.3-1.0s)
- [ ] Remove button removes transition
- [ ] Clicking outside or Esc closes picker
- [ ] tsc --noEmit passes

---

## Phase 7: Audio Panel with Pixabay API + Import (Issue 7)

**Estimated time:** 25 minutes

**Goal:** Audio panel shows session audio, allows file import, and browse BGM/SFX from Pixabay.

**Files:**
- Create: `src/components/studio/panels/ImportAudioModal.tsx`
- Create: `src/lib/pixabayAudio.ts`
- Modify: `src/components/studio/AssetPanel.tsx`
- Modify: `src/contexts/StudioContext.tsx`
- Modify: `src/types/studio.ts`

**Steps:**

1. **Create `src/lib/pixabayAudio.ts` — Pixabay Audio API client:**
   - Pixabay API: `https://pixabay.com/api/`  (needs API key — store in `.env` as `VITE_PIXABAY_API_KEY`)
   - Note: Pixabay free API supports audio search
   - Functions:
     - `searchMusic(query, page?)` → results with preview URL, duration, title, artist
     - `searchSFX(query, page?)` → same format
   - Returns: `{ hits: { id, title, duration, audioUrl, previewUrl, user }[] }`

2. **Revamp AudioPanel in AssetPanel.tsx (lines 329-366):**
   - **Session Audio section:** List existing TTS/BGM/SFX from `project.audio`
   - **Import File button:** `<input type="file" accept="audio/*">` → upload to Supabase storage or use local blob URL
   - **Browse Music button:** Opens ImportAudioModal with Pixabay BGM search
   - **Browse SFX button:** Opens ImportAudioModal with Pixabay SFX search
   - Each audio item shows: title, duration, play preview button, "Add to timeline" button

3. **Create `ImportAudioModal.tsx`:**
   - Search input (debounced 500ms)
   - Tab toggle: Music | SFX
   - Results grid: title + duration + preview play + add button
   - Preview: `<audio>` element with play/pause
   - Add: dispatches `ADD_AUDIO_TRACK` with Pixabay URL as `src`

4. **StudioContext — Ensure ADD_AUDIO_TRACK works for new sources:**
   - Existing action (line 307-315) adds to `audio[trackType][]`
   - Verify it accepts external URLs (Pixabay CDN)
   - Track types: 'bgm' for music, 'sfx' for sound effects

5. **Audio type update if needed:**
   - `AudioTrackItem` (studio.ts line 144-154) already has: id, src, label, startFrame, durationInFrames, volume
   - May need to add: `source?: 'session' | 'import' | 'pixabay'` for display purposes

**Verification:**
- [ ] Audio panel shows existing TTS/BGM tracks from project
- [ ] Import File button allows mp3/wav upload
- [ ] Browse Music opens modal with Pixabay search
- [ ] Browse SFX opens modal with Pixabay search
- [ ] Preview playback works in modal
- [ ] Adding audio creates track on timeline
- [ ] tsc --noEmit passes

---

## Phase Summary

| Phase | Issue(s) | Est. Time | Dependencies |
|-------|----------|-----------|-------------|
| 1 | #1, #8 — Independent delete | 15 min | None |
| 2 | #2 — Import video modal | 20 min | None |
| 3 | #3 — Independent text move | 10 min | None |
| 4 | #4 — Text bounding box auto-fit | 10 min | None |
| 5 | #5 — Cross-segment text expansion | 10 min | None |
| 6 | #6 — Transition picker fix | 10 min | None |
| 7 | #7 — Audio panel + Pixabay | 25 min | None |

**All phases are independent — can be parallelized.**

---

## Execution Options

**Option 1: Execute sequentially** — `gaspol-execute` phase by phase with checkpoints.

**Option 2: Parallel execution** — All 7 phases are independent. Use `gaspol-parallel` to dispatch multiple agents.

**Option 3: Save for later** — Plan saved at `docs/plans/2026-03-10-studio-editor-8-fixes.md`.
