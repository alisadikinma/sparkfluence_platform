# Script Generation Full Overhaul - Design Document

**Date:** 2026-02-02
**Status:** Approved
**Scope:** Full overhaul of prompt engineering, hook bank, validation pipeline, and script architecture

---

## Problem

1. Hook bank limited to 50 templates across 6 categories — missing Educational, News, Review, Listicle, Niche-specific, Platform-native
2. System prompt too verbose (2500 words) with redundant sections — LLM often ignores parts
3. No mid-retention hooks at 15s/30s marks — new algorithm update (Dec 2024) requires engagement beyond first 3 seconds
4. No loop ending support — re-watch rate is now 10x more valuable than likes
5. No three-part hook (visual + text + audio) — only text hooks exist
6. No pattern interrupt planning per segment
7. Limited Hindi/French hook support
8. Cinematic Visual Guide (688 lines) in system prompt wastes context — already handled by visualEnhancer post-processing
9. No complete JSON examples in prompt — LLM learns better from examples than rules
10. Word limit compliance ~40-60% on first pass

---

## Solution

Full overhaul of script generation: restructured prompt (-40%), 157 hook templates (12 categories, 4 languages), three-part hook system, mid-retention hooks, AI-decided loop endings, pattern interrupts, and enhanced validation pipeline.

---

## New Script Architecture

### Enhanced Framework

```
HOOK(5-8s) → FORE(5-8s) → BODY(dynamic) → PEAK(5-10s) → CTA/LOOP(5-10s)
  │                             │                              │
  ├─ Text Hook                  ├─ Pattern interrupts          ├─ AI decides:
  ├─ Visual Hook                │  every 3-5s                  │  Loop vs CTA
  └─ Audio Hook                 ├─ Mid-retention hooks         │  vs Hybrid
     (3-layer simultaneous)     │  at 15s and 30s marks        │
                                └─ Dopamine spikes             │
                                   per segment                 │
```

### Three-Part Hook

Every HOOK segment now has three simultaneous layers:

| Layer | Description | Field |
|-------|-------------|-------|
| Visual Hook | First frame stops scroll without audio. Defined as "THUMBNAIL MOMENT" in visual_direction | `visual_hook_note` |
| Text Hook | Spoken script from 157-template hook bank | `script_text` |
| Audio Hook | Sound effect / music hit for attention | Metadata suggestion |

### Mid-Retention Hooks

Based on Dec 2024 algorithm update — 15-20 second engagement threshold now critical:
- BODY segment at ~15s mark: mini-reveal or "but wait" moment
- BODY segment at ~30s mark: re-engagement moment
- Embedded as content instruction to LLM, not separate segments
- `retention_hook: true` field marks these segments

### Pattern Interrupts

Every segment has a `pattern_interrupt` field:
- Options: `camera_change`, `text_overlay`, `broll_cut`, `zoom`, `sfx`
- No two consecutive segments may use the same interrupt type
- Validated in post-processing

### AI-Decided Ending Strategy

LLM chooses based on content type:
- **Loop ending**: Listicle, tutorial, educational — maximizes rewatch
- **CTA ending**: Review, trending/news — drives comments/follows
- **Hybrid**: Story, transformation — loop with subtle text CTA

Decision criteria embedded in system prompt with examples.

### BODY Segments (Dynamic)

Number of BODY segments determined by video model:
- VEO 3.1: 8s max per segment
- Kling/Wan: 10s or 15s per segment
- Total BODY duration = video duration - HOOK - FORE - PEAK - CTA

---

## Hook Bank: 157 Templates, 12 Categories

### Category Structure

| # | Category | Templates | Status |
|---|----------|-----------|--------|
| 1 | Curiosity | 15 | Enhanced (was 10) |
| 2 | Controversy | 12 | Enhanced (was 8) |
| 3 | Relatable | 12 | Enhanced (was 7) |
| 4 | Question | 12 | Enhanced (was 5) |
| 5 | Transformation | 12 | Enhanced (was 5) |
| 6 | Challenge | 10 | Enhanced (was 5) |
| 7 | Educational | 15 | **NEW** |
| 8 | News/Trending | 12 | **NEW** |
| 9 | Review/Honest | 12 | **NEW** |
| 10 | Listicle | 12 | **NEW** |
| 11 | Niche-Specific | 21 | **NEW** (Tech: 7, Health: 7, Finance: 7) |
| 12 | Platform-Native | 12 | **NEW** |
| | **TOTAL** | **157** | |

### Each Template Includes

- English version
- Indonesian version (gue/lo pronouns)
- Hindi version (applicable categories)
- French version (applicable categories)
- Emotional trigger tag (fear, joy, awe, anger, surprise)
- Best content type match (listicle, tutorial, review, etc.)

### Content Type Detector Integration

Existing `contentTypeDetector.ts` enhanced:
- 12 category matching (was 6)
- Niche detection (tech, health, finance, food, etc.)
- Niche-specific hook injection
- Returns 3-5 most relevant hooks per content type

---

## Prompt Engineering Overhaul

### System Prompt: 2500 → 1500 words (-40%)

```
NEW STRUCTURE (1500 words):
├── 1. Identity + Role (50 words)
├── 2. Output JSON Schema + 30s Example (200 words)
├── 3. Script Framework - consolidated (300 words)
│   ├── HOOK → FORE → BODY(s) → PEAK → CTA/LOOP
│   ├── Three-Part Hook instruction
│   ├── Mid-retention hooks at 15s/30s
│   ├── Pattern interrupt per segment
│   ├── AI-decided ending
│   └── Word limits (single table)
├── 4. Hook Selection - dynamic injection (200 words)
├── 5. Virality Checklist (150 words)
│   ├── 7 Virality Factors
│   ├── 4 Psychological Pillars
│   ├── Dopamine spikes
│   └── Multi-peak emotions
├── 6. Language + Slang - dynamic (200 words)
├── 7. Creator Context - conditional (200 words)
│   └── DNA tone WITH application examples
└── 8. Complete 60s Script Example (200 words)
```

### Removed from System Prompt

| Section | Reason |
|---------|--------|
| Cinematic Visual Guide (688 lines) | Already in visualEnhancer.ts post-processing |
| Retention & Platform section | LLM doesn't need algorithm knowledge |
| Case Studies | Not actionable for generation |
| Redundant word limit mentions (3x) | Consolidated to 1 table |

### Added to System Prompt

| Section | Why |
|---------|-----|
| Complete 30s JSON example | LLM learns by example > rules |
| Complete 60s JSON example | Shows proper word counts, hooks, interrupts |
| DNA tone application examples | "energetic + sarcastic" → specific style |
| Three-part hook instruction | Visual + text + audio simultaneous |
| Mid-retention hook timing | 15s/30s engagement checkpoints |
| Ending strategy decision criteria | When to use loop vs CTA vs hybrid |

---

## Validation Pipeline Enhancement

### Pipeline (7 Layers)

```
Layer 0: JSON Schema Validation [EXISTING, keep]
Layer 1: Entity Check [EXISTING, keep]
Layer 2: Word Limit Post-Processing [EXISTING, enhanced]
  └── NEW: Auto-shorten via LLM call for over-limit FORE/PEAK
      "Rewrite in ≤[X] words, keep meaning + emotion"
Layer 3: Script Validation [EXISTING, enhanced]
  ├── EXISTING: Virality factors, shot type, visual length, urgency, slang
  ├── NEW: Three-Part Hook validation (visual_hook_note present?)
  ├── NEW: Mid-Retention Hook check (15s/30s segments flagged?)
  ├── NEW: Pattern Interrupt validation (no consecutive duplicates)
  └── NEW: Loop Ending validation (text flows into HOOK?)
Layer 4: Word Count Validation [EXISTING, keep]
Layer 5: Visual Enhancement [EXISTING, keep]
Layer 6: Quality Scoring [EXISTING, enhanced]
```

### New Quality Scoring (0-100)

| Category | Points | Criteria |
|----------|--------|----------|
| Hook Quality | 0-20 | Three-part hook (+5), matches template (+5), visual hook (+5), emotional trigger (+5) |
| Retention | 0-20 | Mid-retention hooks (+5), pattern interrupts varied (+5), dopamine spikes (+5), no static >5s (+5) |
| Completion Prediction | 0-20 | Foreshadow FOMO (+5), PEAK delivers (+5), ending appropriate (+5), loop seamless (+5) |
| Content Quality | 0-20 | Virality factors ≥2 (+5), word limits met (+5), slang score ≥70 (+5), visual ≥50 words (+5) |
| Language Quality | 0-20 | Pronoun correct (+5), particles present (+5), no outdated slang (+5), code-mixing natural (+5) |

### Quality Thresholds

| Score | Action |
|-------|--------|
| ≥70 | Pass, proceed to next step |
| 50-69 | Auto-enhance weak areas via additional LLM pass |
| <50 | Full regeneration with feedback |

---

## Output JSON Schema Changes

New fields per segment (backward compatible — existing fields unchanged):

```typescript
{
  // ... all existing fields preserved ...
  pattern_interrupt: "camera_change" | "text_overlay" | "broll_cut" | "zoom" | "sfx",
  visual_hook_note: string | null,  // HOOK segment only: thumbnail moment
  retention_hook: boolean,          // true if mid-retention checkpoint
  ending_strategy: "loop" | "cta" | "hybrid"  // last segment only
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/_shared/prompts/viralScriptKnowledge.ts` | **REWRITE** — restructured prompt, 157 hooks, Hindi/French playbooks, examples. Remove RETENTION_AND_PLATFORM, CASE_STUDIES from prompt injection |
| `supabase/functions/_shared/prompts/contentTypeDetector.ts` | **UPDATE** — 12 category matching, niche detection, niche-specific hook injection |
| `supabase/functions/_shared/prompts/scriptValidator.ts` | **UPDATE** — add hook/retention/interrupt/loop validations, new scoring |
| `supabase/functions/generate-script/index.ts` | **REWRITE** — buildSystemPrompt(), buildUserPrompt(), auto-shorten, loop logic, new output fields |
| `supabase/functions/_shared/knowledge/02-hook-library-reference.md` | **REWRITE** — 157 templates reference |
| `supabase/functions/_shared/knowledge/01-viral-script-architecture.md` | **UPDATE** — add mid-retention, pattern interrupts, loop ending |

### Files NOT Modified (proven, keep stable)

- `visualEnhancer.ts` — already works for post-processing visuals
- `slangValidator.ts` — already validates slang properly
- `productNamingRule.ts` — already fixes entity names
- Word limit math — correct as-is
- Gemini → OpenRouter fallback — reliable
- API key rotation — works

---

## Verification

1. **Hook diversity:** Generate 10 scripts across content types → verify hooks from different categories
2. **Word limit compliance:** Generate 20 scripts → target >75% first-pass compliance (vs current 40-60%)
3. **Mid-retention hooks:** Verify 60s/90s scripts have retention phrases at ~15s and ~30s
4. **Pattern interrupts:** Verify no consecutive duplicate interrupt types
5. **Loop ending:** Generate 10 scripts with loop → verify last text flows into hook
6. **Quality scores:** Target average >80 (vs current ~75)
7. **Prompt length:** Confirm system prompt ≤ 1500 words
8. **Backward compatibility:** ImageGeneration/VideoGeneration screens work with new output schema
9. **Language coverage:** Generate scripts in ID/EN/HI/FR → verify hook quality in each
10. **Three-part hook:** Verify HOOK segments have visual_hook_note + compelling visual_direction
