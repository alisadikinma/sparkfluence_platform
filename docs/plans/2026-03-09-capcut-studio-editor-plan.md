> **For Claude:** REQUIRED SKILL: Use gaspol-execute to implement this plan.
> **CRITICAL:** This plan specifies real integrations. During execution,
> NEVER substitute placeholders for real data sources without explicit
> user approval. If a data source doesn't exist yet, STOP and ask.

# CapCut-Style Studio Editor — Implementation Plan

## Goal

Replace the stub StudioStep (Workspace step 4) with a full-screen CapCut-style video editor. The editor supports video preview with Remotion Player, interactive timeline with drag-reorder/trim/split, transitions between segments, audio tracks (TTS + BGM + SFX) with waveform visualization, and one-click auto captions via Groq Whisper. This covers Phase 1 (Core Editor), Phase 2 (Audio), and Phase 3 (Text & Captions).

## Architecture Context

**From CLAUDE.md:**
- Workspace routes: `/script-gen/:orderId/studio`, `/creator-lab/:orderId/studio`, `/ad-studio/:orderId/studio`
- Currently StudioStep is a stub inside `<Workspace />` (center column)
- Full standalone editor exists at `SparkfluenceStudio.tsx` with 3-panel layout
- `StudioContext.tsx` has 25+ actions, undo/redo, selection, playback state
- `studio.ts` types: `SparkfluenceProject`, `SegmentComposition`, `LayerItem`, `AudioTrackItem`, `TransitionItem`
- Remotion pinned to `4.0.248` (React 18 compatible)
- Session data in `chat_sessions` table (JSONB columns: script_data, image_data, video_data)
- TTS via Chatterbox Turbo (fal.ai), BGM via Minimax Music v2, Transcription via Groq Whisper
- Design: warm charcoal (#0B0E14) + emerald (#10B981), NOT purple

**Existing files to REUSE (not rewrite from scratch):**
- `src/contexts/StudioContext.tsx` — extend with new actions
- `src/types/studio.ts` — extend with caption types
- `src/remotion/VideoComposition.tsx` — extend with caption layer
- `src/remotion/layers/SegmentRenderer.tsx` — already renders layers by type
- `src/remotion/layers/TextLayer.tsx` — reuse for captions
- `src/lib/composition.ts` — extend with caption/SFX factories
- `src/components/studio/Canvas.tsx` — enhance with Remotion Player
- `src/components/studio/PropertiesPanel.tsx` — extend with text/audio properties

**Existing files to REWRITE (too different from target):**
- `src/screens/Workspace/steps/StudioStep.tsx` → becomes full-screen editor entry
- `src/components/studio/Timeline.tsx` → needs drag-reorder, trim, split, multi-track
- `src/components/studio/AssetPanel.tsx` → restructure tabs for new asset types
- `src/screens/SparkfluenceStudio/SparkfluenceStudio.tsx` → merge into new StudioEditor

## Tech Stack

- React 18 + TypeScript + Vite + Tailwind (existing)
- Remotion 4.0.248: `@remotion/player` for preview (existing)
- `@dnd-kit/core` + `@dnd-kit/sortable`: drag-reorder on timeline (**NEW — needs install**)
- Web Audio API: waveform extraction (native browser API)
- Google Fonts API: font loading for text overlays (CDN, no package)
- Groq Whisper: transcription via `callGroqTranscribe()` (existing in apiKeyRotation.ts)
- Framer Motion: panel animations (existing)
- lucide-react: icons (existing)

## Data Integration Map

| Feature | Data Source | Hook/API | Exists? | Action |
|---------|-----------|----------|---------|--------|
| Segment videos | `chat_sessions.video_data` → segments[].videoUrl | `useSessionPersistence` | Yes | Read from DB by orderId |
| Segment images | `chat_sessions.image_data` → segments[].imageUrl | `useSessionPersistence` | Yes | Use as thumbnails |
| Segment scripts | `chat_sessions.script_data` → segments[].script | `useSessionPersistence` | Yes | Display in text overlays |
| Segment metadata | `chat_sessions.script_data` → type, duration, emotion | `useSessionPersistence` | Yes | Used for segment labels |
| TTS audio URLs | `chat_sessions.video_data` → segments[].ttsUrl | `useSessionPersistence` | **Check** | May need to add ttsUrl to video_data persistence |
| BGM audio URL | `chat_sessions.video_data` → bgmUrl | `useSessionPersistence` | **Check** | May need to add bgmUrl to video_data persistence |
| Studio project state | `chat_sessions.studio_data` (JSONB) | New: `useStudioPersistence` | **No** | Create — saves SparkfluenceProject to DB |
| Video preview | Remotion `@remotion/player` | `<Player>` component | Yes (pkg installed) | Wire to real SparkfluenceProject |
| Playback sync | StudioContext.playback.currentFrame | `useStudio()` | Yes | Sync Player ↔ Timeline bidirectionally |
| Drag-reorder | `@dnd-kit/sortable` | New | **No (pkg)** | Install `@dnd-kit/core` + `@dnd-kit/sortable` |
| Trim handles | Custom mouse handlers on timeline clips | New | No | Build from scratch |
| Split tool | Splits segment at playhead frame | StudioContext dispatch | No | Add SPLIT_SEGMENT action |
| Transitions | StudioContext.project.transitions[] | `useStudio()` | Yes (type) | Build UI + rendering |
| Waveform data | Web Audio API `decodeAudioData()` | New: `useWaveform(audioUrl)` | No | Create custom hook |
| SFX library | Supabase Storage `sfx-library/` bucket | `supabase.storage.from('sfx-library').list()` | **No (bucket)** | Create bucket + upload ~30 files |
| Caption generation | Groq Whisper via edge function | New: `generate-captions` edge fn | **No** | Create edge function |
| Caption rendering | Remotion TextLayer on caption track | `src/remotion/layers/TextLayer.tsx` | Yes (component) | Extend for word-by-word timing |
| Text overlays | StudioContext layers with type='text' | `useStudio()` | Yes (type) | Build Text panel UI |
| Font loading | Google Fonts CSS API | New: `useFontLoader(fontFamily)` | No | Create — loads `<link>` tags |
| Undo/Redo | StudioContext.pushHistory() | `useStudio()` | Yes | Wire to all new interactions |
| Export | VPS FFmpeg (existing pipeline) | `useStudioExport` | Yes (stub) | Complete implementation (Phase 4 scope) |

---

## Phase 1: Core Editor

### Phase 1A: Route Setup + StudioEditor Shell

**Estimated time:** 15 min

**Files:**
- Create: `src/screens/Workspace/steps/StudioEditor.tsx`
- Modify: `src/index.tsx` (add dedicated studio routes BEFORE Workspace catch-all)
- Modify: `src/screens/Workspace/Workspace.tsx` (navigate to full-screen on studio step)

**Steps:**
1. Create `StudioEditor.tsx` — full-viewport container (no Workspace wrapper)
   - 3-region layout: TopBar, MainEditor (left + center + right panels), TimelinePanel
   - TopBar: Back button (`navigate(-1)`), project title, Undo/Redo, Export button
   - Wrap with `<StudioProvider>`
   - Accept `orderId` from URL params via `useParams()`
2. Add routes in `index.tsx`:
   ```
   /script-gen/:orderId/studio → <StudioEditor />
   /creator-lab/:orderId/studio → <StudioEditor />
   /ad-studio/:orderId/studio → <StudioEditor />
   ```
   Place BEFORE the `/:orderId/:step` Workspace routes so they match first.
3. In `Workspace.tsx`, when user clicks "Studio" step, navigate to `/${sessionType}/${orderId}/studio` (which now hits StudioEditor, not Workspace)

**Verification:**
- [ ] Clicking "Studio" step in Workspace navigates to full-screen StudioEditor
- [ ] Back button returns to Workspace (video step)
- [ ] StudioEditor renders 3-panel layout skeleton (empty panels)
- [ ] URL shows `/:orderId/studio`
- [ ] `tsc --noEmit` passes

### Phase 1B: Data Loading from DB

**Estimated time:** 20 min

**Files:**
- Create: `src/hooks/useStudioLoader.ts`
- Modify: `src/screens/Workspace/steps/StudioEditor.tsx`
- Modify: `src/types/studio.ts` (add `CaptionChunk`, `CaptionTrack` types)
- Modify: `src/lib/composition.ts` (add `buildProjectFromSession()`)

**Steps:**
1. Create `useStudioLoader(orderId)` hook:
   - Fetches `chat_sessions` row by `order_id`
   - Extracts: script_data, image_data, video_data, studio_data, settings
   - If `studio_data` exists → restore `SparkfluenceProject` directly (returning user)
   - If `studio_data` is null → call `buildProjectFromSession()` to create initial project from script/image/video data
   - Returns: `{ project, isLoading, error }`
2. Add `buildProjectFromSession(session)` to `composition.ts`:
   - Maps each segment → `SegmentComposition` with:
     - Video layer (src = videoUrl, full-frame)
     - Image layer as fallback (src = imageUrl)
     - Duration from script_data segment durationSeconds
   - Creates AudioMix with TTS tracks (from ttsUrl per segment) and BGM track
   - Calculates startFrame chain (cumulative)
3. Wire `useStudioLoader` into `StudioEditor` → dispatches `SET_PROJECT` to StudioContext
4. Add caption types to `studio.ts`:
   ```typescript
   interface CaptionChunk { text: string; startMs: number; endMs: number; }
   interface CaptionTrack { segmentId: string; chunks: CaptionChunk[]; style: CaptionStyle; }
   type CaptionStyle = 'classic' | 'bold' | 'neon' | 'outline' | 'karaoke' | 'minimal';
   ```

**Verification:**
- [ ] StudioEditor loads project from DB (real videoUrl, imageUrl per segment)
- [ ] Returning user restores from studio_data (if previously saved)
- [ ] New user gets project built from script/image/video pipeline data
- [ ] Loading state shows while fetching
- [ ] `tsc --noEmit` passes
- [ ] No placeholder URLs — real data from chat_sessions

### Phase 1C: Video Preview with Remotion Player

**Estimated time:** 15 min

**Files:**
- Modify: `src/components/studio/Canvas.tsx` (wire Remotion Player to real project)
- Modify: `src/remotion/VideoComposition.tsx` (ensure video layers render)
- Create: `src/components/studio/PlaybackBar.tsx` (custom controls below preview)

**Steps:**
1. Update `Canvas.tsx`:
   - Replace static preview with `@remotion/player` `<Player>` component
   - Pass `project` from StudioContext as `inputProps`
   - Sync `currentFrame` from Player → StudioContext (via `onFrameChange` callback from Player ref)
   - Sync StudioContext.playback.currentFrame → Player (via `player.seekTo()`)
   - 9:16 aspect ratio, centered in panel, responsive scaling
2. Create `PlaybackBar.tsx`:
   - Play/Pause button (syncs with StudioContext.playback.isPlaying)
   - Timecode display: `MM:SS / MM:SS` (current / total)
   - Volume slider (for preview only)
   - Fullscreen toggle
3. Ensure `VideoComposition.tsx` renders video layers:
   - Each segment with `type: 'video'` layer → `<Video>` element via Remotion
   - Segments chained as `<Sequence>` blocks

**Verification:**
- [ ] Video preview plays actual segment videos from pipeline
- [ ] Play/Pause works from custom controls
- [ ] Timecode updates as video plays
- [ ] Playback syncs bidirectionally with timeline playhead (Phase 1D)
- [ ] 9:16 ratio maintained at all viewport sizes
- [ ] `tsc --noEmit` passes

### Phase 1D: Interactive Timeline (Core)

**Estimated time:** 30 min

**Files:**
- Rewrite: `src/components/studio/Timeline.tsx`
- Create: `src/components/studio/timeline/TimelineRuler.tsx`
- Create: `src/components/studio/timeline/TimelineTrack.tsx`
- Create: `src/components/studio/timeline/TimelineClip.tsx`
- Create: `src/components/studio/timeline/Playhead.tsx`

**Steps:**
1. Rewrite `Timeline.tsx` as container:
   - Resizable height (drag top edge, 180-400px range, default 200px)
   - Horizontal scroll for long compositions
   - Zoom state (25%-400%, scroll wheel + buttons)
   - Pixels-per-second calculation based on zoom
   - 4 tracks: Video, Text, Audio (TTS), Music (BGM) — vertically stacked
   - Track headers on left (fixed 60px width) with icon + label + mute toggle
2. `TimelineRuler.tsx`:
   - Time markers at zoom-appropriate intervals
   - Click-to-seek (set currentFrame)
   - Shows total duration
3. `Playhead.tsx`:
   - Vertical line spanning all tracks
   - Draggable horizontally (scrub)
   - Syncs with StudioContext.playback.currentFrame
   - Emerald color (#10B981) with glow effect
4. `TimelineTrack.tsx`:
   - Renders clips for one track type
   - Accepts track type and clips array
   - Handles clip selection (click → dispatch SELECT_SEGMENT)
5. `TimelineClip.tsx`:
   - Colored block (emerald=HOOK/PEAK, amber=FORE/BODY, blue=CTA, gray=LOOP-END)
   - Shows segment label + duration text
   - Video track clips show thumbnail strip (extract from videoUrl, or use imageUrl)
   - Selected state: emerald ring border
   - Hover state: lighter background

**Verification:**
- [ ] Timeline shows all segments as clips on Video track
- [ ] Playhead moves during playback, synced with video preview
- [ ] Dragging playhead scrubs video preview
- [ ] Click on ruler seeks to position
- [ ] Zoom in/out changes clip widths proportionally
- [ ] Horizontal scroll works for compositions longer than viewport
- [ ] Clip selection highlights clip and updates right panel
- [ ] `tsc --noEmit` passes

### Phase 1E: Drag-Reorder Segments

**Estimated time:** 20 min

**Prerequisite:** `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` (ASK USER FIRST)

**Files:**
- Modify: `src/components/studio/timeline/TimelineTrack.tsx` (add DnD)
- Modify: `src/contexts/StudioContext.tsx` (add REORDER_SEGMENTS action)
- Modify: `src/lib/composition.ts` (add `recalculateStartFrames()`)

**Steps:**
1. Wrap Video track clips in `@dnd-kit/sortable` `<SortableContext>`
2. Each `TimelineClip` becomes a sortable item with drag handle
3. On drag end → dispatch `REORDER_SEGMENTS` with new order
4. `REORDER_SEGMENTS` reducer:
   - Reorders `project.segments[]` array
   - Calls `recalculateStartFrames()` to update cumulative frame positions
   - Pushes undo history
5. Visual feedback during drag:
   - Dragged clip has slight scale + shadow
   - Drop placeholder shows where clip will land
   - Other clips shift to make room (animated)

**Verification:**
- [ ] Can drag segment clips to reorder on Video track
- [ ] After reorder, video plays in new sequence
- [ ] Start frames recalculated correctly (no gaps, no overlaps)
- [ ] Undo (Ctrl+Z) reverses the reorder
- [ ] Audio tracks reorder in sync (TTS aligned to segments)
- [ ] `tsc --noEmit` passes

### Phase 1F: Trim Handles

**Estimated time:** 25 min

**Files:**
- Modify: `src/components/studio/timeline/TimelineClip.tsx` (add trim handles)
- Modify: `src/contexts/StudioContext.tsx` (add TRIM_SEGMENT action)
- Create: `src/hooks/useTrimInteraction.ts`

**Steps:**
1. `useTrimInteraction` hook:
   - Tracks mouse state: idle, trimming-start, trimming-end
   - On mousedown on left/right edge (6px hit zone) → start trim
   - On mousemove → calculate new duration (snap to 0.1s increments)
   - On mouseup → dispatch TRIM_SEGMENT
   - Min duration: 1 second (30 frames)
   - Max duration: original video duration
   - Shows tooltip with new duration during drag
2. Add left/right trim handles to `TimelineClip`:
   - Visible on hover (opacity transition)
   - Cursor: `col-resize`
   - Visual: 4px wide bar with grip dots
3. `TRIM_SEGMENT` action in StudioContext:
   - Updates segment's `durationInFrames`
   - Updates layer's `inFrame` / `outFrame` (for start trim)
   - Recalculates subsequent segment startFrames
   - Pushes undo history

**Verification:**
- [ ] Hover segment edges shows trim handles
- [ ] Dragging left edge trims start (video starts later)
- [ ] Dragging right edge trims end (video ends earlier)
- [ ] Minimum 1s duration enforced
- [ ] Duration tooltip shows during trim
- [ ] Subsequent segments shift to fill gap
- [ ] Undo reverses trim
- [ ] Video preview reflects trimmed duration
- [ ] `tsc --noEmit` passes

### Phase 1G: Split Tool

**Estimated time:** 20 min

**Files:**
- Modify: `src/components/studio/timeline/TimelineClip.tsx` (split cursor)
- Modify: `src/contexts/StudioContext.tsx` (add SPLIT_SEGMENT action)
- Create: `src/components/studio/Toolbar.tsx`

**Steps:**
1. Create `Toolbar.tsx` (between MainEditor and Timeline):
   - Tools: Select (V), Split (S), Delete (Del) — radio group, one active at a time
   - Undo/Redo buttons (connected to StudioContext)
   - Zoom slider (connected to Timeline zoom)
   - Keyboard shortcuts: V for select, S for split
2. When Split tool active:
   - Cursor changes to scissors icon over Video track clips
   - Click on clip → calculate frame at click position
   - Dispatch `SPLIT_SEGMENT` with segmentId + splitFrame
3. `SPLIT_SEGMENT` reducer:
   - Creates 2 new segments from original
   - Segment 1: frames 0 → splitFrame (keeps original start)
   - Segment 2: frames splitFrame → end
   - Both reference same video source but different in/out points
   - Assigns new IDs (e.g., `HOOK-1`, `HOOK-2`)
   - Recalculates startFrames
   - Pushes undo history

**Verification:**
- [ ] Toolbar renders with Select, Split, Delete tools
- [ ] Keyboard shortcuts V/S switch tools
- [ ] Split tool shows scissors cursor over clips
- [ ] Clicking splits clip at playhead position
- [ ] Two new clips appear with correct durations
- [ ] Video preview plays both halves correctly
- [ ] Undo merges them back
- [ ] Delete tool removes selected clip
- [ ] `tsc --noEmit` passes

### Phase 1H: Transitions

**Estimated time:** 20 min

**Files:**
- Create: `src/components/studio/timeline/TransitionDiamond.tsx`
- Create: `src/components/studio/panels/TransitionPicker.tsx`
- Modify: `src/contexts/StudioContext.tsx` (ADD_TRANSITION, UPDATE_TRANSITION already exist — verify)
- Modify: `src/remotion/VideoComposition.tsx` (render transitions between sequences)

**Steps:**
1. `TransitionDiamond.tsx`:
   - Rendered between adjacent clips on Video track
   - Diamond shape (◆) at junction point
   - Click → opens TransitionPicker popover
   - Shows transition type icon when set
   - Draggable edges to adjust duration
2. `TransitionPicker.tsx` (popover):
   - 6 transition thumbnails: Fade, Slide, Wipe, Flip, Clock Wipe, Iris
   - Each shows animated preview on hover (CSS animation)
   - Duration slider (0.3-1.0s, default 0.5s)
   - "Remove" button to clear transition
   - On select → dispatch ADD_TRANSITION / UPDATE_TRANSITION
3. Render transitions in `VideoComposition.tsx`:
   - Overlap adjacent Sequences by transition duration
   - Apply CSS opacity/transform for Fade/Slide/Wipe
   - Use Remotion's `interpolate()` for smooth easing

**Verification:**
- [ ] Diamond markers appear between all adjacent clips
- [ ] Clicking diamond opens transition picker
- [ ] Selecting transition type updates diamond icon
- [ ] Duration slider adjusts transition length
- [ ] Video preview shows transition effect between segments
- [ ] Undo removes transition
- [ ] `tsc --noEmit` passes

### Phase 1I: Studio Persistence

**Estimated time:** 15 min

**Files:**
- Create: `src/hooks/useStudioPersistence.ts`
- Modify: `src/hooks/useChatSessions.ts` (add `updateStudioData` method)

**Steps:**
1. `useStudioPersistence(orderId)` hook:
   - Watches StudioContext `isDirty` flag
   - On dirty → debounce 3s → serialize `SparkfluenceProject` to JSON
   - Save to `chat_sessions.studio_data` via `updateStudioData(orderId, projectJson)`
   - Flush on unmount (beforeunload)
   - Expose `saveNow()` for manual save (Ctrl+S)
2. Add `updateStudioData` to `useChatSessions`:
   - `supabase.from('chat_sessions').update({ studio_data: json }).eq('order_id', orderId)`
3. Wire into StudioEditor

**Verification:**
- [ ] Changes auto-save after 3s of inactivity
- [ ] Ctrl+S triggers immediate save
- [ ] Refreshing page restores full editor state
- [ ] Closing and reopening studio preserves all edits
- [ ] `tsc --noEmit` passes

---

## Phase 2: Audio

### Phase 2A: Audio Tracks on Timeline

**Estimated time:** 20 min

**Files:**
- Modify: `src/components/studio/timeline/TimelineTrack.tsx` (support audio clips)
- Create: `src/components/studio/timeline/AudioClip.tsx`
- Modify: `src/contexts/StudioContext.tsx` (verify ADD/UPDATE/REMOVE_AUDIO_TRACK actions)

**Steps:**
1. Render TTS track:
   - One clip per segment that has TTS audio
   - Clip shows segment label + duration
   - Color: blue-400
   - Default: locked to segment position (moves with video clip)
2. Render BGM track:
   - Single continuous clip spanning full duration
   - Color: purple-400
   - Shows label "AI Generated BGM"
3. Render SFX track (empty initially):
   - Placeholder text: "Drag sound effects here"
   - Color: amber-400 for SFX clips
4. `AudioClip.tsx`:
   - Similar to TimelineClip but for audio
   - Draggable horizontally (reposition on timeline)
   - Trim handles (same as video)
   - Click to select → shows audio properties in right panel
   - Mute icon overlay when muted

**Verification:**
- [ ] TTS clips appear aligned to their video segments
- [ ] BGM clip spans full composition length
- [ ] SFX track shows empty placeholder
- [ ] Audio clips are selectable
- [ ] Audio clips are draggable (repositionable)
- [ ] Audio clips have trim handles
- [ ] `tsc --noEmit` passes

### Phase 2B: Waveform Visualization

**Estimated time:** 20 min

**Files:**
- Create: `src/hooks/useWaveform.ts`
- Modify: `src/components/studio/timeline/AudioClip.tsx` (render waveform)

**Steps:**
1. `useWaveform(audioUrl)` hook:
   - Fetches audio file as ArrayBuffer
   - Decodes via `AudioContext.decodeAudioData()`
   - Extracts amplitude peaks (downsample to ~200 bars per clip)
   - Returns: `{ peaks: number[], duration: number, isLoading: boolean }`
   - Caches result in ref (no re-decode on re-render)
2. Render waveform in AudioClip:
   - Array of vertical bars (SVG or div elements)
   - Height proportional to amplitude peak
   - Mirrored (top + bottom, CapCut-style)
   - Color matches track color (blue for TTS, purple for BGM, amber for SFX)
   - Scales with zoom level

**Verification:**
- [ ] TTS clips show actual audio waveform
- [ ] BGM clip shows waveform
- [ ] Waveform scales correctly when zooming
- [ ] Loading state while decoding audio
- [ ] No re-decode on re-render (cached)
- [ ] `tsc --noEmit` passes

### Phase 2C: SFX Library

**Estimated time:** 20 min

**Prerequisite:** SFX files uploaded to Supabase Storage `sfx-library/` bucket (ASK USER)

**Files:**
- Create: `src/hooks/useSfxLibrary.ts`
- Modify: `src/components/studio/AssetPanel.tsx` (Audio tab with SFX section)
- Modify: `src/lib/composition.ts` (add `createSfxTrack()`)

**Steps:**
1. `useSfxLibrary()` hook:
   - Lists files from Supabase Storage `sfx-library/` bucket
   - Groups by folder/prefix (categories: transitions, notifications, dramatic, ui)
   - Returns: `{ categories: { name, files: { name, url, duration }[] }[], isLoading }`
   - Caches list in session (no re-fetch on tab switch)
2. Update AssetPanel Audio tab:
   - Section: "Voice (TTS)" — shows pipeline TTS per segment
   - Section: "Background Music" — shows pipeline BGM
   - Section: "Sound Effects" — shows categorized SFX from library
   - Each SFX item: name, [Play preview], [+ Add to timeline]
   - "Add" places SFX at current playhead position on SFX track
   - Drag from library → drop on SFX track at position (uses @dnd-kit)
3. `createSfxTrack(name, url, startFrame)` in composition.ts

**Verification:**
- [ ] SFX library loads from Supabase Storage
- [ ] Categories displayed in Audio tab
- [ ] Preview button plays SFX inline
- [ ] "Add" places SFX at playhead on SFX track
- [ ] Drag-and-drop from library to timeline works
- [ ] SFX plays in video preview at correct time
- [ ] `tsc --noEmit` passes

### Phase 2D: Audio Properties Panel

**Estimated time:** 15 min

**Files:**
- Create: `src/components/studio/panels/AudioProperties.tsx`
- Modify: `src/components/studio/PropertiesPanel.tsx` (show AudioProperties when audio selected)

**Steps:**
1. `AudioProperties.tsx`:
   - Volume slider (0-100%, default TTS=100%, BGM=20%, SFX=80%)
   - Fade In slider (0-2s, renders visual envelope)
   - Fade Out slider (0-2s)
   - Volume envelope preview (small SVG showing fade curve)
   - Mute toggle button
   - "Lock to segment" / "Free position" radio (for TTS only)
   - Delete button
2. Wire to StudioContext:
   - On change → dispatch UPDATE_AUDIO_TRACK with new values
   - Push undo history on volume/fade changes

**Verification:**
- [ ] Clicking audio clip shows AudioProperties in right panel
- [ ] Volume slider adjusts playback volume in preview
- [ ] Fade in/out audible in preview
- [ ] Mute toggle silences track
- [ ] Lock/Free toggle changes TTS repositioning behavior
- [ ] Undo reverses audio property changes
- [ ] `tsc --noEmit` passes

---

## Phase 3: Text & Captions

### Phase 3A: Generate Captions Edge Function

**Estimated time:** 25 min

**Files:**
- Create: `supabase/functions/generate-captions/index.ts`
- Modify: `supabase/functions/_shared/apiKeyRotation.ts` (verify `callGroqTranscribe` works for remote URLs)

**Steps:**
1. Create `generate-captions/index.ts`:
   - CORS headers + OPTIONS handler (standard pattern)
   - Auth: verify JWT, get user_id
   - Input: `{ orderId: string, language?: string }`
   - Load session from `chat_sessions` by order_id
   - Extract TTS audio URLs from video_data/audio_data
   - For each segment with TTS:
     - Fetch audio blob from URL
     - Call `callGroqTranscribe(supabase, audioBlob, { language })`
     - Returns word-level timestamps: `{ words: [{ word, start, end }] }`
   - Chunk words into 3-6 word phrases (natural breaks at punctuation + word count)
   - Return: `{ success: true, data: { captions: [{ segmentId, chunks: [{ text, startMs, endMs }] }] } }`
2. Chunking algorithm:
   - Split at sentence boundaries (`.`, `!`, `?`)
   - Within sentences, group 3-6 words
   - Prefer breaking at commas, conjunctions
   - Each chunk gets startMs from first word, endMs from last word

**Verification:**
- [ ] Edge function deploys and responds to POST
- [ ] Returns word-level timestamps from Groq Whisper
- [ ] Chunks are 3-6 words each
- [ ] Handles Indonesian, English, Hindi text
- [ ] Returns proper error on missing TTS audio
- [ ] Uses API key rotation (callGroqTranscribe)
- [ ] CORS headers correct

### Phase 3B: Caption Rendering on Timeline + Canvas

**Estimated time:** 25 min

**Files:**
- Create: `src/hooks/useGenerateCaptions.ts`
- Create: `src/remotion/layers/CaptionLayer.tsx`
- Modify: `src/remotion/VideoComposition.tsx` (add caption sequences)
- Modify: `src/components/studio/timeline/TimelineTrack.tsx` (render caption clips on Text track)
- Modify: `src/contexts/StudioContext.tsx` (add SET_CAPTIONS, UPDATE_CAPTION actions)

**Steps:**
1. `useGenerateCaptions(orderId)` hook:
   - Calls `generate-captions` edge function
   - Returns: `{ generate, captions, isGenerating, error }`
   - On success → dispatch SET_CAPTIONS to StudioContext
2. Add caption state to StudioContext:
   - `project.captions: CaptionTrack[]` (one per segment)
   - Actions: SET_CAPTIONS, UPDATE_CAPTION_CHUNK, REMOVE_CAPTION, SET_CAPTION_STYLE
3. `CaptionLayer.tsx` (Remotion component):
   - Renders caption text at bottom-center of frame (y: 85%)
   - Uses `useCurrentFrame()` to determine which chunk is active
   - Applies caption style (classic/bold/neon/outline/karaoke/minimal)
   - Karaoke style: highlights words progressively using `interpolate()`
4. Wire captions into `VideoComposition.tsx`:
   - Add `<Sequence>` for each caption chunk within its segment
   - Layer on top of video (highest z-index)
5. Show caption chunks on Text track in timeline:
   - Each chunk = small clip with text preview
   - Draggable (adjust timing)
   - Selectable (edit text in right panel)

**Verification:**
- [ ] "Generate Captions" button triggers transcription
- [ ] Loading state shown during generation
- [ ] Captions appear on Text track as individual chunks
- [ ] Video preview shows captions overlaid at correct timing
- [ ] Caption chunks are draggable on timeline
- [ ] Caption chunks are editable (select → edit in right panel)
- [ ] `tsc --noEmit` passes

### Phase 3C: Text Overlays (Manual)

**Estimated time:** 20 min

**Files:**
- Create: `src/components/studio/panels/TextTemplates.tsx`
- Modify: `src/components/studio/AssetPanel.tsx` (Text tab)
- Modify: `src/contexts/StudioContext.tsx` (use existing ADD_LAYER for text)

**Steps:**
1. Update AssetPanel Text tab:
   - "[+ Add Text]" button → adds default text layer at playhead
   - 6 templates: Headline, Subtitle, Lower Third, Callout, Countdown, Price Tag
   - "Auto Captions" button → calls `useGenerateCaptions`
2. `TextTemplates.tsx`:
   - Each template = preset TextLayer config (font, size, color, position, stroke, animation)
   - Click template → dispatch ADD_LAYER with preset config + place at playhead frame
   - Templates:
     - Headline: Montserrat Bold 64px, white, center-top
     - Subtitle: Inter 32px, white 80%, bottom-center
     - Lower Third: Inter 24px, white on black-60% bar, bottom-left
     - Callout: Bebas Neue 48px, yellow, with arrow indicator
     - Countdown: Oswald 120px, white, center, pop-in animation
     - Price Tag: Inter Bold 36px, white on emerald pill
3. Text layers appear on Text track and render on canvas via existing TextLayer.tsx

**Verification:**
- [ ] "Add Text" creates default text at playhead position
- [ ] 6 templates shown with visual previews
- [ ] Clicking template places styled text on timeline
- [ ] Text visible in video preview at correct position
- [ ] Text editable by selecting and typing in right panel
- [ ] `tsc --noEmit` passes

### Phase 3D: Text Properties Panel

**Estimated time:** 20 min

**Files:**
- Create: `src/components/studio/panels/TextProperties.tsx`
- Create: `src/hooks/useFontLoader.ts`
- Modify: `src/components/studio/PropertiesPanel.tsx` (show TextProperties when text layer selected)

**Steps:**
1. `useFontLoader(fontFamily)` hook:
   - Dynamically loads Google Font via `<link>` element injection
   - Tracks loading state
   - Fonts: Inter, Montserrat, Poppins, Roboto, Bebas Neue, Oswald, Playfair Display, Space Grotesk
2. `TextProperties.tsx`:
   - Content textarea (editable)
   - Font family dropdown (8 fonts with preview)
   - Font weight dropdown (Regular, Medium, Semibold, Bold, Black)
   - Font size slider (12-200px)
   - Color picker (text fill)
   - Stroke toggle + color + width (0-5px)
   - Shadow toggle + offset X/Y + blur + color
   - Background fill toggle + color + opacity + corner radius
   - Text align (Left, Center, Right)
   - Position X/Y inputs
   - Enter animation dropdown (None, Fade In, Typewriter, Pop In, Slide Up, Slide Left, Bounce, Scale Up)
   - Exit animation dropdown (None, Fade Out, Slide Out, Scale Down)
   - Animation duration slider (0.1-1.0s)
3. All changes → dispatch UPDATE_LAYER → push undo history

**Verification:**
- [ ] All 8 fonts load and render correctly
- [ ] Font family/weight/size changes reflect in preview
- [ ] Color picker updates text color
- [ ] Stroke renders outline on text
- [ ] Shadow renders drop shadow
- [ ] Background pill renders behind text
- [ ] Alignment works (left/center/right)
- [ ] Enter/exit animations play in preview
- [ ] Undo reverses all text property changes
- [ ] `tsc --noEmit` passes

### Phase 3E: Caption Style Picker

**Estimated time:** 15 min

**Files:**
- Create: `src/components/studio/panels/CaptionStylePicker.tsx`
- Modify: `src/remotion/layers/CaptionLayer.tsx` (apply 6 styles)

**Steps:**
1. `CaptionStylePicker.tsx` (shown when caption chunk selected, or in Auto Caption modal):
   - 6 style thumbnails (2x3 grid) with live preview
   - Click to apply style to ALL captions (global style change)
   - Style definitions:
     - Classic: Inter Bold 42px, white, shadow(2,2,4,black)
     - Bold: Montserrat Black 48px, #FBBF24, bg(black 80% rounded)
     - Neon: Inter Bold 42px, #10B981, glow(0,0,8,emerald)
     - Outline: Montserrat Black 48px, transparent, stroke(white 3px)
     - Karaoke: Inter Bold 42px, white→emerald progressive highlight
     - Minimal: Inter Regular 28px, white 80%, bottom positioned
2. Update `CaptionLayer.tsx` to apply each style:
   - Karaoke: use `interpolate()` to calculate per-word highlight progress
   - Neon: use CSS textShadow with multiple spread values
   - Outline: use WebkitTextStroke (already in TextLayer.tsx)

**Verification:**
- [ ] 6 styles render visually distinct
- [ ] Clicking style applies globally to all captions
- [ ] Karaoke style highlights words progressively during playback
- [ ] Neon glow effect visible
- [ ] Outline renders correctly
- [ ] Style persists on save/reload
- [ ] `tsc --noEmit` passes

---

## New Dependencies (ASK BEFORE INSTALL)

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

No other new packages needed. Waveform = Web Audio API, Fonts = Google Fonts CDN, Transitions = CSS/Remotion interpolate.

---

## Database Changes

```sql
-- Add studio_data column to chat_sessions (if not exists)
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS studio_data JSONB;
```

---

## New Supabase Storage

```
Bucket: sfx-library (public read)
├── transitions/
│   ├── whoosh-1.mp3
│   ├── swoosh-1.mp3
│   └── slide-1.mp3
├── notifications/
│   ├── ding-1.mp3
│   ├── pop-1.mp3
│   └── chime-1.mp3
├── dramatic/
│   ├── boom-1.mp3
│   ├── thunder-1.mp3
│   └── suspense-1.mp3
└── ui/
    ├── click-1.mp3
    ├── tap-1.mp3
    └── typing-1.mp3
```

---

## Keyboard Shortcuts (Full List)

| Key | Action | Phase |
|-----|--------|-------|
| Space | Play / Pause | 1C |
| ← / → | Seek -1s / +1s | 1D |
| Shift+← / Shift+→ | Seek -0.1s / +0.1s | 1D |
| V | Select tool | 1G |
| S | Split tool | 1G |
| Delete / Backspace | Delete selected | 1G |
| Ctrl+Z | Undo | 1A |
| Ctrl+Shift+Z | Redo | 1A |
| Ctrl+D | Duplicate selected | 1G |
| Ctrl+S | Save project | 1I |
| [ / ] | Trim start/end to playhead | 1F |
| + / - | Zoom timeline in/out | 1D |
| Home / End | Jump to start/end | 1D |

---

## File Summary

### New Files (17)
| File | Phase | Purpose |
|------|-------|---------|
| `src/screens/Workspace/steps/StudioEditor.tsx` | 1A | Full-screen editor container |
| `src/hooks/useStudioLoader.ts` | 1B | Load project from chat_sessions |
| `src/components/studio/PlaybackBar.tsx` | 1C | Custom playback controls |
| `src/components/studio/timeline/TimelineRuler.tsx` | 1D | Time markers + click-to-seek |
| `src/components/studio/timeline/TimelineTrack.tsx` | 1D | Track row container |
| `src/components/studio/timeline/TimelineClip.tsx` | 1D | Segment clip block |
| `src/components/studio/timeline/Playhead.tsx` | 1D | Draggable playhead |
| `src/hooks/useTrimInteraction.ts` | 1F | Trim handle mouse logic |
| `src/components/studio/Toolbar.tsx` | 1G | Select/Split/Delete tools |
| `src/components/studio/timeline/TransitionDiamond.tsx` | 1H | Transition marker |
| `src/components/studio/panels/TransitionPicker.tsx` | 1H | Transition type selector |
| `src/hooks/useStudioPersistence.ts` | 1I | Auto-save to DB |
| `src/components/studio/timeline/AudioClip.tsx` | 2A | Audio clip with waveform |
| `src/hooks/useWaveform.ts` | 2B | Web Audio API waveform extraction |
| `src/hooks/useSfxLibrary.ts` | 2C | Load SFX from Supabase Storage |
| `src/components/studio/panels/AudioProperties.tsx` | 2D | Audio volume/fade controls |
| `supabase/functions/generate-captions/index.ts` | 3A | Groq Whisper transcription |
| `src/hooks/useGenerateCaptions.ts` | 3B | Caption generation hook |
| `src/remotion/layers/CaptionLayer.tsx` | 3B | Remotion caption renderer |
| `src/components/studio/panels/TextTemplates.tsx` | 3C | Text template library |
| `src/components/studio/panels/TextProperties.tsx` | 3D | Font/style/animation controls |
| `src/hooks/useFontLoader.ts` | 3D | Google Fonts dynamic loading |
| `src/components/studio/panels/CaptionStylePicker.tsx` | 3E | 6 caption style presets |

### Modified Files (14)
| File | Phase | Changes |
|------|-------|---------|
| `src/index.tsx` | 1A | Add StudioEditor routes |
| `src/screens/Workspace/Workspace.tsx` | 1A | Navigate to full-screen on studio click |
| `src/types/studio.ts` | 1B | Add CaptionChunk, CaptionTrack, CaptionStyle types |
| `src/lib/composition.ts` | 1B, 2C | Add buildProjectFromSession, createSfxTrack |
| `src/components/studio/Canvas.tsx` | 1C | Wire Remotion Player |
| `src/components/studio/Timeline.tsx` | 1D | Rewrite as container for sub-components |
| `src/contexts/StudioContext.tsx` | 1E-3B | Add REORDER, TRIM, SPLIT, CAPTIONS actions |
| `src/remotion/VideoComposition.tsx` | 1H, 3B | Transitions + caption rendering |
| `src/hooks/useChatSessions.ts` | 1I | Add updateStudioData method |
| `src/components/studio/AssetPanel.tsx` | 2C, 3C | Audio tab + Text tab restructure |
| `src/components/studio/PropertiesPanel.tsx` | 2D, 3D | Route to Audio/Text properties |
| `supabase/functions/_shared/apiKeyRotation.ts` | 3A | Verify callGroqTranscribe for remote URLs |
| `src/remotion/layers/CaptionLayer.tsx` | 3E | Apply 6 caption styles |

---

## Execution Options

Phase dependencies:
```
Phase 1A → 1B → 1C → 1D → 1E → 1F → 1G → 1H → 1I  (sequential)
Phase 2A → 2B → 2C → 2D  (sequential, depends on 1D)
Phase 3A (independent — edge function, can parallel with Phase 2)
Phase 3B → 3C → 3D → 3E  (sequential, depends on 3A + 1D)
```

**Parallelizable:**
- Phase 2 (Audio) and Phase 3A (Caption edge function) can run in parallel after Phase 1 completes
- Phase 3B-3E depends on both 3A completion AND Phase 1D (timeline)
