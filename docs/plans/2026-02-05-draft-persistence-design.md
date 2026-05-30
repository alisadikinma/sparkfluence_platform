# ImageGeneration Improvements — Design Plan

**Date:** 2026-02-05
**Status:** Draft

## Overview

Three improvements to the ImageGeneration page, to be implemented together:

1. **Draft Persistence** — Save segment edits to DB so they survive refresh/re-login
2. **Compact Segment View** — Reduce scrolling with view mode toggle (Full/Compact/Grid)
3. **LOOP-END Always Present** — Show LOOP-END segment even when ScriptForm toggle was OFF

---

## Feature 1: Draft Persistence

### Problem

All segment edits (split, merge, shorten, undo, apply options, script edits, duration changes) are lost when user refreshes, closes browser, or re-logs in. Currently only localStorage is used (per-session key), which is device-specific and can be cleared.

## Existing Infrastructure

### Already exists:
- **`generation_sessions` table** — has `script_data` JSONB column, `status`, `current_step` fields
- **`image_generation_jobs` table** — per-segment image records with `session_id`
- **localStorage auto-save** — `saveProgress()` with 1s debounce in `ImageGeneration.tsx`

### Currently NOT wired:
- `generation_sessions.script_data` is never written to from frontend
- No DB-level draft loading on page load

## Design

### Architecture: Database Primary + localStorage Fallback

```
User edit → debounce 2s → save to DB (background, silent)
                        → save to localStorage (instant, fallback)

Page load → load from DB (primary source of truth)
         → fallback to localStorage if DB empty/fails
```

### What gets saved to `script_data` JSONB

```typescript
{
  version: 2,                    // Schema version for future migration
  segments: Segment[],           // Full segment state (scripts, VD, options, split info)
  topic: string,                 // Current topic
  videoSettings: VideoSettings,  // Duration, aspect ratio, resolution, language
  savedAt: string,               // ISO timestamp
}
```

**Note:** We strip transient fields before saving:
- `isGeneratingImage` → always false
- `imageError` → always null
- `images` → NOT saved here (already in `image_generation_jobs`)
- `imageUrl` → reconstructed from `image_generation_jobs` on load

### Database Changes

**No new tables needed.** Use existing `generation_sessions`:

1. Update `script_data` JSONB on save (already nullable JSONB column)
2. Update `status` to track progress: `draft` → `script_ready` → `images_pending` → etc.
3. Update `segments_count` for quick display in session list

### Frontend Changes

#### 1. `saveDraftToDB()` — New async function

```typescript
const saveDraftToDB = useCallback(async (
  updatedSegments: Segment[],
  topic: string,
  settings: VideoSettings | null
) => {
  if (!sessionId || !user) return;

  // Strip transient fields
  const cleanSegments = updatedSegments.map(seg => ({
    ...seg,
    isGeneratingImage: false,
    imageError: null,
    images: [],        // Images stored separately in image_generation_jobs
    imageUrl: null,    // Reconstructed on load
  }));

  const scriptData = {
    version: 2,
    segments: cleanSegments,
    topic,
    videoSettings: settings,
    savedAt: new Date().toISOString(),
  };

  await supabase
    .from('generation_sessions')
    .upsert({
      session_id: sessionId,
      user_id: user.id,
      topic: topic,
      script_data: scriptData,
      segments_count: updatedSegments.length,
      status: 'script_ready',
      language: settings?.language || 'id',
      duration: settings?.duration || '60s',
      aspect_ratio: settings?.aspectRatio || '9:16',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id' });
}, [sessionId, user]);
```

#### 2. Update `useEffect` auto-save

Add DB save alongside existing localStorage save:

```typescript
useEffect(() => {
  if (sessionId && segments.length > 0 && currentTopic !== "Your Video") {
    const timeoutId = setTimeout(() => {
      saveProgress(segments, currentTopic, videoSettings);   // localStorage (instant)
      saveDraftToDB(segments, currentTopic, videoSettings);   // DB (background)
    }, 2000);  // 2s debounce for DB
    return () => clearTimeout(timeoutId);
  }
}, [segments, sessionId, currentTopic, videoSettings]);
```

#### 3. `loadDraftFromDB()` — New async function

```typescript
const loadDraftFromDB = async (sid: string): Promise<DraftData | null> => {
  const { data } = await supabase
    .from('generation_sessions')
    .select('script_data, topic, status')
    .eq('session_id', sid)
    .single();

  if (data?.script_data?.version >= 2) {
    return data.script_data;
  }
  return null;
};
```

#### 4. Update page load logic

In `useEffect` initialization:
```
1. Check URL params for session_id
2. Try load from DB (primary)
3. If DB empty → try localStorage (fallback)
4. If both empty → load from location.state (fresh from ScriptForm)
5. Reconstruct image URLs from image_generation_jobs
```

#### 5. Reconstruct images on load

After loading segments from DB, query `image_generation_jobs` to restore image gallery:

```typescript
const { data: imageJobs } = await supabase
  .from('image_generation_jobs')
  .select('*')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true });

// Map images back to segments
```

### Implementation Steps

1. **Update `saveProgress` + add `saveDraftToDB`** — dual save with 2s debounce
2. **Add `loadDraftFromDB`** — query generation_sessions
3. **Update page load** — DB-first loading with localStorage fallback
4. **Add image reconstruction** — restore images from image_generation_jobs
5. **Add save indicator** — small "Saved" / "Saving..." text in header
6. **Test** — verify persistence across refresh, re-login, different devices

### Save Indicator UI

Small text in the top-right area of ImageGeneration page:
- "Saving..." (gray, with spinner) — during DB save
- "Saved" (green, fades after 2s) — after successful save
- "Offline" (amber) — localStorage only, DB unreachable

### Edge Cases

- **Concurrent edits from 2 devices** — last write wins (acceptable for MVP)
- **Large segment data** — JSONB handles up to 1GB, our data is <50KB
- **Network offline** — localStorage catches changes, syncs on next save
- **Session without user** — skip DB save, localStorage only
- **Version migration** — `version` field allows future schema changes

### Out of Scope (Future)

- Real-time collaboration
- Conflict resolution
- Version history / undo across sessions
- Session list page with resume functionality

---

## Feature 2: Compact Segment View

### Problem

With 7-12+ segments, the ImageGeneration page requires excessive scrolling. Users lose overview of the full video structure. Currently each segment card takes ~300-400px height (textarea + image gallery + options), making it hard to see the big picture.

### Design: View Mode Toggle (Full / Compact / Grid)

A toggle in the page header lets users switch between three view modes:

```
[Full ▣] [Compact ≡] [Grid ⊞]
```

**State:** `viewMode: 'full' | 'compact' | 'grid'` — saved to localStorage + DB draft.

#### Full View (Default — Current Layout)
- No changes. One segment per row, full textarea, full image gallery.
- Best for: editing scripts, applying options, detailed work.

#### Compact View
- Each segment collapses to a single horizontal row (~60px height):
  ```
  ┌─────────────────────────────────────────────────────────┐
  │ [1] HOOK ⏱5s  │ "Gue tau lo pasti..." │ 🖼️ ✅  │ ▼ │
  └─────────────────────────────────────────────────────────┘
  ```
  - Shows: segment number, type badge, duration, truncated script (first ~50 chars), image status icon (none/generating/done), expand chevron
  - Click row or chevron → expands that single segment to full view (accordion)
  - Only one segment expanded at a time (or allow multiple with shift-click)
  - Best for: overview, quick navigation, reordering

#### Grid View
- 2-column grid of thumbnail cards (~180px height each):
  ```
  ┌──────────────┐  ┌──────────────┐
  │  🖼️ image    │  │  🖼️ image    │
  │  HOOK  5s    │  │  FORE  10s   │
  │  "Gue tau.." │  │  "Nah ini.." │
  │  ✅ Options  │  │  ⚠️ No img   │
  └──────────────┘  └──────────────┘
  ```
  - Shows: image thumbnail (or placeholder), type + duration, truncated script (2 lines), status badges
  - Click card → opens full editor for that segment (modal or inline expand)
  - Best for: visual overview, seeing which segments have images

### Implementation

#### New state + toggle UI

```typescript
// State
const [viewMode, setViewMode] = useState<'full' | 'compact' | 'grid'>('full');

// Toggle in header (next to save indicator)
<div className="flex items-center gap-1 border rounded-lg p-0.5">
  <button onClick={() => setViewMode('full')}
    className={viewMode === 'full' ? 'bg-primary text-primary-foreground' : ''}>
    <LayoutList className="h-4 w-4" />
  </button>
  <button onClick={() => setViewMode('compact')}
    className={viewMode === 'compact' ? 'bg-primary text-primary-foreground' : ''}>
    <List className="h-4 w-4" />
  </button>
  <button onClick={() => setViewMode('grid')}
    className={viewMode === 'grid' ? 'bg-primary text-primary-foreground' : ''}>
    <LayoutGrid className="h-4 w-4" />
  </button>
</div>
```

#### Compact row component

```typescript
// CompactSegmentRow — clickable row that expands one segment
<div className="flex items-center gap-3 px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted/50"
     onClick={() => setExpandedSegmentId(segment.id)}>
  <span className="text-xs text-muted-foreground w-5">{index + 1}</span>
  <Badge>{segment.type}</Badge>
  <span className="text-xs text-muted-foreground">⏱{segment.durationSeconds}s</span>
  <p className="flex-1 text-sm truncate">{segment.script}</p>
  {segment.imageUrl ? <ImageIcon className="h-4 w-4 text-green-500" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
  {segment.optionsApplied && <Settings2 className="h-3 w-3 text-blue-400" />}
  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSegmentId === segment.id ? 'rotate-180' : ''}`} />
</div>
```

#### Grid card component

```typescript
// GridSegmentCard — thumbnail card in 2-column layout
<div className="border rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50"
     onClick={() => setExpandedSegmentId(segment.id)}>
  {/* Image thumbnail or placeholder */}
  <div className="aspect-video bg-muted relative">
    {segment.imageUrl ? (
      <img src={segment.imageUrl} className="w-full h-full object-cover" />
    ) : (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <ImageIcon className="h-8 w-8" />
      </div>
    )}
    <Badge className="absolute top-1 left-1 text-[10px]">{segment.type}</Badge>
    <span className="absolute top-1 right-1 text-[10px] bg-black/60 text-white px-1 rounded">
      {segment.durationSeconds}s
    </span>
  </div>
  {/* Info */}
  <div className="p-2">
    <p className="text-xs line-clamp-2">{segment.script}</p>
    <div className="flex items-center gap-1 mt-1">
      {segment.optionsApplied && <Badge variant="outline" className="text-[9px]">Options</Badge>}
      {wordCount > maxWords && <Badge variant="destructive" className="text-[9px]">Over</Badge>}
    </div>
  </div>
</div>
```

#### Expanded segment (for Compact/Grid)

When a segment is expanded (clicked in compact/grid mode), render the full segment card inline (same as current Full view card). Add a collapse button to return to compact/grid.

### Steps

1. Add `viewMode` state + toggle buttons in page header
2. Create `CompactSegmentRow` inline component
3. Create `GridSegmentCard` inline component
4. Wrap segment list render with conditional: `viewMode === 'full'` → current cards, `compact` → compact rows, `grid` → 2-col grid
5. Add expand/collapse behavior for compact and grid modes
6. Save `viewMode` preference to localStorage (persists across sessions)

---

## Feature 3: LOOP-END Always Present

### Problem

When the user toggles LOOP-END OFF in ScriptForm, `generate-script` edge function does NOT include a LOOP-END segment in its output. This means when the user arrives at ImageGeneration, there's no LOOP-END card at all — they can't toggle it ON later.

The desired behavior: LOOP-END segment should always appear for 60s/90s videos, but with a toggle (ON/OFF) on the card itself. When OFF, the card is visually dimmed and skipped during image generation.

### Design

#### Synthetic LOOP-END injection

In the `initializeEditor` logic (where segments from `location.state` / DB are loaded), after mapping segments:

```typescript
// After loading segments from any source (stateData, DB, localStorage)
const duration = videoSettings?.duration || '60s';
const hasLoopEnd = segments.some(s => s.type === 'LOOP-END');

if (!hasLoopEnd && (duration === '60s' || duration === '90s')) {
  // Inject synthetic LOOP-END at the end
  const syntheticLoopEnd: Segment = {
    id: `loop-end-${Date.now()}`,
    type: 'LOOP-END',
    script: '',
    visualDirection: '',
    durationSeconds: 5,
    shotType: 'CREATOR',
    images: [],
    imageUrl: null,
    isGeneratingImage: false,
    imageError: null,
    loopEndEnabled: false,    // OFF by default since user toggled it OFF
    optionsApplied: false,
  };
  segments.push(syntheticLoopEnd);
}
```

#### LOOP-END card toggle

On the LOOP-END segment card, add a toggle switch:

```typescript
{segment.type === 'LOOP-END' && (
  <div className="flex items-center gap-2">
    <Switch
      checked={segment.loopEndEnabled !== false}
      onCheckedChange={(checked) => {
        setSegments(prev => prev.map(s =>
          s.id === segment.id ? { ...s, loopEndEnabled: checked } : s
        ));
      }}
    />
    <span className="text-xs text-muted-foreground">
      {segment.loopEndEnabled !== false ? 'ON' : 'OFF'}
    </span>
  </div>
)}
```

#### Visual dimming when OFF

```typescript
<div className={cn(
  "border rounded-xl p-4",
  segment.type === 'LOOP-END' && segment.loopEndEnabled === false && "opacity-40 pointer-events-none [&>*:first-child]:pointer-events-auto"
  // First child (header with toggle) remains interactive
)}>
```

When `loopEndEnabled === false`:
- Card content at 40% opacity (except the header/toggle area)
- "Generate Image" button disabled
- Skipped in "Generate All" / "Regenerate All" batch operations
- Script textarea and options still visible but dimmed

#### Skip in batch generation

In `handleGenerateAll` and `handleRegenerateAll`:

```typescript
const segmentsToGenerate = segments.filter(seg => {
  if (seg.type === 'LOOP-END' && seg.loopEndEnabled === false) return false;
  // ... other filters
  return true;
});
```

### Steps

1. Add `loopEndEnabled` to Segment interface (already partially exists from previous work)
2. Add synthetic LOOP-END injection in initialization logic
3. Add toggle switch UI on LOOP-END card header
4. Add opacity dimming when OFF
5. Skip disabled LOOP-END in batch generation functions

---

## Combined Implementation Order

All three features touch `ImageGeneration.tsx`. Implementation order to minimize conflicts:

| Step | Feature | Description |
|------|---------|-------------|
| 1 | Persistence | Add `saveDraftToDB()` function |
| 2 | Persistence | Add `loadDraftFromDB()` function |
| 3 | Persistence | Update page load logic (DB-first) |
| 4 | Persistence | Add image reconstruction from `image_generation_jobs` |
| 5 | Persistence | Add save indicator UI |
| 6 | LOOP-END | Add synthetic LOOP-END injection in init |
| 7 | LOOP-END | Add toggle switch + dimming on LOOP-END card |
| 8 | LOOP-END | Skip disabled LOOP-END in batch generation |
| 9 | Compact | Add `viewMode` state + toggle buttons |
| 10 | Compact | Create compact row component |
| 11 | Compact | Create grid card component |
| 12 | Compact | Wire expand/collapse behavior |
| 13 | All | Verify build + test all features together |
