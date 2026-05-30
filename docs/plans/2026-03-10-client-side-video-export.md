> **For Claude:** REQUIRED SKILL: Use gaspol-execute to implement this plan.
> **CRITICAL:** This plan specifies real integrations. During execution,
> NEVER substitute placeholders for real data sources without explicit
> user approval. If a data source doesn't exist yet, STOP and ask.

## Goal

Enable client-side MP4 export in the Studio Editor using **FFmpeg.wasm**, so video combining runs on the user's PC instead of the VPS. This eliminates VPS compute costs, reduces server load, and makes export work without backend connectivity. The segments are already pre-rendered MP4s from GeminiGen — we just need to download, concatenate, and mix audio client-side.

## Architecture Context

**Current state:**
- `useStudioExport.ts` — existing VPS-based export hook (sends JSON to `/api/render-composition`, polls for result)
- `ExportModal.tsx` — already rewritten with `ExportStatus` type (`idle | combining | polling | downloading | done | error`), progress bar, step indicator
- `StudioEditor.tsx` — `handleExportMP4` is a placeholder (saves to DB, does nothing)
- Segments contain `layers[].src` URLs pointing to GeminiGen/fal.ai CDN video files
- Audio tracks in `project.audio.tts[]`, `project.audio.bgm[]`, `project.audio.sfx[]`

**Key types** (`src/types/studio.ts`):
- `SparkfluenceProject` → `segments[]`, `audio{}`, `transitions[]`, `captions[]`
- `SegmentComposition` → `layers: LayerItem[]` (video/image/text)
- `AudioTrackItem` → `src: string`, `startFrame`, `durationInFrames`, `volume`
- `TransitionItem` → `type`, `durationInFrames`, `betweenSegments`

## Tech Stack

- **@aspect-build/ffmpeg.wasm** or **@ffmpeg/ffmpeg** v0.12+ — FFmpeg compiled to WebAssembly
- Runs entirely in browser (Web Worker), no server needed
- Supports: video concat, xfade transitions, audio mixing, subtitle burn-in
- Size: ~32MB core + ~5MB codecs (loaded on-demand, cached by browser)

## Feasibility Analysis

### Why this works well:
1. **Segments are already MP4s** — no rendering needed, just concatenation
2. **Typical video: 5-8 segments × 5-10s = 30-80s total** — small files (~2-5MB each)
3. **FFmpeg.wasm concat + xfade is well-tested** for this use case
4. **Browser caches the WASM binary** after first load (~32MB one-time download)

### Limitations:
1. **First load downloads ~32MB** of WASM files (cached afterward)
2. **Processing speed**: ~2-5x slower than native FFmpeg (60s video ≈ 15-30s on modern PC)
3. **Memory**: Needs ~500MB RAM for typical short video (fine for desktop)
4. **Mobile**: Not recommended (slow, memory issues) — show warning
5. **No hardware acceleration** — CPU only (but adequate for short-form video)

### Tradeoffs vs VPS:
| | Client-side (FFmpeg.wasm) | VPS (FFmpeg native) |
|---|---|---|
| Speed | ~15-30s for 60s video | ~5-10s |
| Cost | $0 (user's PC) | VPS CPU cost |
| Availability | Always works offline | Needs server uptime |
| First use | 32MB WASM download | Instant (server has FFmpeg) |
| Mobile | Poor | Works (server does work) |

**Recommendation**: Default to client-side, with VPS fallback as future option.

---

## Data Integration Map

| Feature | Data Source | Hook/API | Exists? | Action |
|---------|-----------|----------|---------|--------|
| Segment video URLs | `project.segments[].layers[]` where `type==='video'` | `useStudio().state.project` | Yes | Extract from existing state |
| Audio tracks (TTS) | `project.audio.tts[].src` | `useStudio().state.project` | Yes | Extract from existing state |
| Audio tracks (BGM) | `project.audio.bgm[].src` | `useStudio().state.project` | Yes | Extract from existing state |
| Transitions | `project.transitions[]` | `useStudio().state.project` | Yes | Map to FFmpeg xfade filter |
| Export status/progress | ExportModal props | `ExportModal.tsx` | Yes | Already has full UI |
| FFmpeg.wasm runtime | `@ffmpeg/ffmpeg` + `@ffmpeg/util` | N/A | **No** | Install package + create hook |
| Export hook | `useStudioExport.ts` | Existing (VPS-based) | Yes | **Rewrite** to client-side |
| Video title | `state.project.title` | `useStudio()` | Yes | Use for filename |

---

## Phase 1: Install FFmpeg.wasm & Create Core Hook

**Estimated time:** 15 minutes

**Files:**
- Install: `@ffmpeg/ffmpeg@^0.12.10`, `@ffmpeg/util@^0.12.1`
- Create: `src/hooks/useClientExport.ts`

**Steps:**
1. Install `@ffmpeg/ffmpeg` and `@ffmpeg/util` packages (ASK USER FIRST — npm install required)
2. Create `useClientExport.ts` hook with:
   - `FFmpeg` instance (loaded lazily on first export)
   - `loadFFmpeg()` — loads WASM binary (shows progress), caches in ref
   - `exportVideo(project)` — main export function
   - State: `{ status, progress, step, error, outputUrl }`
   - `cancelExport()` — aborts in-progress export
   - `resetExport()` — clears state

**Hook interface:**
```typescript
interface ClientExportState {
  status: 'idle' | 'loading-ffmpeg' | 'downloading' | 'combining' | 'mixing-audio' | 'finalizing' | 'done' | 'error';
  progress: number;        // 0-100
  step: string;            // Human-readable step description
  error: string | null;
  outputBlob: Blob | null; // Final MP4 blob for download
}

function useClientExport(): {
  exportState: ClientExportState;
  startExport: (project: SparkfluenceProject) => Promise<void>;
  cancelExport: () => void;
  resetExport: () => void;
  downloadOutput: (filename?: string) => void;
}
```

**Export pipeline inside `startExport()`:**
```
1. Load FFmpeg WASM (if not cached)     → status: 'loading-ffmpeg', progress: 0-5%
2. Download all segment videos to MEMFS → status: 'downloading', progress: 5-40%
3. Concatenate with xfade transitions   → status: 'combining', progress: 40-70%
4. Mix audio tracks (TTS + BGM)         → status: 'mixing-audio', progress: 70-90%
5. Read output file, create Blob        → status: 'finalizing', progress: 90-100%
6. Done                                 → status: 'done', progress: 100
```

**FFmpeg commands (conceptual):**
```bash
# Step 2: Download each segment to virtual filesystem
ffmpeg.writeFile('seg0.mp4', await fetchFile(url0))
ffmpeg.writeFile('seg1.mp4', await fetchFile(url1))
# ...

# Step 3a: Simple concat (no transitions)
# Create concat list file
ffmpeg.writeFile('list.txt', "file seg0.mp4\nfile seg1.mp4\n...")
ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'combined.mp4'])

# Step 3b: With xfade transitions (if transitions exist)
# For each pair: apply xfade filter
ffmpeg.exec([
  '-i', 'seg0.mp4', '-i', 'seg1.mp4',
  '-filter_complex', '[0][1]xfade=transition=fade:duration=0.5:offset=4.5',
  '-c:v', 'libx264', '-preset', 'fast',
  'combined_01.mp4'
])

# Step 4: Mix audio
ffmpeg.exec([
  '-i', 'combined.mp4',
  '-i', 'tts.mp3',
  '-i', 'bgm.mp3',
  '-filter_complex', '[1]volume=1.0[tts];[2]volume=0.3[bgm];[tts][bgm]amix=inputs=2[audio]',
  '-map', '0:v', '-map', '[audio]',
  '-c:v', 'copy', '-c:a', 'aac',
  'final.mp4'
])

# Step 5: Read output
const data = ffmpeg.readFile('final.mp4')
new Blob([data], { type: 'video/mp4' })
```

**Verification:**
- [ ] `@ffmpeg/ffmpeg` and `@ffmpeg/util` installed
- [ ] `useClientExport.ts` compiles (`tsc --noEmit`)
- [ ] Hook exposes correct interface (status, progress, step, error, outputBlob)
- [ ] FFmpeg loads successfully in browser (test with simple concat of 2 test URLs)

---

## Phase 2: Wire Up StudioEditor + ExportModal

**Estimated time:** 10 minutes

**Files:**
- Modify: `src/screens/Workspace/steps/StudioEditor.tsx`
- No changes to: `src/components/studio/panels/ExportModal.tsx` (already has correct interface)

**Steps:**
1. Remove old `exportStatus` state (`'idle' | 'saving' | 'saved'`) and placeholder `handleExportMP4`
2. Import and use `useClientExport()` hook
3. Create new `handleExportMP4` that calls `startExport(state.project)`
4. Map `exportState.status` to `ExportStatus` type expected by ExportModal:
   - `loading-ffmpeg` | `downloading` | `combining` → `'combining'`
   - `mixing-audio` | `finalizing` → `'polling'` (reuse existing status for progress display)
   - `done` → `'done'`
   - `error` → `'error'`
5. Update ExportModal JSX props:
   ```tsx
   <ExportModal
     isOpen={showExportModal}
     onClose={() => { setShowExportModal(false); resetExport(); }}
     onExportMP4={handleExportMP4}
     exportStatus={mappedStatus}
     exportProgress={exportState.progress}
     exportStep={exportState.step}
     exportError={exportState.error}
     videoTitle={state.project.title || 'Untitled Video'}
     thumbnailUrl={thumbnailUrl}
     orderId={orderId}
   />
   ```
6. Add auto-download trigger: when `exportState.status === 'done'`, call `downloadOutput()`

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] ExportModal receives all required props (no TypeScript errors)
- [ ] Clicking "Export as MP4" triggers `startExport()` (not the old placeholder)
- [ ] Progress bar updates during export
- [ ] Download triggers automatically on completion

---

## Phase 3: ExportModal UX Enhancements

**Estimated time:** 10 minutes

**Files:**
- Modify: `src/components/studio/panels/ExportModal.tsx`

**Steps:**
1. Add "First time? FFmpeg engine will download (~32MB)" info text when status is `idle`
2. Show more granular step labels:
   - "Loading video engine..." (loading-ffmpeg)
   - "Downloading segment 3/7..." (downloading, with count)
   - "Combining segments..." (combining)
   - "Mixing audio tracks..." (mixing-audio)
   - "Finalizing export..." (finalizing)
3. Add "Cancel" button during export (calls `cancelExport()`)
4. On `done` status: show "Download Again" button (in case auto-download was blocked)
5. Add mobile warning: if `window.innerWidth < 768`, show "Export works best on desktop" banner

**Verification:**
- [ ] Step labels update correctly during export
- [ ] Cancel button stops export and resets state
- [ ] "Download Again" button works after completion
- [ ] Mobile warning appears on small screens

---

## Phase 4: Handle Edge Cases & Error Recovery

**Estimated time:** 10 minutes

**Files:**
- Modify: `src/hooks/useClientExport.ts`

**Steps:**
1. Handle CORS issues: Some GeminiGen CDN URLs may not allow direct fetch from browser. If `fetch()` fails with CORS error, try fetching via a proxy endpoint or show clear error message
2. Handle missing segments: If a segment has no video URL, skip it (don't fail entire export). Log warning
3. Handle FFmpeg.wasm load failure: Show "Failed to load video engine. Please refresh and try again." with retry button
4. Memory management: After export completes, cleanup MEMFS files (`ffmpeg.deleteFile()`) to free memory
5. Handle abort: Use `AbortController` for fetch requests, check `cancelled` flag before each FFmpeg step
6. If project has no transitions, use fast-path concat (`-c copy`, no re-encoding) — much faster

**Verification:**
- [ ] Export handles missing segment URLs gracefully (skips, doesn't crash)
- [ ] CORS error shows clear message
- [ ] Memory is cleaned up after export
- [ ] Cancel mid-export works without errors
- [ ] No-transition fast-path uses copy codec (verify with console log)

---

## Phase Summary

| Phase | What | Time | Files |
|-------|------|------|-------|
| 1 | Install FFmpeg.wasm + create `useClientExport` hook | 15 min | 1 new file + package.json |
| 2 | Wire StudioEditor + ExportModal | 10 min | 1 modified file |
| 3 | ExportModal UX enhancements | 10 min | 1 modified file |
| 4 | Edge cases + error recovery | 10 min | 1 modified file |

**Total estimated: ~45 minutes**

---

## Vite Configuration Note

FFmpeg.wasm requires specific Vite config for SharedArrayBuffer (needed for multi-threading):

```typescript
// vite.config.ts — add these headers for dev server
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  }
}
```

**⚠️ Production note:** These headers must also be set on the production server/CDN. SharedArrayBuffer requires cross-origin isolation. If headers can't be set, FFmpeg.wasm falls back to single-threaded mode (slower but works).

**Alternative:** Use `@ffmpeg/ffmpeg` single-threaded build to avoid header requirements entirely. Slower (~2x) but zero config needed.

---

## Decision Point: Single-threaded vs Multi-threaded

| | Single-threaded | Multi-threaded |
|---|---|---|
| Speed | ~30-60s for 60s video | ~15-30s |
| Config | Zero config | Needs COOP/COEP headers |
| Compatibility | All browsers | Chrome 91+, Firefox 79+ |
| Package | `@ffmpeg/ffmpeg` (default) | `@ffmpeg/ffmpeg` + `@ffmpeg/core-mt` |

**Recommendation:** Start with **single-threaded** (Phase 1-4). Add multi-threaded as optional upgrade later. This avoids Vite/production header complexity.
