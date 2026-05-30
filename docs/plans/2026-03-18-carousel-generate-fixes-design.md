# Carousel GenerateStep Fixes & Enhancements

**Date:** 2026-03-18
**Status:** Implemented
**Scope:** 6 items — 3 bug fixes + 3 features

---

## Items Overview

| # | Type | Title | Priority |
|---|------|-------|----------|
| 1 | Bug | Pagination count wrong (1/1 → 1/3) | HIGH |
| 1b | Bug | IG import duplicate images | HIGH |
| 2 | Bug | Competitor branding not removed (TECHNOLOGY badge, @@brand) | HIGH |
| 3 | Bug | SWIPE text rendered wrong by AI | MEDIUM |
| 4 | Feature | Branding check modal on project create | MEDIUM |
| 5 | Feature | Per-slide reference keyword auto-pass to Configure | MEDIUM |
| 6 | Feature | "Copy Source" mode + canvas editor in new tab | HIGH |

---

## Fix #1: Pagination — Remove from AI, Use Frontend Overlay

### Problem
1. `generate-carousel-images/index.ts` line 143: `const totalSlides = slides.length` uses only the batch being generated. Single regen → "1/1" instead of "1/3".
2. Page numbers baked into AI image become stale when user skips/deletes slides (e.g., "1/5" remains even after 2 slides deleted → should be "1/3").

### Root Cause
Page numbers are rendered BY the AI model inside the image. They cannot be updated without re-generating. Any skip/delete makes existing page numbers wrong.

### Solution: Remove page numbers from AI prompt, overlay in frontend

**A) Edge function — remove page number from prompt:**
```typescript
// generate-carousel-images/index.ts
// REMOVE from P4 (line 237):
// "${slide.slide_index + 1}/${totalSlides}" as a small white page number...
// REMOVE from P4 brand-only mode (line 240):
// "${slide.slide_index + 1}/${totalSlides}" page number top-left.
```

**B) Frontend — overlay page number in GenerateStep:**
```tsx
// GenerateStep.tsx — on each generated slide card
<div className="relative">
  <img src={slide.imageUrl} />
  {/* Page number overlay — always accurate */}
  <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
    {activeIndex + 1}/{totalActiveSlides}
  </span>
</div>
```

Where:
- `totalActiveSlides` = `activeFramework.length` (excludes skipped slides)
- `activeIndex` = position within active (non-skipped) slides
- Overlay auto-updates instantly on skip/delete — no regen needed

**C) Final export — bake page numbers during FFmpeg/canvas export step:**
- Page numbers get permanently rendered only at final export time
- Always reflects current slide count at time of export

**D) Still need totalSlides fix for other prompt uses (emotional arc, visual rules):**
```typescript
// After line 106 — get true total for prompt context (not page numbers)
const { count: totalSlideCount } = await supabase
  .from('carousel_slides')
  .select('*', { count: 'exact', head: true })
  .eq('project_id', project_id);

const totalSlides = totalSlideCount || slides.length;
```

### Files Changed
- `supabase/functions/generate-carousel-images/index.ts` (remove page number from P4, fix totalSlides)
- `src/screens/CarouselImages/steps/GenerateStep.tsx` (add page number overlay)

---

## Fix #1b: IG Import URL Dedup

### Problem
Python scraper returns `media_urls` array from IG carousel. If IG carousel has duplicate image URLs (same image appearing 2x), duplicates get imported.

### Root Cause
No URL-level dedup in `SourceStep.tsx` before inserting slides (line 396-437). Dedup only checks shortcode (URL-level), not individual media URLs within a carousel.

### Solution
After Python scraper returns `media_urls`, deduplicate by URL:

```typescript
// After line 330 in SourceStep.tsx
if (backendData?.data?.media_urls?.length > 0) {
  // Deduplicate by URL
  const seen = new Set<string>();
  mediaUrls = backendData.data.media_urls.filter((m: any) => {
    if (seen.has(m.url)) return false;
    seen.add(m.url);
    return true;
  });
}
```

### Files Changed
- `src/screens/CarouselImages/steps/SourceStep.tsx`

---

## Fix #2: Competitor Branding Not Removed

### Problem
1. "TECHNOLOGY" category badge from source creator still appears in generated images
2. When no branding kit, `handleText` defaults to `'@brand'` → renders as `"@brand"` (looks like `@@brand`)

### Root Cause
1. `carousel-rebranding.ts` says to remove category tags but P5 in prompt doesn't explicitly list them
2. Line 178: `const handleText = branding_kit?.handleText || '@brand'` — fallback renders placeholder

### Solution

**A) Strengthen P5 prompt** (generate-carousel-images/index.ts line 243):
```
P5 — ASPECT RATIO + CONSTRAINTS:
4:5 aspect ratio. Hyper-realistic photographic style.
REMOVE ALL competitor elements: category badges (TECHNOLOGY, LIFESTYLE, ENTERTAINMENT, etc.),
source creator handles, watermarks, logos. These must NOT appear in the generated image.
Only keep subject brand logos (e.g., Apple logo, Google logo) if they provide context.
```

**B) Omit handle when no branding kit**:
```typescript
const handleText = branding_kit?.handleText || null;
// In P4:
${handleText ? `"${handleText}" as a watermark...` : ''}
```

### Files Changed
- `supabase/functions/generate-carousel-images/index.ts`

---

## Fix #3: SWIPE Text Prompt Emphasis

### Problem
AI image model renders "SWIPE FOR MORE) >" instead of "SWIPE (GESER) >". Nano Banana Pro doesn't always follow text prompts exactly.

### Root Cause
AI text rendering is imprecise. Prompt says `"SWIPE (GESER) >"` but model outputs different text.

### Solution
Add stronger emphasis in prompt:

```typescript
// Line 236
${slide.slide_type !== 'CTA'
  ? 'EXACT text "SWIPE (GESER) >" in small white text positioned directly beneath the headline text with minimal gap. Render these exact three words plus arrow — never rephrase, never translate differently, never add other words.'
  : ''}
```

### Files Changed
- `supabase/functions/generate-carousel-images/index.ts`

---

## Feature #4: Branding Check Modal on Project Create

### Problem
When user creates carousel project without branding kit (no logo/handle), generated images show placeholder `@@brand` and missing watermark.

### User Flow
1. User clicks "Create Project" in CarouselHome
2. System checks `user_branding_kit` for `logo_url` AND `handle_text`
3. If missing → show modal:
   - Title: "Setup Branding Kit"
   - Description: "Brand logo dan handle akan digunakan sebagai watermark di carousel images (opacity 30%)"
   - Button 1: "Setup Branding Kit" → opens `/settings/branding` in **new browser tab** (`window.open()`)
   - Button 2: "Skip untuk sekarang" → save skip preference, proceed to create project
4. Skip preference → `localStorage` key `sparkfluence_carousel_branding_skip` = `'true'`
5. If preference saved, modal never shows again
6. After branding kit is set up (in other tab), user returns → next project create skips modal (because branding kit now exists)

### Implementation
```tsx
// CarouselHome.tsx — on Create Project click
const handleCreateProject = async () => {
  const skipBranding = localStorage.getItem('sparkfluence_carousel_branding_skip');

  if (!skipBranding && brandingKit && (!brandingKit.logoUrl || !brandingKit.handleText)) {
    setBrandingModal(true);
    return;
  }

  // Proceed with project creation
  await createProject();
};

// Modal "Setup Branding Kit" button
const handleSetupBranding = () => {
  window.open('/settings/branding', '_blank');
  setBrandingModal(false);
  // Don't auto-create project — user needs to come back and click Create again
};

// Modal "Skip" button
const handleSkipBranding = () => {
  localStorage.setItem('sparkfluence_carousel_branding_skip', 'true');
  setBrandingModal(false);
  createProject(); // Proceed without branding
};
```

### Files Changed
- `src/screens/CarouselImages/CarouselHome.tsx`

---

## Feature #5: Per-Slide Reference Keyword Auto-Pass to Configure

### Problem
`subjectReferences` (e.g., "Apple AirPod", "Grok logo") are detected per slide by `analyze-carousel-source` but only shown as a global alert banner. When user opens Configure modal, they have to manually search for reference images.

### Solution

**A) Pass subjectReferences to config modals:**
```tsx
// GenerateStep.tsx — when opening config modal
setConfigModal({
  slide,
  index: i,
  subjectRefs: slide.analysisData?.subjectReferences || []
});

// Config modal receives and uses refs
<CreatorConfigModal
  slide={configModal.slide}
  slideIndex={configModal.index}
  subjectRefs={configModal.subjectRefs}  // NEW
  onApply={...}
  onClose={...}
/>
```

**B) Pre-fill search in BRollConfigModal:**
```tsx
// BRollConfigModal.tsx — use subject reference name as initial search
useEffect(() => {
  if (subjectRefs.length > 0) {
    const firstRef = subjectRefs[0].name;
    setSearchQuery(firstRef);
    handleSearch(firstRef);
  }
}, []);
```

**C) Add stock search to CreatorConfigModal:**
Currently CreatorConfigModal only has a notes textarea. Add the same stock image search UI from BRollConfigModal (reference image search + keyword suggestions).

**D) Show reference badges per slide card:**
```tsx
// In slide card, below segment type badge
{slide.analysisData?.subjectReferences?.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {slide.analysisData.subjectReferences.map((ref, i) => (
      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
        {ref.name}
      </span>
    ))}
  </div>
)}
```

### Files Changed
- `src/screens/CarouselImages/steps/GenerateStep.tsx`
- `src/screens/CarouselImages/components/CreatorConfigModal.tsx`
- `src/screens/CarouselImages/components/BRollConfigModal.tsx`

---

## Feature #6: "Copy Source" Mode + Canvas Editor (New Tab)

### Problem
Some slides are screenshots of conversations/posts (tweets, IG comments, etc.) that should NOT be AI-regenerated. AI cannot accurately reproduce these. Only branding edits needed.

### User Flow
1. In GenerateStep, user sees slide with screenshot content
2. User toggles dropdown from "AI Generate" to **"Copy Source"**
3. Source image is copied as the generated image (no AI call)
4. An "Edit" button appears on the slide card
5. User clicks "Edit" → opens `/carousel-images/:projectId/edit/:slideId` in **new browser tab**
6. fabric.js canvas editor loads with the copied source image
7. User can:
   - Erase competitor branding (TECHNOLOGY badge, logos, handles)
   - Draw/fill over unwanted elements
   - Add text overlays (user's branding, page number)
   - Crop/resize
8. User clicks "Save" → uploads edited image to Supabase Storage → updates `carousel_slides.image_url`
9. User closes tab or switches back to GenerateStep tab
10. GenerateStep auto-refreshes via `visibilitychange` event → updated image appears

### Technical Design

**New Route:**
```tsx
// index.tsx
<Route path="/carousel-images/:projectId/edit/:slideId" element={<SlideCanvasEditor />} />
```

**SlideCanvasEditor Component:**
- Standalone page (no ChatLayout wrapper — clean canvas workspace)
- Loads slide data from `carousel_slides` by `slideId`
- fabric.js canvas with source image as background
- Tools: brush eraser, rectangle cover, text overlay, color picker
- Save → upload to `carousel-images` Supabase Storage bucket → update DB
- Uses existing Phase 5 EditStep fabric.js code as foundation (~1935 lines)

**GenerateStep Auto-Refresh:**
```typescript
// GenerateStep.tsx
useEffect(() => {
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      fetchSlides(); // Re-fetch from DB
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, []);
```

**Copy Source Logic:**
```typescript
// GenerateStep.tsx — when user toggles to "Copy Source"
const handleCopySource = async (slide: CarouselSlide) => {
  if (!slide.sourceImageUrl) return;

  // Copy source image URL as generated image
  await supabase.from('carousel_slides')
    .update({
      image_url: slide.sourceImageUrl,
      generation_method: 'copy_source'
    })
    .eq('id', slide.id);

  // Update local state
  setSlides(prev => prev.map(s => s.id === slide.id
    ? { ...s, imageUrl: slide.sourceImageUrl, generationMethod: 'copy_source' }
    : s
  ));
};
```

**Generation Method Values:**
- `'ai'` — AI-generated (default, current behavior)
- `'manual'` — User uploaded externally (current behavior)
- `'copy_source'` — Source copied, optionally edited in canvas (NEW)

### Files Changed
- `src/screens/CarouselImages/steps/GenerateStep.tsx`
- `src/screens/CarouselImages/components/SlideCanvasEditor.tsx` (NEW)
- `src/index.tsx` (new route)
- `src/types/carousel.ts` (add `'copy_source'` to generation method type)
- `supabase/functions/generate-carousel-images/index.ts` (skip `copy_source` slides)

---

## Implementation Order

### Phase A: Bug Fixes (can be parallel)
1. Fix #1: Page number → remove from AI prompt + add frontend overlay + fix totalSlides for other uses
2. Fix #1b: URL dedup → frontend change
3. Fix #2: Competitor branding → edge function change
4. Fix #3: SWIPE text → edge function change

### Phase B: Features (sequential)
4. Feature #4: Branding check modal → frontend only
5. Feature #5: Reference keyword auto-pass → frontend only

### Phase C: Copy Source + Canvas Editor
6. Feature #6: Copy Source toggle + canvas editor route → frontend + new component

### Deployment Notes
- Phase A requires `supabase functions deploy generate-carousel-images`
- Phase B & C are frontend-only (no deployment needed)
- Feature #6 reuses Phase 5 EditStep fabric.js code

---

## Data Integration Map

| Component | Data Source | Existing? | Notes |
|-----------|-----------|-----------|-------|
| Page number overlay | Frontend CSS overlay on slide card | New | Replaces AI-rendered page number, always accurate |
| totalSlides count | `carousel_slides` COUNT query | Yes | For emotional arc/visual rules (not page numbers) |
| URL dedup | `media_urls` array from Python scraper | Yes | Filter before insert |
| Brand removal | LLM prompt P5 | Yes | Strengthen existing rules |
| SWIPE text | LLM prompt P4 | Yes | Add emphasis |
| Branding check | `user_branding_kit` table | Yes | Via `useBrandingKit` hook |
| Skip preference | localStorage | New | `sparkfluence_carousel_branding_skip` |
| subjectReferences | `carousel_slides.analysis_data` JSONB | Yes | Already extracted by analyze |
| Copy Source mode | `carousel_slides.generation_method` | Extend | Add `'copy_source'` value |
| Canvas editor | Phase 5 fabric.js code | Partial | Reuse ~1935 lines from EditStep |
| Auto-refresh | `visibilitychange` DOM event | New | Re-fetch slides on tab focus |
| New tab edit | `/carousel-images/:projectId/edit/:slideId` route | New | Standalone canvas page |
