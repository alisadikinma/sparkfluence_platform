> **For Claude:** REQUIRED SKILL: Use gaspol-execute to implement this plan.
> **CRITICAL:** This plan specifies real integrations. During execution,
> NEVER substitute placeholders for real data sources without explicit
> user approval. If a data source doesn't exist yet, STOP and ask.
> **SUPERSEDES:** `2026-03-17-carousel-gen-plugin-integration.md` (incomplete, this is the full port)
> **REVISED:** 2026-03-18 after comprehensive audit of existing RAG files + edge functions

## Goal

Full port of the proven `ai-image-carousel-prompt-gen` plugin's intelligence into Sparkfluence's carousel image generation pipeline. Fixes 3 critical bugs (broken vision analysis, image URL persistence, dead RAG injection) and adds missing systems: prop interaction, emotional arc, subject reference enforcement, anti-repetition variants, and user-confirmed hook selection — matching the plugin's "user must confirm hook category" rule.

## Architecture Context — What Already Exists (CRITICAL)

**After audit, existing RAG files are 95% comprehensive (3,961 lines across 7 files):**

| File | Lines | Status | Already Contains |
|------|-------|--------|-----------------|
| `hook-science.ts` | 991 | **COMPLETE** | 5 hook categories + psychology + performance data + engagement hierarchy + topic→hook mapping |
| `visual-action-bank.ts` | 802 | **COMPLETE** | 5+8 expression libraries (eyes/mouth/head/hands/body/emotion) + 5 lighting presets + 15 camera variants (A/B/C) |
| `prompt-formulas.ts` | 1034 | **COMPLETE but UNUSED** | 5-paragraph structure + 12 rendering rules + 3 text overlay rules + subject reference system + hook scoring gate + headline formulas |
| `hook-formula-bank.ts` | 337 | **COMPLETE** | 52 formulas × 8 psychology categories + visual direction cross-map |
| `cinematography-lut.ts` | 208 | **COMPLETE** | 12 emotion→setup LUTs + 7 lighting patterns + 8 film stocks + atmospheres |
| `carousel-rebranding.ts` | 161 | **COMPLETE** | 5-step pipeline + 4 slide templates + style conversion matrix |
| `caption-copywriting.ts` | 428 | **COMPLETE** | 4 platform specs + caption formulas + CTA psychology (used by generate-carousel-captions) |

**`generate-carousel-images/index.ts` (511 lines) already has:**
- ✅ 5-paragraph Nano Banana Pro prompt building
- ✅ Per-slide-type specializations (HOOK/FORE/BODY/CTA with lighting, camera, expression rules)
- ✅ Text overlay rules (headline, brand icon, handle watermark, page number, swipe CTA)
- ✅ WOW quality gate scoring (8 elements) — **BUT only logged, NOT gated**
- ✅ Creator face reference handling (character_ref_png > avatar_url priority)
- ✅ Branding kit integration (accent color name conversion, logo, handle)
- ✅ RAG injection per slide type — **BUT `prompt-formulas.ts` imported and NEVER used (dead code)**

**What's ACTUALLY broken/missing:**

| Issue | Severity | Description |
|-------|----------|-------------|
| **Broken vision** | 🔴 Critical | `analyze-carousel-source` sends image URLs as text, not multimodal `image_url` content |
| **Image persistence** | 🔴 Critical | Generated images use fal.ai CDN URLs (expire), not Supabase Storage |
| **Dead RAG code** | 🟡 Major | `prompt-formulas.ts` imported but never injected into buildRagContext |
| **WOW not gated** | 🟡 Major | Score logged but 6/8 minimum not enforced (just a console.log) |
| **No prop system** | 🟡 Major | Plugin's 11a-11d prop interaction system completely missing |
| **No emotional arc** | 🟡 Major | No intensity→visual mapping per slide position |
| **No user hook confirm** | 🟡 Major | Plugin requires user to pick from 3 hook options before generation |
| **No subject ref enforcement** | 🟡 Major | Subject reference system documented in RAG but not enforced in code |
| **No anti-repetition** | 🟠 Medium | No A/B/C variant rotation for repeat topics |

## Tech Stack

- Deno Edge Functions (TypeScript, Supabase runtime)
- `callLLM()` unified caller (OpenRouter primary → Gemini fallback) from `apiKeyRotation.ts`
- fal.ai image generation API (nano-banana-edit A-ROLL, seedream-v4 B-ROLL)
- Supabase Storage `carousel-images` bucket (exists)
- React 18 + TypeScript frontend

---

## Data Integration Map

| Feature | Data Source | Hook/API | Exists? | Action |
|---------|-----------|----------|---------|--------|
| Multimodal vision | `callLLM()` with `image_url` content | `apiKeyRotation.ts` | Yes | Use existing (NOT currently used in analyze-carousel-source) |
| Hook category options | `hook-science.ts` topic→hook mapping | RAG knowledge file | Yes | Extract mapping, present 3 options to user |
| Expression library | `visual-action-bank.ts` | RAG knowledge file | Yes | Already complete (5+8 categories) |
| 52 hook formulas | `hook-formula-bank.ts` | RAG knowledge file | Yes | Already ported (337 lines) |
| Prompt rendering rules | `prompt-formulas.ts` | RAG knowledge file | Yes | **Wire into buildRagContext (currently dead code!)** |
| Prop interaction system | Plugin `hook-visual-library.md` §11 | RAG knowledge file | **No** | Create `prop-interaction-system.ts` |
| Emotional arc | Plugin SKILL.md | RAG knowledge file | **No** | Create `emotional-arc.ts` |
| Anti-repetition variants | Plugin `hook-visual-library.md` §7 | Edge function logic | **No** | Add variant rotation to generate-carousel-images |
| Subject ref detection | `prompt-formulas.ts` (rules exist) | Edge function logic | **No** | Add detection + enforcement in analyze-carousel-source |
| Image persistence | Supabase Storage `carousel-images` bucket | `supabase.storage` | Yes | Add download+upload step |
| Creator avatar | `user_profiles.character_ref_png` / `avatar_url` | Supabase query | Yes | Use existing |
| Branding kit | `user_branding_kit` table | Passed from frontend | Yes | Use existing |
| Hook selection UI | Frontend GenerateStep | React component | **No** | Add 3-option hook selector before generation |
| WOW gate enforcement | `scoreWOWGate()` in generate-carousel-images | Edge function logic | Partial | Already scores — add minimum 6/8 enforcement |

---

## Phase A: New RAG Knowledge Files — Prop System + Emotional Arc

**Estimated time:** 25 minutes

**Files:**
- Create: `supabase/functions/_shared/knowledge/carousel/prop-interaction-system.ts`
- Create: `supabase/functions/_shared/knowledge/carousel/emotional-arc.ts`

### Steps:

#### A1: Create `prop-interaction-system.ts` (NEW)

Port from plugin `references/hook-visual-library.md` sections 11a-11d. Export as `PROP_INTERACTION_SYSTEM_KNOWLEDGE` template literal containing:

**11a. Topic → Prop Bank** (12 topics × 2 prop types):
- Topic-Related props: visually signal subject matter
- Random Absurd props: zero connection — pure WTF factor

Example (Finance):
- Topic-Related: golden coin, stock chart, calculator, credit card, cash stack
- Random Absurd: raw fish, rubber duck, traffic cone

**11b. Prop × Visual Action Interaction Matrix** (16 actions × interaction style):
How creator physically engages with prop per visual action type.

**11c. Hook Category → Prop Selection Rule:**
| Hook Category | Prop Type | Why |
|---|---|---|
| Visual Shock | Random Absurd | Maximum WTF — topic only from headline |
| Negative Bias | Topic-Related | Warning object reinforces danger |
| Curiosity Gap | Topic-Related | Visual clue teases — connect prop + headline |
| Relatability | Topic-Related | Everyday object = identification |
| Speed & Value | Topic-Related | Tool/product shown = immediate value |

**11d. Prop Selection Decision Tree** (5-step sequence)

Read plugin file: `D:\Projects\claude-plugin\ai-image-carousel-prompt-gen\references\hook-visual-library.md` (section 11a-11d)

#### A2: Create `emotional-arc.ts` (NEW)

Export as `EMOTIONAL_ARC_KNOWLEDGE` template literal:

1. **Roller Coaster Pattern** — intensity mapping per slide position:
   - Slide 1 (HOOK): 6/6 — maximum peak, shock/surprise
   - Slide 2 (FORESHADOW): 3/6 — strategic dip for re-engagement
   - Slides 3-4 (BODY BUILD): 2-3/6 — subtle informational rise
   - Slides 5-7 (MINI-HOOK + CLIMAX): 4-5/6 — surprise re-engagement
   - Last slide (CTA): 4/6 — warm invitation, not aggressive

2. **Intensity → Visual Parameter Mapping:**
   | Intensity | Lighting Ratio | Saturation | Atmosphere Density | Expression Energy |
   |-----------|---------------|------------|-------------------|-------------------|
   | 1-2 (low) | 2:1 soft | Natural | Minimal | Calm/neutral |
   | 3-4 (mid) | 3:1 | Slightly boosted | Light haze | Engaged/curious |
   | 5-6 (peak) | 4:1-6:1 dramatic | Peak saturation | Heavy volumetric | Exaggerated/intense |

3. **Mini-Hook Re-Engagement Rule:** Slide at ~60-70% position (slide 5-7 of 10) gets intensity bump to 4-5/6 to prevent mid-carousel drop-off.

Read plugin file: `D:\Projects\claude-plugin\ai-image-carousel-prompt-gen\skills\carousel-gen\SKILL.md` (emotional arc section)

**Verification:**
- [ ] `prop-interaction-system.ts` exports `PROP_INTERACTION_SYSTEM_KNOWLEDGE` as template literal
- [ ] Contains 12 topic prop banks, 16 action interactions, 5 hook→prop rules, decision tree
- [ ] `emotional-arc.ts` exports `EMOTIONAL_ARC_KNOWLEDGE` as template literal
- [ ] Contains roller coaster pattern + intensity→visual mapping table
- [ ] No placeholder/TODO comments
- [ ] Both files importable in Deno (`import { X } from './filename.ts'`)

---

## Phase B: Fix `analyze-carousel-source` — TRUE Multimodal Vision + Subject Ref Detection

**Estimated time:** 25 minutes

**Files:**
- Modify: `supabase/functions/analyze-carousel-source/index.ts`

### Steps:

#### B1: Fix multimodal image_url content in LLM messages

Current code (BROKEN — sends URLs as text strings):
```typescript
// BEFORE (line ~63):
const imageDescriptions = image_urls.map((url, i) => `Slide ${i + 1}: ${url}`).join('\n');
```

Change to send actual images for vision analysis:
```typescript
// AFTER (multimodal vision):
const userContent = [];
for (const [i, url] of image_urls.entries()) {
  userContent.push({ type: 'image_url', image_url: { url } });
  userContent.push({ type: 'text', text: `Above is slide ${i + 1}.` });
}
userContent.push({ type: 'text', text: `Analyze these ${image_urls.length} carousel slides...` });
```

`callLLM()` auto-detects `image_url` → selects `gemini-2.5-flash` (vision-capable). `toGeminiParts()` fetches images server-side → base64 `inlineData` (works when IG CDN blocks data center IPs).

#### B2: Enhance output schema with new fields

Add to the LLM system prompt's per-slide output specification:

```json
{
  "slideIndex": 0,
  "topic": "detailed topic description",
  "textContent": ["ALL visible text lines (OCR)"],
  "layout": "full|split-left|split-right|text-overlay|minimal|graphic",
  "visualStyle": { "dominantColors": [], "mood": "", "composition": "" },
  "subjectDetection": {
    "hasCreator": true,
    "hasProduct": false,
    "hasBrandLogo": true,
    "brandNames": ["Google"],
    "description": "creator holding phone"
  },
  "contentCategory": "tech|beauty|finance|food|fitness|lifestyle|business|education|health|travel|entertainment|other",
  "factualClaims": ["any statistics, numbers, data claims found"],
  "emotionalTone": "urgent|curious|confident|warm|shocked|playful",
  "subjectReferences": [
    { "type": "product|brand_logo|source_logo|unique_object", "name": "iPhone 16 Pro", "needsReference": true }
  ]
}
```

The `subjectReferences` array implements the plugin's 4-category auto-detection system:
- (a) Specific product models (iPhone 16, Galaxy S25) — AI generates wrong design without ref
- (b) Company/brand logos — AI generates wrong logo without ref
- (c) Source/publication logos (SIPRI, Jane's) — credibility in-image
- (d) Unique objects (cyborg cockroach) — no training data

#### B3: Remove `geminiFirst: true` — let callLLM auto-detect multimodal

When messages contain `image_url`, `callLLM()` auto-selects vision model. Remove manual `geminiFirst` option. Keep `temperature: 0.3` for consistent analysis.

**Verification:**
- [ ] `callLLM()` receives messages with `image_url` content type (not text URLs)
- [ ] LLM response includes `contentCategory`, `emotionalTone`, `subjectReferences` per slide
- [ ] Vision analysis correctly identifies what's IN the source images
- [ ] Subject reference detection flags products/logos/objects needing reference images
- [ ] ENRICH mode still works (merges with existing data)
- [ ] FULL mode still works
- [ ] tsc --noEmit passes

---

## Phase C: Hook Selection UI — User Confirms Before Generation

**Estimated time:** 30 minutes

**Files:**
- Modify: `supabase/functions/generate-carousel-images/index.ts` (add hook suggestion endpoint)
- Modify: `src/screens/CarouselImages/steps/GenerateStep.tsx` (add hook selection UI)
- Modify: `src/types/carousel.ts` (extend types)

### Steps:

#### C1: Add `suggest-hook-options` action to `generate-carousel-images`

Add a new action mode that returns 3 hook options without generating images:

```typescript
if (action === 'suggest_hooks') {
  // Read analysis_data from carousel_slides
  const contentCategory = slides[0]?.analysis_data?.contentCategory || 'lifestyle';
  const emotionalTone = slides[0]?.analysis_data?.emotionalTone || 'curious';

  // Use Topic→Hook Category mapping from hook-science.ts
  const hookOptions = suggestHookOptions(contentCategory, emotionalTone);

  return new Response(JSON.stringify({
    success: true,
    data: { hookOptions }  // 3 options: PRIMARY, SECONDARY, WILDCARD
  }));
}
```

Each option returns:
```typescript
{
  rank: 'PRIMARY' | 'SECONDARY' | 'WILDCARD',
  hookCategory: string,      // visual-shock | negative-bias | curiosity-gap | relatability | speed-value
  visualAction: string,      // auto-paired from hook category
  sampleHeadline: string,    // example headline using this category
  vibe: string,              // 2-3 sentence creative pitch describing the visual concept
  psychology: string         // why this category works for this content
}
```

#### C2: Extend types in `carousel.ts`

```typescript
export interface HookOption {
  rank: 'PRIMARY' | 'SECONDARY' | 'WILDCARD';
  hookCategory: string;
  visualAction: string;
  sampleHeadline: string;
  vibe: string;
  psychology: string;
}

// Add to SlideAnalysis
export interface SlideAnalysis {
  // ... existing fields ...
  contentCategory?: string;
  factualClaims?: string[];
  emotionalTone?: string;
  subjectReferences?: { type: string; name: string; needsReference: boolean }[];
  autoDecisions?: {
    hookCategory?: string;
    visualAction?: string;
    cameraVariant?: 'A' | 'B' | 'C';
    headlineScore?: number;
    headlineRewritten?: boolean;
    rewrittenHeadline?: string;
    foreshadowType?: string;
    ctaType?: string;
    emotionalArc?: { intensity: number; beat: string };
    costume?: string;
    propInteraction?: string;
    variantRotation?: 'A' | 'B' | 'C';
  };
}
```

#### C3: Add hook selection UI in GenerateStep

After analysis completes but BEFORE "Generate All" button, show a hook selection step:

- 3 cards side-by-side (PRIMARY=emerald, SECONDARY=amber, WILDCARD=cyan)
- Each card shows: hook category name, visual action, sample headline, vibe description
- User clicks to select → stores in component state
- Selected hook category passed to `generate-carousel-images` as `hookCategory` param
- "Generate All" button only enabled after hook selection

Design follows Sparkfluence system:
```tsx
// Card
<div className={`bg-neutral-900 border-2 rounded-xl p-4 cursor-pointer transition-all
  ${selected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-neutral-800 hover:border-neutral-600'}`}>
  <span className="text-xs font-medium text-emerald-400">{option.rank}</span>
  <h4 className="text-sm font-semibold text-neutral-200">{option.hookCategory}</h4>
  <p className="text-xs text-neutral-400 mt-1">{option.vibe}</p>
</div>
```

#### C4: Add subject reference alerts

If `analysis_data.subjectReferences` contains items with `needsReference: true`, show an alert banner above the hook selection:

```
⚠️ Reference images recommended for accuracy:
- iPhone 16 Pro (product) — AI may generate wrong design
- Google logo (brand) — AI may generate wrong logo
[Upload References] or [Skip — use AI's best guess]
```

Upload stores to `carousel_slides.analysis_data.referenceImages[]` and passes URLs to fal.ai `image_urls` array.

**Verification:**
- [ ] `suggest_hooks` action returns 3 valid options (PRIMARY/SECONDARY/WILDCARD)
- [ ] Hook options based on `contentCategory` from Phase B analysis
- [ ] GenerateStep shows 3 hook cards after analysis
- [ ] User must select a hook before "Generate All" is enabled
- [ ] Selected hook category passed to generation endpoint
- [ ] Subject reference alerts shown when `needsReference: true`
- [ ] tsc --noEmit passes

---

## Phase D: Enhance Prompt Builder — Wire Dead Code + New Systems

**Estimated time:** 35 minutes

**Files:**
- Modify: `supabase/functions/generate-carousel-images/index.ts`

### Steps:

#### D1: Wire `prompt-formulas.ts` into `buildRagContext()` (FIX DEAD CODE)

`PROMPT_FORMULAS_KNOWLEDGE` is imported (line ~15) but never used in `buildRagContext()`. Add it:

```typescript
function buildRagContext(slideType: string, hookCategory: string): string {
  const parts: string[] = [];

  // ... existing slide-type-specific injections ...

  // ADD: Prompt rendering rules (ALWAYS — prevents Nano Banana rendering artifacts)
  if (PROMPT_FORMULAS) {
    // Extract rendering rules section (first ~2000 chars) — 12 rules + text overlay enforcement
    parts.push(`=== PROMPT RENDERING RULES ===\n${PROMPT_FORMULAS.slice(0, 2500)}`);
  }

  // ... existing cinematography + rebranding injections ...
}
```

#### D2: Import and inject new RAG files

```typescript
import { PROP_INTERACTION_SYSTEM_KNOWLEDGE as PROP_SYSTEM } from '../_shared/knowledge/carousel/prop-interaction-system.ts';
import { EMOTIONAL_ARC_KNOWLEDGE as EMOTIONAL_ARC } from '../_shared/knowledge/carousel/emotional-arc.ts';
```

Add to `buildRagContext()`:
- HOOK slides: inject prop interaction rules (hook→prop selection + interaction style)
- ALL slides: inject emotional arc (intensity for this slide position)

#### D3: Use AI decisions from hook selection in prompt building

Read the user-selected `hookCategory` from request params. Use it to:
1. Extract SPECIFIC expression profile from `visual-action-bank.ts` for this category (not all 5)
2. Extract SPECIFIC lighting preset for this category
3. Select camera variant (A/B/C rotation — see D5)
4. Select costume from costume library based on `contentCategory` + `hookCategory`
5. Select prop + interaction style from `prop-interaction-system.ts`

Update `getVisualRulesForSlideType()` to accept `hookCategory` param and inject category-specific specs.

#### D4: Add emotional arc intensity to visual rules

In `getVisualRulesForSlideType()`, use `mapEmotionalArc(slideIndex, totalSlides)` to adjust:
- Lighting ratio (intensity 5-6 → 4:1-6:1, intensity 1-2 → 2:1)
- Color saturation (peak at HOOK, muted at FORE, rising through BODY)
- Atmosphere density (heavy volumetric at peak, minimal at low)
- Expression energy description

#### D5: Add anti-repetition variant rotation

Track which variant (A/B/C) was used in previous carousels for same topic:

```typescript
// Query last variant used for this content category
const { data: lastProject } = await supabase
  .from('carousel_slides')
  .select('analysis_data')
  .eq('slide_type', 'HOOK')
  .not('analysis_data->autoDecisions->variantRotation', 'is', null)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const lastVariant = lastProject?.analysis_data?.autoDecisions?.variantRotation || 'C';
const nextVariant = lastVariant === 'A' ? 'B' : lastVariant === 'B' ? 'C' : 'A';
```

Use `nextVariant` to select camera variant from `visual-action-bank.ts` camera angle bank.

#### D6: Enforce WOW minimum 6/8 gate

Currently `scoreWOWGate()` just logs. Add enforcement:

```typescript
const wowScore = scoreWOWGate(imagePrompt);
if (wowScore < 6) {
  console.warn(`[generate-carousel-images] WOW ${wowScore}/8 < 6 minimum. Requesting re-generation...`);
  // Re-call LLM with feedback: "Score only X/8. Missing: [list missing elements]. Rewrite to include all 8."
  const retryResult = await callLLM(supabase, [
    { role: 'system', content: promptSystem },
    { role: 'user', content: `Previous prompt scored ${wowScore}/8. Missing elements: ${getMissingElements(wowScore)}. Rewrite to include ALL 8 cinematic elements.` },
    { role: 'assistant', content: imagePrompt },
    { role: 'user', content: 'Rewrite the prompt to include all missing cinematic elements while keeping the same subject and composition.' }
  ], { temperature: 0.7 });

  if (retryResult.success) {
    imagePrompt = retryResult.content;
    wowScore = scoreWOWGate(imagePrompt);
  }
}
```

Max 1 retry. If still < 6/8 after retry, proceed with warning (don't block generation).

#### D7: Store all decisions in `carousel_slides.analysis_data`

After all auto-selection, update each slide's `analysis_data` JSONB:

```json
{
  "autoDecisions": {
    "hookCategory": "visual-shock",
    "visualAction": "objek-absurd",
    "cameraVariant": "B",
    "headlineScore": 4,
    "headlineRewritten": false,
    "foreshadowType": "steps_tease",
    "ctaType": "polarize",
    "emotionalArc": { "intensity": 6, "beat": "SHOCK" },
    "costume": "dark charcoal hoodie, joggers",
    "propInteraction": "holding rubber duck with deadpan expression",
    "variantRotation": "B",
    "wowScore": 7,
    "contentCategory": "tech"
  }
}
```

**Verification:**
- [ ] `prompt-formulas.ts` now injected in buildRagContext (no longer dead code)
- [ ] Prop interaction system injected for HOOK slides
- [ ] Emotional arc intensity affects lighting/saturation/atmosphere per slide
- [ ] Anti-repetition rotates A→B→C across sessions for same content category
- [ ] WOW gate enforces 6/8 minimum with 1 retry
- [ ] All decisions stored in `analysis_data.autoDecisions` JSONB
- [ ] Category-specific expression/lighting/camera used (not generic)
- [ ] tsc --noEmit passes

---

## Phase E: Image Persistence — Download to Supabase Storage

**Estimated time:** 15 minutes

**Files:**
- Modify: `supabase/functions/generate-carousel-images/index.ts` (add image download+upload after fal.ai response)

### Steps:

#### E1: Add `persistImageToStorage()` function

After fal.ai returns the generated image URL, download it and upload to Supabase Storage:

```typescript
async function persistImageToStorage(
  supabase: SupabaseClient,
  falImageUrl: string,
  projectId: string,
  slideIndex: number
): Promise<string> {
  // 1. Download image from fal.ai CDN
  const imageResponse = await fetch(falImageUrl);
  const arrayBuffer = await imageResponse.arrayBuffer();

  // 2. Upload to Supabase Storage
  const fileName = `${projectId}/slide-${slideIndex}-${Date.now()}.png`;
  const { error } = await supabase.storage
    .from('carousel-images')
    .upload(fileName, new Uint8Array(arrayBuffer), {
      contentType: 'image/png',
      upsert: true
    });

  if (error) throw error;

  // 3. Get public URL
  const { data: urlData } = supabase.storage
    .from('carousel-images')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
```

#### E2: Replace CDN URL save with persistent URL

```typescript
// BEFORE (line ~307):
await supabase.from('carousel_slides').update({ image_url: generatedImageUrl, ... });

// AFTER:
let persistentUrl = generatedImageUrl; // fallback to CDN
try {
  persistentUrl = await persistImageToStorage(supabase, generatedImageUrl, projectId, slide.slide_index);
} catch (err) {
  console.warn(`[generate-carousel-images] Storage upload failed, using CDN URL: ${err.message}`);
}
await supabase.from('carousel_slides').update({ image_url: persistentUrl, ... });
```

**Verification:**
- [ ] Generated images uploaded to `carousel-images` Supabase Storage bucket
- [ ] `carousel_slides.image_url` contains Supabase Storage URL (not fal.ai CDN)
- [ ] Images survive fal.ai CDN purge (persistent)
- [ ] File path format: `{projectId}/slide-{index}-{timestamp}.png`
- [ ] Fallback to CDN URL on upload failure (with console warning)
- [ ] Old images overwritten on regeneration (upsert: true)

---

## Phase F: Frontend — AI Decision Badges + Headline Score

**Estimated time:** 15 minutes

**Files:**
- Modify: `src/screens/CarouselImages/steps/GenerateStep.tsx`

### Steps:

#### F1: Display AI decision badges on generated slide cards

After generation, each slide card shows a small info line below the image:

- HOOK: `Visual Shock · Objek Absurd · Cam B · WOW 7/8`
- FORE: `Steps Tease · Intensity 3/6`
- BODY: `Intensity 3/6 · No Face`
- CTA: `Polarize · Intensity 4/6`

Read from `slide.analysis_data.autoDecisions`. Use muted text (`text-xs text-neutral-500`).

#### F2: Show headline score indicator

If headline was scored via hook scoring gate, show:
- Score ≥ 3/5: green badge `Score 4/5`
- Score < 3/5 + rewritten: amber badge `Improved 2/5 → 4/5`

#### F3: Show WOW score per slide

Small badge on generated image corner:
- WOW 7-8/8: emerald badge
- WOW 6/8: amber badge
- WOW < 6/8: red badge (should be rare after D6 enforcement)

**Verification:**
- [ ] AI decision badges render on each generated slide card
- [ ] Headline score indicator shows when applicable
- [ ] WOW score badge visible on generated images
- [ ] No UI regressions in existing GenerateStep functionality
- [ ] tsc --noEmit passes

---

## Phase G: Integration Test — End-to-End Carousel Generation

**Estimated time:** 15 minutes

### Steps:

#### G1: Test with real IG carousel import

1. Import a real carousel via IG URL in SourceStep
2. Proceed to GenerateStep
3. Verify: analyze-carousel-source uses multimodal vision (check edge function logs for `image_url` content)
4. Verify: `contentCategory`, `emotionalTone`, `subjectReferences` in analysis response
5. Verify: 3 hook options displayed after analysis
6. Select a hook option
7. Click "Generate All"
8. Verify: Generated images are relevant to topic (not generic)
9. Verify: Images persist after page refresh (Supabase Storage URLs, not fal.ai CDN)
10. Verify: HOOK has category-specific expression + lighting + prop interaction
11. Verify: FORE has visual continuity with HOOK (same wardrobe)
12. Verify: CTA has type-specific composition
13. Verify: AI decision badges display on each slide card

#### G2: Verify WOW quality gate

Check prompts (via "View Prompt" button on each slide):
- All 8 cinematic elements present
- Score 6/8+ for each prompt
- No rendering artifacts (no literal "30%" or "MANDATORY" in prompt text)
- Prompt-formulas rendering rules applied (no ALL CAPS instructions, no raw %)

#### G3: Test headline scoring

Import a carousel with a weak headline (no question, no power word):
- Verify headline score shown on card
- If auto-rewrite fired: verify improved score badge

#### G4: Test anti-repetition

Generate carousel for same topic twice:
- Verify camera variant rotated (A→B or B→C)
- Verify `variantRotation` stored in `analysis_data.autoDecisions`

#### G5: Test subject reference detection

Import carousel mentioning specific product (e.g., iPhone 16):
- Verify subject reference alert banner appears
- Verify `subjectReferences` array in analysis data

**Verification:**
- [ ] Full pipeline: import → analyze (vision) → hook select → generate → persist
- [ ] Generated images match carousel topic
- [ ] Images survive page refresh (persistent URLs)
- [ ] WOW scores 6/8+ for all prompts
- [ ] Hook selection UI works (3 options → select → generate)
- [ ] AI decision badges display correctly
- [ ] Anti-repetition variant rotation works
- [ ] Subject reference detection flags relevant items
- [ ] No console errors or 500s in edge functions

---

## Phase H: Update CLAUDE.md

**Estimated time:** 10 minutes

**Files:**
- Modify: `CLAUDE.md`

### Steps:

#### H1: Update Knowledge Files Index

Add new files to table:
- `prop-interaction-system.ts` — Topic→prop banks, prop×action matrix, hook→prop rules
- `emotional-arc.ts` — Roller coaster intensity mapping per slide position

Note `prompt-formulas.ts` now actively used (was dead code).

#### H2: Update Carousel Image Feature section

- Update `analyze-carousel-source`: "Stage 1: `callLLM()` multimodal vision → deep per-slide analysis with topic, content category, brand detection, emotional tone, subject reference detection"
- Update `generate-carousel-images`: "Stage 2: User-confirmed hook selection + RAG knowledge injection (7 files) + prop interaction + emotional arc + anti-repetition variants + fal.ai image gen + Supabase Storage persistence + WOW 6/8 gate enforcement"
- Add to Important Patterns: hook selection flow, image persistence, subject reference system

#### H3: Update Debugging Checklist

Add entries:
- `Carousel generated image not relevant to topic` → Check analyze-carousel-source uses multimodal vision. Verify contentCategory extraction.
- `Carousel image disappears after refresh` → Images now persisted to Supabase Storage. Check carousel-images bucket.
- `WOW score < 6 after retry` → Check prompt-formulas.ts is injected in buildRagContext. Was dead code before this fix.
- `Hook selection not showing` → analyze-carousel-source must return contentCategory. Check vision analysis.

**Verification:**
- [ ] Knowledge Files Index updated with new files
- [ ] Carousel section reflects new architecture (hook selection, persistence, WOW gate)
- [ ] Debugging Checklist includes new entries
- [ ] `prompt-formulas.ts` noted as actively used (was dead code)

---

## Execution Summary

| Phase | Description | Est. Time | Dependencies |
|-------|------------|-----------|-------------|
| A | New RAG files — Prop system + Emotional arc | 25 min | None |
| B | Fix analyze-carousel-source — Multimodal vision + Subject ref detection | 25 min | None |
| C | Hook Selection UI — User confirms before generation | 30 min | Phase B (needs contentCategory from analysis) |
| D | Enhance Prompt Builder — Wire dead code + new systems | 35 min | Phase A + C (needs RAG files + hook selection) |
| E | Image Persistence — Supabase Storage | 15 min | None |
| F | Frontend — AI decision badges + scores | 15 min | Phase D (needs autoDecisions data) |
| G | Integration Test — End-to-end | 15 min | All phases |
| H | Update CLAUDE.md | 10 min | All phases |

**Parallel opportunities:**
- Phase A + B + E can run in parallel (no dependencies)
- Phase C depends on B (needs contentCategory)
- Phase D depends on A + C (needs RAG files + hook category)
- Phase F depends on D (needs autoDecisions)
- Phase G + H depend on all

**Total estimated time:** ~2.5 hours (reduced from 3.5h — no unnecessary RAG re-porting)

---

## Key Design Decisions

1. **User confirms hook category** (matches plugin rule) — AI suggests 3 options (PRIMARY/SECONDARY/WILDCARD), user picks before generation. No auto-selection.

2. **Existing RAG files NOT modified** — already 95% complete (3,961 lines). Only 2 NEW files added (prop system + emotional arc).

3. **`prompt-formulas.ts` wired into buildRagContext** — was imported but never used (dead code). Now injected for ALL slide types.

4. **WOW gate enforced with 1 retry** — if < 6/8, LLM retries once with missing element feedback. Still proceeds after retry (doesn't block generation).

5. **Anti-repetition via DB query** — checks last variant used for same content category, rotates A→B→C. Simple and stateless.

6. **Image persistence with CDN fallback** — upload to Supabase Storage, fall back to fal.ai CDN URL on failure. Never loses the image.

7. **Subject reference detection is advisory** — shows alert banner but doesn't block generation. User can upload or skip.
