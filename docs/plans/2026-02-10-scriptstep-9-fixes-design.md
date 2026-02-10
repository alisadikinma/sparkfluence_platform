# ScriptStep 9 Fixes — Design Document

**Date:** 2026-02-10
**Branch:** `feat/v3-chat-redesign`
**Status:** Approved

---

## Overview

9 fixes/features for the Workspace ScriptStep to move from mock-data prototype to functional UI.

---

## Fix 1: Connect ScriptStep to Real Data (Root Fix)

**Problem:** ScriptStep renders MOCK_SEGMENTS because Workspace.tsx doesn't pass segment data from WorkspaceContext.

**Solution:** In `Workspace.tsx`, pass all script state to `<ScriptStep>`:

```tsx
<ScriptStep
  segments={state.segments}
  hookOptions={state.hookOptions}
  scoreBreakdown={state.qualityReport}
  selectedHook={state.selectedHook}
  scriptVersions={state.scriptVersions}
  selectedVersion={state.selectedVersion}
  additionalNotes={state.additionalNotes}
  scriptConfirmed={state.scriptConfirmed}
  isGeneratingScript={state.isGeneratingScript}
  focusedSegmentId={state.focusedSegmentId}
  onFocusSegment={(id) => dispatch({ type: 'SET_FOCUSED_SEGMENT', segmentId: id })}
  onEditSegment={(id, field, value) => dispatch({ type: 'EDIT_SEGMENT', segmentId: id, field, value })}
  onToggleSegment={(id) => dispatch({ type: 'TOGGLE_SEGMENT', segmentId: id })}
  onAdjustDuration={(id, dur) => dispatch({ type: 'ADJUST_DURATION', segmentId: id, duration: dur })}
  onSelectHook={(hookId) => dispatch({ type: 'SELECT_HOOK', hookId })}
  onSelectVersion={(ver) => dispatch({ type: 'SELECT_VERSION', version: ver })}
  onConfirmScript={() => dispatch({ type: 'CONFIRM_SCRIPT' })}
  onUnconfirmScript={() => dispatch({ type: 'UNCONFIRM_SCRIPT' })}
  onMergeSegments={(id1, id2) => dispatch({ type: 'MERGE_SEGMENTS', segmentId1: id1, segmentId2: id2 })}
  onSplitSegment={(id, idx) => dispatch({ type: 'SPLIT_SEGMENT', segmentId: id, splitAtWordIndex: idx })}
/>
```

ScriptStep already accepts these as optional props with mock fallback — real data overrides mocks.

**Files:** `src/screens/Workspace/Workspace.tsx`

---

## Fix 2: Header Title Default to Topic Name

**Problem:** EditableTitle shows "Untitled" because `state.title` starts empty.

**Solution:** Change initial display value:
```tsx
// Before
initialValue={state.title || 'Untitled'}

// After
initialValue={state.topic || state.title || 'Untitled'}
```

When a session is created from ChatHome, `topic` is set from user input.

**Files:** `src/screens/Workspace/Workspace.tsx`

---

## Fix 3: Merged Progress Bar (Single Smart Bar)

**Problem:** Two progress bars per segment card — word density + speech timing. Confusing.

**Solution:** Merge into one bar with combined label:

```
┌─────────────────────────────────────────────────┐
│ ████████████████████████░░░░░░░░  11/14 words • 5.1s / 8s │
└─────────────────────────────────────────────────┘
```

**Visual rules:**
- Fill = `wordCount / maxWords` (percentage)
- Color: emerald (≤70%), amber (71-90%), red (>90%)
- Right label: `{words}/{maxWords} words • {speechSec}s / {duration}s`
- Speech time = `words / (130/60)` (already in code)
- If speech > duration → bar turns red, warning icon appears

**Remove:** The second waveform/speech-only bar.

**Files:** `src/screens/Workspace/steps/ScriptStep.tsx`

---

## Fix 4: Duration Options 3s / 5s / 8s

**Problem:** DURATION_OPTIONS hardcoded `[5,6,7,8]`, max is 8s.

**Solution:** Replace with `[3, 5, 8]`:

| Duration | Max Words | Formula |
|----------|-----------|---------|
| 3s | 5 | Math.floor(130/60 × 3 × 0.80) |
| 5s | 9 | Math.floor(130/60 × 5 × 0.80) + 1 |
| 8s | 14 | Math.floor(130/60 × 8 × 0.80) |

Duration dropdown label: `3s (5w) | 5s (9w) | 8s (14w)`

Also update `WorkspaceContext.ADJUST_DURATION` formula to match.

**Files:** `src/screens/Workspace/steps/ScriptStep.tsx`, `src/contexts/WorkspaceContext.tsx`

---

## Fix 5: Split & Merge — Full Implementation

### Split
1. User clicks "Split" on a segment card
2. Opens inline popover showing segment script with clickable word boundaries
3. User clicks between words to set split point
4. Dispatches `SPLIT_SEGMENT(segmentId, wordIndex)`
5. Result:
   - Two new segments replace original
   - Duration pro-rated by word count ratio (min 3s each)
   - MaxWords recalculated per new duration
   - SegmentType: both inherit parent (BODY-1 → BODY-1 + BODY-2)
   - All segments renumbered
6. **Restrictions:** Cannot split HOOK or LOOP-END (buttons hidden)

### Merge
1. User clicks "Merge ↓" on a segment card
2. Merges with next segment below
3. Combined:
   - script = `seg1.script + ' ' + seg2.script`
   - visualDirection = `seg1.visualDirection + '; ' + seg2.visualDirection`
   - duration = sum (capped at 8s)
   - type = first segment's type
4. All segments renumbered
5. **Restrictions:**
   - Cannot merge HOOK with anything
   - Cannot merge into LOOP-END
   - Cannot merge different shotTypes (CREATOR + B-ROLL)
   - Button hidden on last segment

### Reducer Logic
The `MERGE_SEGMENTS` and `SPLIT_SEGMENT` actions already exist in WorkspaceContext with correct logic. ScriptStep just needs to call the dispatch handlers instead of console.log.

**Files:** `src/screens/Workspace/steps/ScriptStep.tsx`

---

## Fix 6: Generate V2 Modal with Notes + Sliders

**Problem:** Additional notes textarea is inline at bottom. Should be a modal triggered by "Generate V2".

**Solution:** Modal dialog on "Generate V2" / "Generate V3" click:

```
┌─ Generate Version 2 ──────────────────────┐
│                                            │
│  Additional Notes                          │
│  ┌────────────────────────────────────┐    │
│  │ (textarea, 4 rows)                 │    │
│  └────────────────────────────────────┘    │
│                                            │
│  Script DNA Tuning                         │
│  Hook Aggressiveness  ━━━━━●━━━━  7/10    │
│  Controversy Level    ━━●━━━━━━━  4/10    │
│  Humor Density        ━━━━●━━━━━  5/10    │
│  Pacing               ━━━━━━●━━━  7/10    │
│  Emotional Intensity  ━━━●━━━━━━  4/10    │
│                                            │
│           [Cancel]  [Generate V2]          │
└────────────────────────────────────────────┘
```

**Behavior:**
- Textarea for freeform notes → sent as `additional_context` to LLM
- TuningSliders reused from right wing component (same 5 sliders)
- Slider values pre-filled from `state.sliderValues`
- On submit:
  1. Dispatch `SET_GENERATING_SCRIPT`
  2. Call `generate-script` edge function with: V1 segments + notes + slider DNA
  3. On success: dispatch `ADD_SCRIPT_VERSION` + auto-switch to new tab
- Loading: button shows spinner, modal stays open
- Max 3 versions total

**Files:** `src/screens/Workspace/steps/ScriptStep.tsx` (new `GenerateVersionModal` component)

---

## Fix 7: Scroll Fix

**Problem:** Mouse scroll doesn't work in center column. Known Tailwind overflow-hidden gotcha.

**Solution:**
- Center column: `overflow-hidden` → `overflow-y-auto`
- Add `min-h-0` to flex child (enables flex shrink + scroll)
- Left/right wings already have `overflow-y-auto`

**Files:** `src/screens/Workspace/Workspace.tsx`

---

## Fix 8: Version Tabs V1 | V2 | V3

**Problem:** Version system exists in state but no tab UI.

**Solution:** Horizontal tab bar above segment list:

```
┌──────────────────────────────────────────────────────────────┐
│ ● V1 88%  │  V2 --  │  V3 --  │     ⟳ Generate V2  │  ✓ Confirm │
└──────────────────────────────────────────────────────────────┘
```

**Visual rules:**
- Active tab: emerald bg + white text
- Inactive (generated): ghost/outline, clickable
- Inactive (not generated): `--`, not clickable, dimmed
- Score badge next to version label (e.g. `V1 88%`)
- "Compare" button appears when 2+ versions exist (opens ScriptComparison)
- Clicking tab dispatches `SELECT_VERSION` → swaps all segments + qualityReport
- When `scriptConfirmed`: tabs visible, "Generate V2" hidden

**Files:** `src/screens/Workspace/steps/ScriptStep.tsx` (new `VersionTabs` sub-component)

---

## Fix 9: AI Script Coach & Script Intelligence — Knowledge Integration

### Knowledge Files Used
- `11-hook-library-2026.ts` → HOOK_LIBRARY, HOOK_CATEGORY_META (5 hook categories + 100 templates)
- `12-scoring-engine.ts` → scoreSegment, detectPowerWords, SCORING_RULES, calculateRetentionCurve, RETENTION_MODEL, WORD_DENSITY, hasQuestion, hasNumber, hasNegativeFrame, hasForeshadow, hasCtaAction, hasFirstPersonCta
- `13-emotion-lexicon.ts` → analyzeEmotion, calculateEmotionArc, getEmotionTimeline, EMOTION_COLORS, LEXICON_EN/ID/HI

### AI Script Coach — Feature Extraction Upgrades

**Already working (no changes needed):**
| Feature | Detection Method |
|---------|-----------------|
| `has_question` | `hasQuestion(text)` from 12-scoring-engine |
| `has_number` | `hasNumber(text)` from 12-scoring-engine |
| `has_power_word` | `detectPowerWords(text, lang).length > 0` from 12-scoring-engine |
| `has_negative_frame` | `hasNegativeFrame(text)` from 12-scoring-engine |
| `has_foreshadow` | `hasForeshadow(text)` from 12-scoring-engine |
| `has_clear_action` | `hasCtaAction(text)` from 12-scoring-engine |
| `first_person` | `hasFirstPersonCta(text)` from 12-scoring-engine |
| `word_density_optimal` | Calculated from wordCount/maxWords with curve |
| `has_transition_word` | Regex for tapi/nah/but/however/लेकिन/फिर |
| `has_urgency_word` | Regex for sekarang/now/segera/limited/अभी |

**Fix NOW — single-segment (7 features):**
| Feature | Current | New Detection |
|---------|---------|---------------|
| `emotional_intensity_high` | `0.5` | `analyzeEmotion(text, lang).intensity >= 0.6 ? 1 : intensity` from 13-emotion-lexicon |
| `has_emotional_climax` | `0.5` | For PEAK: `analyzeEmotion(text, lang).intensity >= 0.7 ? 1 : 0`. Others: intensity / 0.7 |
| `has_unexpected_twist` | `0.5` | Regex: `ternyata\|actually\|plot twist\|but here's\|turns out\|tapi ternyata\|असल में` |
| `has_value_delivery` | `0.5` | Regex: `cara\|how to\|step\|langkah\|tip\|tutorial\|hack\|strategy\|तरीका\|सीखो` |
| `has_callback` | `0.5` | Regex: `remember\|ingat\|tadi\|earlier\|yang tadi\|yang gue bilang\|याद` |
| `single_focus` | `0.5` | Count CTA verbs in text via `hasCtaAction` variants — if exactly 1 match = 1.0 |
| `matches_hook_category` | `0.5` | Match HOOK text against HOOK_CATEGORY_META patterns (negative_bias keywords, curiosity_gap patterns, etc.) |

**Fix NOW — cross-segment (4 features, needs HOOK context):**

Signature change: `extractFeatures(text, wordCount, maxWords, language)` → `extractFeatures(text, wordCount, maxWords, language, hookSegment?, allSegments?)`

| Feature | Current | New Detection |
|---------|---------|---------------|
| `builds_on_hook` | `0.5` | Extract keywords from HOOK script → count how many appear in current segment. Score = min(1, sharedWords / 3) |
| `mirrors_hook_energy` | `0.5` | Compare `analyzeEmotion(hook).intensity` vs `analyzeEmotion(current).intensity`. Score = 1 - abs(diff). Within ±0.2 = perfect |
| `emotional_match` | `0.5` | Compare `analyzeEmotion(hook).dominant` vs `analyzeEmotion(current).dominant`. Same = 1.0, secondary match = 0.7, else 0.3 |
| `has_transition` | `0.5` | Check if previous segment exists AND current starts with transition word OR references previous topic. Score = transition_word ? 1 : 0.5 |

**Implementation in AIScriptCoach.tsx:**

```tsx
// Updated extractFeatures signature
function extractFeatures(
  text: string,
  wordCount: number,
  maxWords: number,
  language: string,
  hookSegment?: SegmentInput,   // NEW
  allSegments?: SegmentInput[], // NEW
  segmentIndex?: number,        // NEW
): Record<string, boolean | number> {
  const emotion = analyzeEmotion(text, language);
  const hookEmotion = hookSegment ? analyzeEmotion(hookSegment.script, language) : null;

  // ... existing detections ...

  // NEW: emotional_intensity_high — from 13-emotion-lexicon
  emotional_intensity_high: emotion.intensity >= 0.6 ? 1 : emotion.intensity / 0.6,

  // NEW: has_emotional_climax — high bar for PEAK
  has_emotional_climax: emotion.intensity >= 0.7 ? 1 : emotion.intensity / 0.7,

  // NEW: has_unexpected_twist
  has_unexpected_twist: /\b(ternyata|actually|plot twist|but here's|turns out|tapi ternyata|असल में)\b/i.test(text),

  // NEW: has_value_delivery
  has_value_delivery: /\b(cara|how to|step|langkah|tip|tutorial|hack|strategy|तरीका|सीखो)\b/i.test(text),

  // NEW: has_callback
  has_callback: /\b(remember|ingat|tadi|earlier|yang tadi|yang gue bilang|याद)\b/i.test(text),

  // NEW: single_focus — count CTA verbs
  single_focus: (() => {
    const ctaVerbs = text.match(/\b(follow|save|share|click|tap|subscribe|like|comment|download|beli|ikutin)\b/gi) || [];
    const uniqueVerbs = new Set(ctaVerbs.map(v => v.toLowerCase()));
    return uniqueVerbs.size === 1 ? 1 : uniqueVerbs.size === 0 ? 0.5 : Math.max(0.2, 1 - (uniqueVerbs.size - 1) * 0.3);
  })(),

  // NEW: builds_on_hook — keyword overlap with HOOK
  builds_on_hook: hookSegment ? (() => {
    const hookWords = new Set(hookSegment.script.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const currentWords = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const overlap = currentWords.filter(w => hookWords.has(w)).length;
    return Math.min(1, overlap / 3);
  })() : 0.5,

  // NEW: mirrors_hook_energy — emotion intensity delta
  mirrors_hook_energy: hookEmotion ? 1 - Math.abs(hookEmotion.intensity - emotion.intensity) : 0.5,

  // NEW: emotional_match — dominant emotion comparison
  emotional_match: hookEmotion ? (
    hookEmotion.dominant === emotion.dominant ? 1.0 :
    hookEmotion.dominant === emotion.breakdown?.[1]?.[0] ? 0.7 : 0.3
  ) : 0.5,
}
```

**Passing context to extractFeatures:**

In `analyzeSegment()`:
```tsx
function analyzeSegment(
  segment: SegmentInput,
  language: string,
  allSegments: SegmentInput[]  // NEW
): CoachAnalysis {
  const hookSeg = allSegments.find(s => s.segmentType === 'HOOK' && s.isEnabled !== false);
  const segIndex = allSegments.findIndex(s => s.id === segment.id);

  const features = extractFeatures(
    segment.script, wordCount, segment.maxWords, language,
    hookSeg,       // cross-segment: HOOK reference
    allSegments,   // cross-segment: all segments
    segIndex       // position index
  );
  // ... rest unchanged
}
```

### Script Intelligence (Right Wing) — Knowledge Integration

**ViralityScore:**
- Reads `state.qualityReport.final_score` — auto-activates with real data
- Score breakdown uses `SEGMENT_WEIGHT_IN_OVERALL` from 12-scoring-engine

**RetentionCurve:**
- Already imports `scoreSegment` + `calculateRetentionCurve` from 12-scoring-engine
- Uses `RETENTION_MODEL.benchmarks.top10Percent` for benchmark line
- Feature extraction same upgrade as AIScriptCoach (share extractFeatures function)

**EmotionArc:**
- Already imports `analyzeEmotion` + `EMOTION_COLORS` from 13-emotion-lexicon
- Uses `detectEmotionPattern()` from 12-scoring-engine for pattern classification
- Auto-updates when real segments flow

**TuningSliders:**
- Editable + Apply button in right wing
- "Apply Changes" opens Generate V2 modal pre-filled with slider values
- Same effect as "Generate V2" button but with DNA pre-set

### Hook Category Integration (from 11-hook-library)

Import `HOOK_CATEGORY_META` in AIScriptCoach for `matches_hook_category`:

```tsx
// Detect which hook category the HOOK segment matches
function detectHookCategory(hookText: string): HookCategory | null {
  const text = hookText.toLowerCase();

  // negative_bias: loss aversion words
  if (/\b(stop|jangan|don't|never|worst|mistake|fail|salah|रुको|मत)\b/i.test(text)) return 'negative_bias';

  // curiosity_gap: information itch
  if (/\b(secret|found|discover|glitch|hidden|rahasia|पता चला)\b/i.test(text)) return 'curiosity_gap';

  // speed_value: ROI promise
  if (/\b((\d+)\s*(seconds?|minutes?|steps?|detik|menit|langkah))\b/i.test(text)) return 'speed_value';

  // relatability: identity/POV
  if (/\b(pov|if you|kalau lo|अगर तुम|send this to)\b/i.test(text)) return 'relatability';

  // visual_shock: has visual_cue in hook library
  if (/\b(watch|look|see this|liat|lihat|देखो)\b/i.test(text)) return 'visual_shock';

  return null;
}
```

Use in feature extraction: if HOOK has a detected category → `matches_hook_category = 1.0`

**Files:**
- `src/screens/Workspace/components/AIScriptCoach.tsx` — upgrade extractFeatures + analyzeSegment
- `src/screens/Workspace/components/RetentionCurve.tsx` — share upgraded feature extraction
- `src/screens/Workspace/Workspace.tsx` — pass segments array to AIScriptCoach
- `src/screens/Workspace/components/TuningSliders.tsx` — Apply → opens V2 modal

---

## Fix 10: Hook Switch → Full Downstream Regeneration

**Problem:** When user selects a different hook variant (Safe→Bold→Visual), only the HOOK segment text changes. FORE/BODY/PEAK/CTA/LOOP-END stay the same — disconnected from the new hook.

**Solution:** Selecting a new hook triggers full downstream regeneration:

### Flow
1. User clicks "Bold" tab in HookSelector
2. HOOK segment text swaps immediately (visual feedback)
3. All non-HOOK segments show loading skeleton
4. Call `generate-script` edge function with:
   - Fixed HOOK text (the selected variant)
   - Same topic, settings, language, duration
   - Instruction: "Regenerate all segments except HOOK to connect with this hook"
5. On success:
   - Replace all non-HOOK segments with new output
   - Update qualityReport score
   - Save as new version (e.g. V1 was Safe, switching to Bold auto-creates V2)
   - Auto-switch to new version tab
6. On failure: revert to previous hook, show error toast

### State Changes — Lookup-First Flow
```tsx
// In ScriptStep or Workspace handler:
function handleHookSelect(hookKey: string) {
  // 1. Check cache: does a version already exist for this hook?
  const cachedVersion = state.scriptVersions.find(v => v.selectedHook === hookKey);

  if (cachedVersion) {
    // INSTANT — no API call, just switch version
    dispatch({ type: 'SELECT_VERSION', version: cachedVersion.version });
    dispatch({ type: 'SELECT_HOOK', key: hookKey });
    return;
  }

  // 2. No cache — need to generate
  if (state.scriptVersions.length >= 3) {
    toast.error('Max 3 versions reached');
    return;
  }

  // 3. Generate new version with this hook
  dispatch({ type: 'SELECT_HOOK', key: hookKey });       // swap HOOK text immediately
  dispatch({ type: 'SET_GENERATING_SCRIPT', isGenerating: true }); // show loading
  // ... call generate-script edge function ...
  // On success: dispatch ADD_SCRIPT_VERSION (includes selectedHook in version data)
}
```

### Caching — Don't Regenerate Twice
Each hook variant maps to a version. Once generated, switching hooks is instant (no API call).

```
Hook Safe   → V1 (generated on initial load)
Hook Bold   → V2 (generated on first switch to Bold)
Hook Visual → V3 (generated on first switch to Visual)

Switch Safe→Bold:
  1. Check: does any version have selectedHook === 'negative'?
  2. YES → SELECT_VERSION(that version) — instant, no API call
  3. NO  → generate new version, save as V2/V3

Switch Bold→Safe:
  → V1 already exists → SELECT_VERSION(1) — instant
```

**Storage:** Version data lives in `state.scriptVersions[]` (already persisted to `chat_sessions` JSONB via useSessionPersistence). Each `ScriptVersion` stores `selectedHook` key alongside segments + score.

Add `selectedHook` to `ScriptVersion` interface:
```tsx
interface ScriptVersion {
  version: number;
  segments: WorkspaceSegment[];
  hookOptions: HookOptions;
  score: number;
  selectedHook: string;  // NEW — 'safe' | 'negative' | 'visual'
  createdAt: string;
}
```

### UX Details
- Loading state: segment cards show pulsing skeleton (same as initial generation)
- HookSelector tabs remain interactive during loading (user can cancel/switch again)
- If already at V3 and no cached version for this hook, show toast: "Max 3 versions reached."
- Hook tab shows dot indicator if that variant has been generated (green dot = cached)

### Edge Function Call
```typescript
// Payload to generate-script
{
  topic: state.topic,
  settings: state.settings,
  hook_variant: hookData.script_text,
  hook_visual: hookData.visual_direction,
  regenerate_mode: 'hook_switch',  // tells LLM to keep hook, regen rest
  slider_values: state.sliderValues,
}
```

**Files:** `src/screens/Workspace/steps/ScriptStep.tsx`, `src/contexts/WorkspaceContext.tsx`, `src/screens/Workspace/Workspace.tsx`

---

## Implementation Order

| Phase | Tasks | Effort |
|-------|-------|--------|
| A | Scroll fix (#7) + Title fix (#2) | Small |
| B | Duration options (#4) + Merged progress bar (#3) | Medium |
| C | Connect real data (#1) — root fix, pass all state to ScriptStep | Medium |
| D | Version tabs (#8) + Generate V2 modal with notes + sliders (#6) | Large |
| E | Hook switch → full regen (#10) — tied to version system | Medium |
| F | Split & Merge full implementation (#5) | Medium |
| G | AI Coach knowledge upgrade (#9) — 11 features from 0.5 → real detection | Medium |
| H | Script Intelligence activation — RetentionCurve + EmotionArc + TuningSliders | Medium |

**Estimated total:** ~8 phases. A-C are quick wins, D-E are the core features, F-H are intelligence upgrades.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/screens/Workspace/Workspace.tsx` | Pass all props to ScriptStep, title fallback to topic, scroll fix (overflow-y-auto + min-h-0), pass segments to AIScriptCoach |
| `src/screens/Workspace/steps/ScriptStep.tsx` | Merged progress bar, duration [3,5,8], version tabs, GenerateVersionModal, split popover, merge handler wiring |
| `src/contexts/WorkspaceContext.tsx` | Duration formula for [3,5,8], ensure maxWords recalculation |
| `src/screens/Workspace/components/AIScriptCoach.tsx` | Upgrade extractFeatures: 7 single-segment + 4 cross-segment detectors using 12-scoring-engine + 13-emotion-lexicon + 11-hook-library |
| `src/screens/Workspace/components/RetentionCurve.tsx` | Share upgraded feature extraction from AIScriptCoach |
| `src/screens/Workspace/components/EmotionArc.tsx` | Ensure real-time update on segment edit |
| `src/screens/Workspace/components/TuningSliders.tsx` | Apply button → opens Generate V2 modal (or direct regeneration) |

---

## Knowledge File Integration Map

```
11-hook-library-2026.ts ──► AIScriptCoach (matches_hook_category detection)
                           └► HookSelector (category metadata display)

12-scoring-engine.ts ──────► AIScriptCoach (scoreSegment, detectPowerWords, hasQuestion, hasNumber, etc.)
                           ├► RetentionCurve (calculateRetentionCurve, RETENTION_MODEL)
                           ├► ScriptStep (WORD_DENSITY.maxWords for progress bar)
                           └► ViralityScore (SEGMENT_WEIGHT_IN_OVERALL, SCORE_BENCHMARKS)

13-emotion-lexicon.ts ─────► AIScriptCoach (analyzeEmotion for emotional_intensity_high, emotional_match)
                           ├► EmotionArc (calculateEmotionArc, getEmotionTimeline, EMOTION_COLORS)
                           └► ScriptStep segment cards (emotion chip color)
```

All scoring is **evidence-based with source citations** — no hallucinated values.

---

## UI Design Review (from ui-ux-pro-max + frontend-design philosophy)

### Design Intelligence Applied
- **Dark Mode OLED** — minimal glow, high contrast, dark-to-light transitions
- **Sparkfluence overrides** — emerald (#10B981) accent, NOT red CTA. Glassmorphism ONLY on modals/overlays/sticky headers.
- **Anti-patterns avoided** — no Inter/Roboto, no emojis as icons, no generic AI purple

### Top Action Bar → Single Cohesive Row
Merge two rows into one:
```
┌────────────────────────────────────────────────────────────────────┐
│ ● 88%  │ V1 88% │ V2 92% │ V3 -- │  ⟳ Generate V2  │ Compare │ ✓ Confirm │
│        │ ● Safe │ ● Bold │       │                  │         │           │
└────────────────────────────────────────────────────────────────────┘
```
- Score pill + version tabs + actions all inline (one row, 40px height)
- Version tabs show hook variant label + green/gray cache dot
- `gap-1` between tabs, `gap-3` between tab group and buttons

### Segment Card → 5 Sections (from 7)
Remove second progress bar. Merge info into smart bar:
```
1. Toggle row (number + type + shot + duration + toggle)
2. HookSelector (HOOK only)
3. Script text
4. Smart bar + emotion chip inline  ← MERGED (was 2 separate bars)
5. Director chips + Split/Merge     ← MERGED
```
- Padding: `p-3` (was `p-4`) — saves ~40px per card
- Focused card: `box-shadow: 0 0 12px rgba(16,185,129,0.08)` (subtle emerald glow)
- Keyboard: `focus-visible:ring-2 focus-visible:ring-emerald-500/30`

### Generate V2 Modal → Glassmorphism
- Overlay: `bg-black/60 backdrop-blur-sm`
- Modal: `bg-[#161616]/95 backdrop-blur-xl border border-[#262626] rounded-2xl max-w-lg`
- Animate: `fade-in slide-in-from-bottom-4 duration-200`
- Generate button: `bg-emerald-500 hover:bg-emerald-600 text-white` (primary)
- Cancel: ghost/outline
- Close on Escape + click outside

### Split Popover → Inline Word Picker
- Popover below Split button (NOT full modal)
- Words with clickable `|` dividers (hover → emerald highlight)
- Live preview of resulting 2 segments with word count + duration
- Small, focused, doesn't obscure workspace

### Hook Selector → Cache Dot Indicator
- Green filled dot (●) = version cached, instant switch
- Gray hollow dot (○) = not generated, will trigger API call
- Tooltip: "Switch to Bold (will generate new version)" or "(instant)"

### Accessibility Additions (from ui-ux-pro-max checklist)
- `cursor-pointer` on segment cards (clickable for AI Coach)
- `focus-visible:ring` on all interactive elements
- `aria-label` on toggle, duration dropdown, hook selector tabs
- `prefers-reduced-motion` → disable `animate-spin` on RefreshCw
- Contrast ratio ≥ 4.5:1 for all text on `#161616` background
