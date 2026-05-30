# Creator-Lab Workspace Redesign

**Date:** 2026-02-08
**Route:** `/creator-lab/:orderId/script`
**Branch:** `feat/v3-chat-redesign`
**Status:** Design approved, pending implementation

---

## Overview

Redesign the 3-column Workspace layout for the script step in creator-lab. Current state: left and right wings are decorative with no real function. New design turns every panel into an actionable tool that helps users craft better scripts.

---

## 1. Header Fixes

### 1a. Title Auto-populate
- `EditableTitle` initial value = `state.topic` (not "Untitled")
- Falls back to "Untitled" only if no topic exists
- User can still click to edit inline

### 1b. StepBar Lock Fix
- Video + Studio steps must show `locked` status (not `completed`)
- Fix `buildSteps()` in `Workspace.tsx` — derive status from `canProceedToVideo` / `canProceedToStudio`
- Only show checkmark when session `status` has progressed past that step

```
● Script ──── ○ Images 🔒 ──── ○ Video 🔒 ──── ○ Studio 🔒
```

---

## 2. Left Wing — "AI Script Coach" (replaces Trending/BrandKit/PreFlight)

**Width:** 240px, only visible at ≥1440px during script step

### Concept
When user clicks/focuses any segment card in center, left wing shows AI-powered coaching for that specific segment.

### Panel Structure

```
┌─────────────────────────┐
│ 🎯 AI SCRIPT COACH      │
│ Analyzing: HOOK          │
│                          │
│ ✅ STRENGTHS             │
│ • Strong curiosity gap   │
│ • Good "gue/lo" tone    │
│ • Under word limit ✓     │
│                          │
│ ⚠️ WEAKNESSES           │
│ • Opening word doesn't   │
│   scroll-stop            │
│ • No number/stat hook    │
│                          │
│ 💡 REWRITE SUGGESTIONS  │
│ ┌──────────────────────┐│
│ │ "Cuma 3 tools AI ini ││
│ │  yang literally bikin ││
│ │  gue passive income"  ││
│ │         [Apply]       ││
│ └──────────────────────┘│
│ ┌──────────────────────┐│
│ │ "Lo tau gak, 90%     ││
│ │  creator gak pake    ││
│ │  tools ini..."        ││
│ │         [Apply]       ││
│ └──────────────────────┘│
│                          │
│ 🔥 VIRAL REFERENCES     │
│ Pattern: "number_list"   │
│ Avg retention boost: +18%│
│                          │
│ 📊 SEGMENT SCORE: 7.2   │
│ [Hook Power ████░░ 72%] │
│ [Clarity    █████░ 85%] │
│ [Scroll-Stop███░░░ 55%] │
└─────────────────────────┘
```

### How It Works
- **Passive analysis** — runs when script first loads, caches results per segment
- **Click to focus** — clicking a segment card in center updates the coach panel
- **"Apply" button** — replaces segment text with the suggestion (with undo via Ctrl+Z)
- **Viral References** — pattern-matched from `11-hook-library-2026.ts` (100 hooks, 5 categories)
- **Segment Score** — derived from `12-scoring-engine.ts` rules (deterministic, no LLM)
- **Auto-refresh** — when segment is edited/regenerated, coach re-analyzes after 2s debounce

### Edge Function Mode
Extend `generate-script` with `mode: 'analyze'`:
- **Input:** 1 segment + surrounding context + language
- **Grounding:** `11-hook-library-2026.ts` patterns + `12-scoring-engine.ts` rules
- **Output:** `{ strengths[], weaknesses[], suggestions[], pattern_match, segment_score }`
- LLM used only for rewrite suggestions; all scoring is rule-based

---

## 3. Center — Script Editor Enhancements

### 3a. Version System

```
[V1 ●] [V2] [V3]          [+ Generate Version 2]  🔒
                           [Compare: V1 vs V2 ▼]
```

- Version tabs at top. Click to switch. Active = emerald dot
- **"Generate Version N"** replaces old "Regenerate" button
- Calls `generate-script` with same topic + current slider params from right wing
- Stores result in `state.scriptVersions` (max 3 versions)
- **Compare mode** — dropdown triggers side-by-side word-level diff (existing `ScriptComparison` component)

### 3b. Smart Hook Sync

When user switches hook variant (Safe → Bold → Visual):
1. AI checks each segment's dependency on the hook text
2. Only regenerates segments that reference or depend on the hook context
3. Shows brief indicator per segment: "kept" vs "regenerating"

New edge function mode: `mode: 'rewrite-segments'`
- **Input:** new hook text + all segments
- **Output:** per-segment verdict (`compatible` / `needs_rewrite`) + rewritten text for incompatible ones

### 3c. Enhanced Visual Direction

Replace plain text with structured display:

```
🎬 VISUAL DIRECTION
📷 Medium Close-Up  │ 🎥 Slow Push-In
💡 Golden Hour Warm  │ 🎭 Confident + Excited

"Creator di depan laptop, sinar golden hour
 dari jendela kiri, gesture menunjuk ke layar"

[📷 Shot] [🎥 Movement] [💡 Light] [🎭 Mood]
 ↑ clickable chips — each editable via dropdown
```

- Structured tags parsed from `visual_direction` text
- Editable chips — click to change (dropdown with options)
- Editing a chip regenerates only that segment's visual direction

### 3d. Segment Operations

#### Duration Adjuster
- Dropdown on duration badge: `5s / 6s / 7s / 8s` (max 8s)
- Changing duration recalculates word limit (130 WPM × Xs × 0.80)

#### Word Density Indicator
```
≥70%  →  emerald ✅ "Good density"
50-69% → amber   ⚠️ "Consider adding detail"
<50%  →  red     🔻 "Merge with next segment?" [Auto-merge ↓]
```

#### Merge Segments
- **[Merge ↓]** visible only on segments with same-type sibling below (BODY-1 → BODY-2)
- Combines script text, takes longer duration (capped at 8s)
- Visual direction merges (keeps dominant one)

#### Split Segment
- **[Split ✂️]** always visible, glows amber when words exceed max
- AI splits at natural sentence break (not just word count / 2)
- New segment inherits shot type, gets auto-generated visual direction
- Segment numbers auto-reindex

#### Enable/Disable Toggle
- Toggle on ALL segments (extends LOOP-END toggle to every segment)
- OFF: card at 40% opacity, skipped in generation, excluded from scoring
- Retention curve + emotion arc update to reflect only enabled segments

### 3e. Scroll Fix
- Current issue: `overflow-hidden` on parent blocks child scroll
- Fix: ensure center column uses `overflow-y-auto` with no ancestor clipping

### 3f. Virality Score Moved
- Remove expanded ring from bottom of center
- Keep only compact pill `88% viral` in top action bar
- Full breakdown moves to right wing (Section 4a)

---

## 4. Right Wing — "Script Intelligence Dashboard" (replaces Live Preview)

**Width:** 280px, visible at ≥1280px

### 4a. Retention Curve Simulator (top panel)

```
📈 PREDICTED RETENTION
100%┤█▓▓▒▒
 80%┤    ▓▓▓▒
 60%┤        ▒▒▒░
 40%┤            ░░░
 20%┤               ░░░
  0%┤────────────────────
    HOOK FORE B1  B2 PEAK CTA

⚠️ Drop at BODY-2: -22%
💡 "Add a pattern interrupt or stat to re-hook"
Avg retention: 67%  |  Benchmark: top 10% = 72%+
```

- Stacked bar chart — one column per segment, height = predicted retention %
- Color gradient: emerald (>80%) → amber (50-80%) → red (<50%)
- Drop alerts — highlights biggest drop-off with actionable AI suggestion
- Benchmark line — dotted line showing top 10% threshold
- **100% client-side** — calculated from `12-scoring-engine.ts` rules (no LLM, no hallucination)

### 4b. Emotion Arc Timeline (middle panel)

```
🎭 EMOTION ARC
high ╭──╮        ╭──╮
     │  │   ╭──╮ │  │
mid  │  ╰───╯  │ │  │ ╭──╮
     │         ╰─╯  │ │  │
low ─╯              ╰─╯  ╰─
    HOOK FORE B1  B2 PEAK CTA

Pattern: ✅ Roller Coaster
(high→dip→build→climax→warm) — #1 viral pattern
```

- Line chart showing emotional intensity per segment
- Auto-detected pattern: "Roller Coaster" (ideal), "Flat Line" (bad), "Slow Burn" (risky), "Front-Heavy" (drops)
- Click a segment point → focuses that segment in center + left coach
- **100% client-side** — uses `13-emotion-lexicon.ts` word→emotion→intensity mapping

### 4c. Script Tuning Sliders (bottom panel)

```
🎛️ SCRIPT DNA

Hook Aggressiveness
[Safe ●────────────○ Brutal]  4/10

Controversy Level
[Mild ○────●───────○ Spicy]   6/10

Humor Density
[Serious ○──────●──○ Comedy]  7/10

Pacing
[Slow ○────────●───○ Rapid]   8/10

Emotional Intensity
[Subtle ○───●──────○ Drama]   5/10

[Apply Changes]
```

- 5 sliders (1-10 scale) mapping to system prompt parameters
- **Initial values auto-detected** from generated script (AI analyzes on load, sets slider positions)
- **"Apply Changes"** button (not auto-apply — prevents accidental regeneration)
- On apply: `generate-script` with `mode: 'tune'` — sends slider values + segments, AI identifies mismatches and regenerates only affected segments
- Retention curve + emotion arc auto-update after changes
- Sliders disabled when `scriptConfirmed = true`

---

## 5. Knowledge Architecture

### Existing Files (reuse, no duplication)

| File | Purpose | Used By |
|------|---------|---------|
| `11-hook-library-2026.ts` | 100 hooks, 5 categories, `HOOK_CATEGORY_META` | AI Script Coach (pattern matching) |
| `ad-studio/01-advertising-psychology.ts` | Cialdini's principles, cognitive biases, emotional triggers | Coach context |
| `ad-studio/04-audience-psychology-matrix.ts` | Pacing params by generation (words/sec, cuts/min) | Pacing scoring |
| `ad-studio/06-cta-conversion-optimization.ts` | CTA conversion stats, placement strategy | CTA scoring |
| `tier3/market-intel-q1-2026.md` | Viral case studies, hook formulas per market | Coach viral references |

### Knowledge Enrichment Process (Phase 0 — BEFORE implementation)

> **Principle:** Every scoring weight must trace back to a real data point or research finding. No arbitrary numbers.

#### Step 1: Extract Existing Data (87 data points found)

| Scoring Area | Data Points | Source |
|---|---|---|
| Hook timing | Gen Z 1.3s, 45-65% drop in 3s, 5 trigger types | `04-audience-psychology`, `01-advertising-psychology` |
| Pacing | Words/sec (1.5-3.0), cuts/min (4-25), max shot (4-15s) per generation | `04-audience-psychology-matrix` |
| CTA | First-person +90% CTR, single CTA +371%, mid-roll 16.95% conversion | `06-cta-conversion-optimization` |
| Emotional | Emotional campaigns 2x ROI, loss aversion 2x intensity | `01-advertising-psychology` |
| Platform | YouTube Shorts 5.91%, TikTok 4.1-6.1%, nano 7.2% engagement | `tier3/market-intel` |
| Framework timing | AIDA/PAS/BAB/HSO with exact % per phase per duration | `02-video-ad-frameworks` |
| Regional | Regional language +38% engagement, trending audio +42% | `tier3/market-intel` |

#### Step 2: Web Research for Gaps

| Gap | Research Target | Deliverable |
|---|---|---|
| Retention curve shape | TikTok Creator Analytics studies, Epidemic Sound research | Real drop-off patterns per segment type |
| Hook type → retention | Academic papers, HubSpot/Hootsuite viral studies | Hook category performance ranking |
| Word-level emotion data | NRC Emotion Lexicon (14K+ words, 8 emotions), SentiWordNet | Base lexicon for `13-emotion-lexicon.ts` |
| Power word impact | CoSchedule headline analyzer research, A/B test studies | Validated power word list with impact scores |
| Scoring weight validation | YouTube Creator Academy, TikTok for Business reports 2025-2026 | Calibrated weight multipliers |

#### Step 3: Build Evidence-Based Formulas

```
HOOK_SCORE = (
  has_question × 12     ← "45-65% drop in 3s, questions force engagement"
  + has_number × 15     ← "number_list hooks from 11-hook-library avg +18% retention"
  + has_power_word × 10 ← validated via NRC/SentiWordNet word list
  + density_70_90 × 8   ← "130 WPM × duration × 0.80" (existing word limit)
  + under_3s_read × 10  ← "Gen Z 1.3s decision point" (audience matrix)
) / max_possible × 100

CTA_SCORE = (
  has_clear_action × 10 ← "+121% conversion" (CTA optimization data)
  + first_person × 12   ← "+90% CTR" (CTA optimization data)
  + single_focus × 15   ← "+371% clicks" (CTA optimization data)
  + urgency_word × 8    ← "up to +332%" (CTA optimization data)
) / max_possible × 100
```

#### Step 4: Emotion Lexicon Construction

1. Download NRC Emotion Lexicon (English, 14K words, 8 emotions) → filter to 500 most relevant for short-form content
2. Cross-reference with `08-indonesian-slang-2026.ts` for Indonesian coverage + manual addition
3. Cross-reference with `09-hindi-slang-2026.ts` for Hindi coverage + manual addition
4. Each word: `{ emotion, intensity: 0.0-1.0, source: "NRC" | "slang_file" | "manual" }`

#### Step 5: Validation

```
Phase A: Static validation (before launch)
├── Score 8 viral case studies from market-intel (should score high)
├── Score intentionally bad scripts (should score low)
├── Test emotion arc detection against known viral patterns
└── Manual review of 20 sample scripts

Phase B: Live validation (ongoing)
├── User feedback: "Was this score helpful?" (thumbs up/down)
├── Correlate scores with actual video performance (if shared)
└── Quarterly weight recalibration based on accumulated data
```

### New Files to Create (2 files)

#### `12-scoring-engine.ts`
Evidence-based scoring weights, calculation formulas, benchmark thresholds, emotion arc patterns.
All weights traceable to real data points (see Step 3 above).

```typescript
export const RETENTION_RULES = {
  hook: {
    has_question: { weight: 12, source: "45-65% viewer dropout in 3s — questions force mental engagement" },
    has_number: { weight: 15, source: "number_list hook pattern avg +18% retention (11-hook-library)" },
    has_power_word: { weight: 10, source: "NRC Emotion Lexicon validated power words" },
    word_density_optimal: { weight: 8, source: "130 WPM × duration × 0.80 existing word limit rule" },
    under_3s_read: { weight: 10, source: "Gen Z 1.3s decision point (04-audience-psychology)" },
  },
  body: {
    pattern_interrupt: { weight: 12, source: "5 RAS trigger techniques (01-advertising-psychology)" },
    specific_detail: { weight: 10, source: "Vague=skip, specific=trust (01-viral-content)" },
    transition_word: { weight: 5, source: "Smooth flow reduces drop-off" },
  },
  peak: {
    emotional_climax: { weight: 15, source: "Emotional campaigns 2x ROI (01-advertising-psychology)" },
    unexpected_twist: { weight: 12, source: "Surprise = replay value (01-viral-content)" },
  },
  cta: {
    clear_action: { weight: 10, source: "+121% conversion for action-oriented language (06-cta)" },
    first_person: { weight: 12, source: "+90% CTR for first-person CTAs (06-cta)" },
    single_focus: { weight: 15, source: "+371% clicks for single CTA (06-cta)" },
    urgency_word: { weight: 8, source: "up to +332% with authentic urgency (06-cta)" },
  },
  benchmarks: { top_10: 82, average: 58, below: 40 },
  emotion_patterns: {
    roller_coaster: { bonus: 15, desc: "high→dip→build→climax→warm" },
    slow_burn: { bonus: 8 },
    front_heavy: { bonus: -5 },
    flat_line: { bonus: -15 },
  },
}

export const POWER_WORDS = {
  id: ["gila", "literally", "rahasia", "ternyata", "serius", "bahaya", "gratis", "hack", "terbukti", "shocking"],
  en: ["secret", "proven", "shocking", "free", "hack", "insane", "literally", "truth", "exposed", "warning"],
  hi: ["sach", "shocking", "free", "secret", "danger", "proven", "insane", "truth", "warning", "exposed"],
}
```

**Used by:** Retention Curve (client-side) + AI Script Coach (grounded scoring)

#### `13-emotion-lexicon.ts`
Word → emotion → intensity mapping per language.

```typescript
export const EMOTION_LEXICON = {
  id: {
    "gila": { emotion: "surprise", intensity: 0.9 },
    "bahaya": { emotion: "fear", intensity: 0.8 },
    "passive income": { emotion: "desire", intensity: 0.7 },
    "ternyata": { emotion: "curiosity", intensity: 0.75 },
    "gratis": { emotion: "desire", intensity: 0.85 },
    "scam": { emotion: "anger", intensity: 0.8 },
    // ... 200+ words per language
  },
  en: { /* ... */ },
  hi: { /* ... */ },
}
```

**Used by:** Emotion Arc chart (client-side calculation)

### Frontend Mirroring
- `12-scoring-engine.ts` and `13-emotion-lexicon.ts` live in `_shared/knowledge/` (edge function side)
- Mirror to `src/lib/knowledge/` for client-side Retention Curve and Emotion Arc
- Same TypeScript exports, different import paths

---

## 6. New Edge Function Modes

All modes extend existing `generate-script` with a `mode` field:

| Mode | Purpose | Input | Output |
|------|---------|-------|--------|
| `analyze` | AI Script Coach | 1 segment + context | strengths, weaknesses, suggestions, pattern_match, score |
| `rewrite-segments` | Smart Hook Sync | new hook + all segments | per-segment compatibility + rewritten text |
| `tune` | Slider parameter tuning | 5 slider values + segments | regenerated mismatched segments |
| `split` | Segment split | 1 oversized segment | 2 balanced segments at natural break |
| `merge` | Segment merge | 2 adjacent segments | 1 combined segment with coherent visual |

---

## 7. New WorkspaceContext Actions

```
ADJUST_DURATION      — change segment duration + recalculate word limit
MERGE_SEGMENTS       — combine two adjacent segments
SPLIT_SEGMENT        — split one segment into two
TOGGLE_SEGMENT       — enable/disable any segment
SET_SCRIPT_VERSION   — switch between V1/V2/V3
ADD_SCRIPT_VERSION   — store new version from generation
SET_SLIDER_VALUES    — update the 5 tuning parameters
SET_COACH_DATA       — store AI coach analysis per segment
UPDATE_RETENTION     — recalculate retention curve after changes
SET_FOCUSED_SEGMENT  — track which segment the coach is analyzing
```

---

## 8. Implementation Priority

### Phase 0: Knowledge Enrichment (BEFORE any implementation)
0a. Extract 87 existing data points from knowledge files → compile into reference doc
0b. Web research: NRC Emotion Lexicon, TikTok retention studies, power word validation
0c. Build `12-scoring-engine.ts` with evidence-based weights (each weight cites source)
0d. Build `13-emotion-lexicon.ts` from NRC base + slang files cross-reference
0e. Validate: score 8 viral case studies from market-intel + 12 sample scripts
0f. Mirror both files to `src/lib/knowledge/` for frontend

### Phase 1: Bug Fixes + Layout Foundation
1. Header: title auto-populate from topic + StepBar lock fix
2. Center: scroll fix (overflow-y-auto)
3. Remove VelocityMeter, BrandKit, PreFlightChecklist components
4. Remove LiveSimulator phone mockup
5. Right wing: move ViralityScore expanded ring here

### Phase 2: Segment Operations
6. Duration adjuster dropdown (5-8s)
7. Word density indicator with color thresholds
8. Enable/disable toggle for all segments
9. Enhanced visual direction (structured tags + editable chips)

### Phase 3: Version System + Hook Sync
10. Version tabs (V1/V2/V3) + "Generate Version N" button
11. Compare mode (word-level diff)
12. Smart Hook Sync (mode: 'rewrite-segments')

### Phase 4: Knowledge Files + Scoring Engine
13. Create `12-scoring-engine.ts` (weights, benchmarks, power words)
14. Create `13-emotion-lexicon.ts` (word→emotion→intensity)
15. Mirror to `src/lib/knowledge/` for frontend

### Phase 5: Right Wing Dashboard
16. Retention Curve Simulator (client-side, rule-based)
17. Emotion Arc Timeline (client-side, lexicon-based)
18. Script Tuning Sliders (5 parameters)
19. Slider → regenerate flow (mode: 'tune')

### Phase 6: AI Script Coach
20. `mode: 'analyze'` edge function endpoint
21. Left wing coach panel UI
22. Click-to-focus segment linking
23. "Apply" suggestion flow with undo

### Phase 7: Advanced Segment Operations
24. Merge segments (mode: 'merge')
25. Split segments (mode: 'split')
26. Auto-merge suggestion at <50% density

---

## 9. Design System Notes

- Colors: warm charcoal (#0B0E14) + emerald (#10B981) — unchanged
- Retention borders: emerald (HOOK/PEAK), amber (FORE/BODY), cyan (CTA), gray (LOOP-END)
- Sliders: emerald track, white thumb
- Charts: use lightweight SVG (no chart library dependency)
- Coach panel: subtle glassmorphism header only
- All animations: Framer Motion (existing library)
