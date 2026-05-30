# Studio Editor Enhancement v2 — Multi-Track + Drag & Drop

**Date:** 2026-03-10
**Status:** Approved
**Scope:** 5 features for CapCut-style Studio Editor

---

## Decisions

| # | Feature | Approach |
|---|---------|----------|
| 1 | Player title | Label project title above preview area |
| 2 | Text drag in player | Transparent overlay with bounding boxes on top of Remotion Player |
| 3 | Properties panel resize | Right panel drag handle (mirrors left panel pattern) |
| 4 | Transition drag & drop | Drag from Transitions tab → drop in gap zone between clips on timeline. 34 transitions in 10 categories. Remove "Active" list — management via timeline only. |
| 5 | Multi-track timeline | Main track (linear pipeline) + overlay tracks (video/text, free-position) |

---

## Feature 1: Player Title

Add project title label above the Remotion Player preview area.

- Source: `state.project.title`
- Position: Centered above the 9:16 preview container
- Style: `text-sm font-medium text-neutral-300`
- Editable: No (display only — title is set from session data)

**Files:** `StudioEditor.tsx` (center panel, above preview div)

---

## Feature 2: Text Drag in Player Preview

### Approach: Transparent Overlay

Render a `<div>` on top of the Remotion `<Player>` that shows draggable bounding boxes for text layers visible at the current frame.

### Scale Factor

Preview container is ~360px wide for 1080px composition:
```
scaleX = previewContainerWidth / STUDIO_WIDTH   (360 / 1080 = 0.333)
scaleY = previewContainerHeight / STUDIO_HEIGHT  (640 / 1920 = 0.333)
```

### Bounding Box Rendering

For each text layer in the current segment (at current frame):
1. Calculate preview position: `layer.position.x * scaleX`, `layer.position.y * scaleY`
2. Calculate preview size: `layer.size.w * scaleX`, `layer.size.h * scaleY`
3. Render a transparent div with dashed border at that position
4. On mousedown → start drag → update `layer.position` via `UPDATE_LAYER` dispatch
5. Convert delta back to composition coordinates: `deltaX / scaleX`, `deltaY / scaleY`

### Visual Design

- Inactive text: no visible bounding box
- Hover: faint dashed border `border border-dashed border-white/30`
- Selected (clicked): solid border `border-2 border-emerald-500` + corner resize handles
- Dragging: move cursor, position updates in real-time

### Component

New: `src/components/studio/PlayerOverlay.tsx`

```tsx
interface PlayerOverlayProps {
  project: SparkfluenceProject;
  currentFrame: number;
  selectedSegmentId: string | null;
  selectedLayerId: string | null;
  containerWidth: number;
  containerHeight: number;
  onLayerSelect: (segmentId: string, layerId: string) => void;
  onLayerMove: (segmentId: string, layerId: string, position: { x: number; y: number }) => void;
}
```

**Files:**
- New: `src/components/studio/PlayerOverlay.tsx`
- Edit: `StudioEditor.tsx` (wrap Player with overlay)

---

## Feature 3: Properties Panel Resize

Mirror the left panel resize pattern:
- `rightPanelWidth` state (default 256px, min 200, max 400)
- Resize handle div between center panel and right panel
- `cursor-col-resize` on hover, emerald highlight on active

**Files:** `StudioEditor.tsx` (add state + resize handler + handle div)

---

## Feature 4: Transition Drag & Drop

### Left Panel (Transitions Tab)

Make transition type items draggable:
```tsx
<div
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('application/x-studio-transition', JSON.stringify({ type: 'fade' }));
    e.dataTransfer.effectAllowed = 'copy';
  }}
>
```

### Timeline (Drop Zones)

Between adjacent video clips on the main track, render invisible drop zones (~40px wide, full track height).

On `dragover` with `application/x-studio-transition`:
- Highlight the gap zone (emerald glow)
- Show diamond preview

On `drop`:
- Parse transition type from dataTransfer
- Find the two adjacent segment IDs
- If transition exists between them: `UPDATE_TRANSITION` (replace type)
- If no transition: `ADD_TRANSITION` (create new)

### Drop Zone Component

New: integrated into `TimelineTrack.tsx` for video track only.

Between each pair of clips, render:
```tsx
<div
  className="absolute z-5"
  style={{ left: clipEndPx - 20, width: 40, height: trackHeight, top: 0 }}
  onDragOver={handleTransitionDragOver}
  onDrop={handleTransitionDrop}
>
  {/* Visual highlight on hover */}
</div>
```

**Files:**
- Edit: `TransitionsTabContent` in `StudioEditor.tsx` (add draggable)
- Edit: `TimelineTrack.tsx` (add drop zones between clips for video track)
- Edit: `Timeline.tsx` (pass transition handlers)

---

## Feature 5: Multi-Track Timeline (Phase 1)

### Data Model

New types in `src/types/studio.ts`:

```ts
// Generic overlay clip — can hold video, image, or text
interface OverlayClip {
  id: string;
  type: 'video' | 'image' | 'text';
  src: string;                          // media URL (empty for text)
  startFrame: number;                   // absolute position on timeline
  durationInFrames: number;
  position: { x: number; y: number };   // composition coordinates
  size: { w: number; h: number };
  opacity: number;
  zIndex: number;                       // render order (higher = on top)

  // Text-specific (when type === 'text')
  text?: {
    content: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    strokeColor: string;
    strokeWidth: number;
    align: 'left' | 'center' | 'right';
  };
}

interface OverlayTrack {
  id: string;
  label: string;           // "Video 2", "Text 2", etc.
  trackType: 'video' | 'text';
  clips: OverlayClip[];
}
```

Add to `SparkfluenceProject`:
```ts
overlayTracks?: OverlayTrack[];
```

### New Reducer Actions

```ts
// Overlay track management
| { type: 'ADD_OVERLAY_TRACK'; trackType: 'video' | 'text' }
| { type: 'REMOVE_OVERLAY_TRACK'; trackId: string }

// Overlay clip management
| { type: 'ADD_OVERLAY_CLIP'; trackId: string; clip: OverlayClip }
| { type: 'UPDATE_OVERLAY_CLIP'; trackId: string; clipId: string; changes: Partial<OverlayClip> }
| { type: 'MOVE_OVERLAY_CLIP'; trackId: string; clipId: string; startFrame: number }
| { type: 'REMOVE_OVERLAY_CLIP'; trackId: string; clipId: string }

// Insert into main track
| { type: 'INSERT_SEGMENT_AT'; segment: SegmentComposition; insertIndex: number }
```

### Timeline Rendering

```
Main video track (existing):
  - Linear segments from pipeline
  - Drop zones between clips for:
    a) Transition drag (from Transitions tab)
    b) Media insert (from Media tab / imported files)

Overlay tracks (new):
  - Rendered below main track, above TTS/BGM
  - Same zoom, scroll, ruler alignment
  - Clips positioned by startFrame (free-position, not sequential)
  - Drop target: drag media from left panel → creates clip at drop position
  - "+" button in track header to add new overlay track

Track order (top to bottom):
  Video (main) → Video 2 → Video 3 → ... → Text (main) → Text 2 → ... → TTS → BGM
```

### Drag & Drop: Media → Timeline

**Drag from Media tab (left panel):**
```
dataTransfer: 'application/x-studio-media' (existing)
```

**Drop targets on timeline:**

1. **Gap between main track clips** → `INSERT_SEGMENT_AT` (insert at that position)
   - Visual: vertical line indicator at insertion point
   - Converts media to segment with video/image layer

2. **Overlay track area** → `ADD_OVERLAY_CLIP` at the frame position of the drop
   - Visual: ghost clip preview follows cursor
   - Frame position = (dropX - headerWidth + scrollLeft) / pixelsPerSecond * FPS

3. **Empty area below tracks** → Auto-create new overlay track + add clip
   - `ADD_OVERLAY_TRACK` then `ADD_OVERLAY_CLIP`

### Remotion Renderer Update

`VideoComposition.tsx` must render overlay tracks on top of main segments:

```tsx
// After rendering main segments...
{(project.overlayTracks || []).map(track =>
  track.clips
    .filter(clip => clip.startFrame < currentFrame && clip.startFrame + clip.durationInFrames > currentFrame)
    .map(clip => (
      <OverlayClipRenderer key={clip.id} clip={clip} currentFrame={currentFrame} />
    ))
)}
```

New: `src/remotion/layers/OverlayClipRenderer.tsx`

### Insert Between Clips (Main Track)

When dragging media to the gap between main track clips:

1. Calculate insert index from drop position
2. Create new segment from media (like existing `addToTimeline`)
3. Dispatch `INSERT_SEGMENT_AT { segment, insertIndex }`
4. Reducer: `segments.splice(insertIndex, 0, segment)` → `recalculateFrames`

Visual: vertical green line indicator at insertion point during drag hover.

---

## Data Integration Map

| Component | Data Source | Existing? | Notes |
|-----------|-----------|-----------|-------|
| Player title | `state.project.title` | Yes | Display only |
| Text overlay positions | `selectedSegment.layers[type=text]` | Yes | Scale to preview coords |
| Right panel width | `rightPanelWidth` local state | New | Mirror left panel pattern |
| Transition drag data | `dataTransfer` + `project.transitions` | Partial | Need drop zones in timeline |
| Overlay tracks | `project.overlayTracks[]` | **New** | New type + reducer actions |
| Insert at position | `INSERT_SEGMENT_AT` action | **New** | Splice into segments array |
| Overlay rendering | `VideoComposition` + `OverlayClipRenderer` | **New** | Remotion layer for overlays |

---

## Implementation Phases

### Phase A: Quick Wins (no architecture change)
1. Player title label
2. Properties panel resize
3. Transition drag & drop (left panel → timeline gaps)

### Phase B: Text Drag Overlay
4. PlayerOverlay component
5. Bounding box rendering + drag interaction
6. Scale factor math (preview ↔ composition coords)

### Phase C: Multi-Track System
7. New types (`OverlayTrack`, `OverlayClip`) in `studio.ts`
8. New reducer actions in `StudioContext.tsx`
9. Timeline overlay track rendering
10. Drop zones: insert between main clips + overlay track drops
11. OverlayClipRenderer for Remotion
12. "Add Track" button + track management UI

---

## Files Changed

| File | Change |
|------|--------|
| `src/types/studio.ts` | Add `OverlayClip`, `OverlayTrack`, update `SparkfluenceProject` |
| `src/contexts/StudioContext.tsx` | Add 7 new reducer actions |
| `src/screens/Workspace/steps/StudioEditor.tsx` | Player title, right resize, transition drag |
| `src/components/studio/PlayerOverlay.tsx` | **New** — text drag overlay |
| `src/components/studio/Timeline.tsx` | Overlay track rendering, insert drop zones |
| `src/components/studio/timeline/TimelineTrack.tsx` | Transition drop zones, insert indicators |
| `src/components/studio/timeline/OverlayTrackRow.tsx` | **New** — overlay track component |
| `src/remotion/VideoComposition.tsx` | Render overlay tracks |
| `src/remotion/layers/OverlayClipRenderer.tsx` | **New** — overlay clip Remotion layer |
| `src/hooks/useStudioPersistence.ts` | Serialize `overlayTracks` to DB |
