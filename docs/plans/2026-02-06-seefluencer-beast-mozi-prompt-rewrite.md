# Seefluencer + Beast-Mozi Prompt Rewrite

**Date:** 2026-02-06
**Status:** COMPLETE — All 8 steps done

---

## Problem Statement

Current script generation prompts are too generic and lack the "punch" of professional creators:
- Dumps 50+ hook templates regardless of content type (noise, not signal)
- FORESHADOW uses a single hardcoded formula ("yang terakhir paling gila")
- BODY segments lack value density and stakes escalation
- PEAK segment doesn't enforce plot twist / foreshadow payoff
- CTA is always generic "follow gue buat part 2"
- No retention editing cues (`[SFX]`, `[CUT TO]`, `[ZOOM]`) in output
- No MrBeast pacing or Hormozi density discipline

---

## Execution Plan

### PHASE 1: Hook Bank Integration (Source File Found)

**Source file:** `public/Sparkfluence_Hook_Library_2026.md` (100 hooks, 5 categories, 20 each)

Since Edge Functions (Deno) cannot import `.md` files, the Hook Library must be converted to a `.ts` knowledge file following the existing pattern (`supabase/functions/_shared/knowledge/*.ts`).

**Source file contents — 5 categories:**

| # | Category | Hooks | Has Visual Cues? | Best For |
|---|----------|-------|-------------------|----------|
| 1 | **Visual Shock & Pattern Interrupt** | 20 | YES — `[Camera:]`, `[Action:]`, `[Visual:]` prefixes | Showcase, Travel, Food, Tech, High-Energy Vlogs |
| 2 | **Negative Bias & Warnings** | 20 | NO — script text only | Education, Finance, Coding, Business, Health |
| 3 | **Curiosity Gaps & Insider Secrets** | 20 | NO — script text only | Storytelling, Vlogs, Case Studies, Motivation |
| 4 | **Relatability & Identity** | 20 | NO — script text only | Lifestyle, General Entertainment, Comedy |
| 5 | **Speed & Value Promise** | 20 | NO — script text only | Tutorials, Quick Tips, Hacks |

**Conversion pipeline:**
```
public/Sparkfluence_Hook_Library_2026.md
    ↓ convert
supabase/functions/_shared/knowledge/11-hook-library-2026.ts
    ↓ import
supabase/functions/_shared/prompts/seefluencerFramework.ts
    ↓ getLocalizedHookStrategy(contentType, language) selects ~6 relevant hooks
buildSystemPrompt() injects targeted hooks + transcreation instructions into LLM prompt
```

This is "RAG" in practice: **Retrieve** relevant hooks by content type → **Augment** the prompt with transcreation instructions using local slang → **Generate** script. Not vector-based (overkill for 100 items), but functionally identical.

**Key design note:** Hooks are English templates with `[Topic]`, `[Result]`, `[Product]` etc. placeholders. The Smart Localization Engine instructs the LLM to TRANSCREATE (not translate) them into the target language using local slang terms. We do NOT maintain 4× language copies of 100 hooks.

### PHASE 2: Apply 5 Critical Refinements

#### Refinement 1: Triple Hook Output

Every script request generates **3 distinct hook options** in a `hook_options` field:

| Option | Label | Source Category (Primary) |
|--------|-------|--------------------------|
| **A** | Safe / Relatable | Relatability & Identity OR Speed & Value Promise |
| **B** | Negative / Controversial | Negative Bias & Warnings |
| **C** | Visual / Action-First | Visual Shock & Pattern Interrupt |

The `segments` array HOOK segment uses Option A by default. Frontend can let user swap.

**Output JSON shape:**
```json
{
  "title": "...",
  "hook_options": {
    "option_a_safe": { "script_text": "...", "visual_direction": "...", "hook_type": "safe_relatable" },
    "option_b_negative": { "script_text": "...", "visual_direction": "...", "hook_type": "negative_controversial" },
    "option_c_visual": { "script_text": "...", "visual_direction": "...", "hook_type": "visual_action" }
  },
  "segments": [ ... ]
}
```

#### Refinement 2: Smart Hook Logic + Localization Engine

`getLocalizedHookStrategy(contentType, language)` pulls from the Hook Bank (5 categories) based on content type, then builds transcreation instructions using `SLANG_DATABASE` (4 languages: Indonesian, Hindi, English, French).

**Content type → hook category mapping (5 categories):**

| Content Type | Primary | Secondary | Tertiary |
|-------------|---------|-----------|----------|
| listicle | Curiosity Gap | Speed & Value | Negative Bias |
| tutorial | Speed & Value | Negative Bias | Curiosity Gap |
| controversy | Negative Bias | Relatability | Curiosity Gap |
| transformation | Visual Shock | Relatability | Curiosity Gap |
| comparison | Curiosity Gap | Negative Bias | Visual Shock |
| story | Relatability | Curiosity Gap | Visual Shock |
| news | Curiosity Gap | Negative Bias | Visual Shock |
| review | Negative Bias | Curiosity Gap | Speed & Value |
| challenge | Visual Shock | Curiosity Gap | Relatability |
| educational | Curiosity Gap | Speed & Value | Negative Bias |
| general | Relatability | Speed & Value | Curiosity Gap |

**How `getLocalizedHookStrategy` works:**
1. Takes `contentType` from `contentTypeDetector.ts` + `language`
2. Looks up the mapping table → gets primary/secondary/tertiary categories
3. Pulls 3 hook templates from PRIMARY, 2 from SECONDARY, 1 from TERTIARY
4. Additionally picks 1 from relatability (Option A), 1 from negative_bias (Option B), 1 from visual_shock (Option C) — ensures all 3 triple-hook flavors are represented
5. Builds SLANG_DATABASE transcreation instructions: pronouns, current terms, particles, outdated avoid list, emoji style, transcreation note
6. Returns prompt block with: hook concepts + transcreation rules + Triple Hook generation instructions
7. All 3 options are ALWAYS generated regardless of primary category

#### Refinement 3: Pope in the Pool Logic

`getPopeInPoolSuggestion(topic, language)` detects topic friction level:

**MANDATORY** (injected as hard requirement in prompt) if topic contains:
- Finance/Money: investasi, crypto, saham, pajak, asuransi, trading, bank, saving
- Law/Regulation: hukum, legal, regulasi, kebijakan, policy
- Coding/Tech Deep: programming, algorithm, database, machine learning, API, backend
- Academic: sejarah, sains, matematika, fisika, ekonomi, kimia, biologi
- Medical: kesehatan, medis, penyakit, nutrisi, diet, obat

**OPTIONAL** (injected as suggestion) for all other topics.

Suggestions are language-aware (4 languages): cooking while explaining, solving puzzle while talking, walking in public space, eating/taste-testing, light workout, making smoothie.

#### Refinement 4: A-Roll Priority (Beast-Mozi Layer)

Visual cues MUST prioritize **Camera Manipulation on the Speaker (A-Roll)** over generic stock footage description.

For **CREATOR shots** (HOOK, CTA, LOOP-END), visual_direction must emphasize:
- `[Camera: Digital Zoom In to Face]` — aggressive zoom on speaker
- `[ACTION: Speaker throws paper/slams desk/points aggressively]` — physical action
- `[Visual: Text appears behind/around speaker's head]` — text interaction with speaker
- `[Camera: Whip-pan from speaker to screen]` — dynamic camera on speaker
- `[Camera: Handheld shake on impact → steady]` — energy shift on speaker

For **B-ROLL shots** (BODY, PEAK), the priority flips: subject-first visuals with editing cues.

Note: Category 1 of the Hook Library (Visual Shock) already has the exact `[Camera:]`, `[Action:]`, `[Visual:]` prefix format — these serve as direct A-Roll templates.

#### Refinement 5: Gold Standard Case Study

Include exactly **ONE** perfect, full-structure example script in the system prompt as a few-shot reference. Must demonstrate:

- Triple Hook format (all 3 options with distinct visual_direction)
- Editing cues from Hook Library Category 1 format (`[Camera:]`, `[Action:]`, `[Visual:]`)
- Foreshadow with specific strategy (not generic)
- Stakes escalation across BODY segments
- PEAK with plot twist / foreshadow payoff
- CTA with engagement strategy (not generic "follow")
- LOOP-END mirroring HOOK
- Pope in the Pool (creator makes coffee — finance topic = mandatory)

Example topic: Indonesian, 60s, Finance/Tech ("3 Cara AI Bikin Lo Kaya di 2026") — chosen because it triggers Pope in Pool (mandatory) and Curiosity Gap hooks.

---

## Architecture: 3-Module Split + Knowledge Files

### Knowledge Directory (after cleanup)

```
supabase/functions/_shared/knowledge/
├── 08-indonesian-slang-2026.ts       ← USED by slangValidator.ts
├── 08-indonesian-slang-2026.md       ← Source doc (kept)
├── 09-hindi-slang-2026.ts            ← USED by slangValidator.ts
├── 09-hindi-slang-2026.md            ← Source doc (kept)
├── 10-global-english-slang-2026.ts   ← USED by slangValidator.ts
├── 10-global-english-slang-2026.md   ← Source doc (kept)
└── 11-hook-library-2026.ts           ← USED by seefluencerFramework.ts
```

**Deleted files (6 total):**
| File | Why Deleted |
|------|-------------|
| `01-viral-script-architecture.md` | Content hardcoded in `viralScriptKnowledge.ts` as `CORE_FRAMEWORKS` (being removed) |
| `02-hook-library-reference.md` | Superseded by `11-hook-library-2026.ts` (100 hooks vs 25) |
| `04-retention-production-specs.md` | Content in `viralScriptKnowledge.ts` as `RETENTION_AND_PLATFORM` (being removed), replaced by `beastMoziLayer.ts` |
| `05-Platform-Specs.md` | Outdated — references DALL-E 3 + VEO 3.1 + Sora 2, we use fal.ai now |
| `06-Cinematography-Lookup.md` | Already exists as `.ts` in `lookups/cinematographyLookup.ts` |
| `07-Prompt-Templates.md` | Outdated — references DALL-E 3 + VEO/Sora prompt format |

### Prompt Module Structure

```
supabase/functions/_shared/prompts/
├── seefluencerFramework.ts     ← DONE (Smart Localization Engine + all strategy functions)
├── beastMoziLayer.ts           ← DONE (pacing + density + A-Roll + Gold Standard)
├── viralScriptKnowledge.ts     ← PENDING REWRITE (slim to structure tables only)
├── slangValidator.ts           ← KEEP AS-IS
├── contentTypeDetector.ts      ← KEEP AS-IS (feeds contentType into new modules)
├── scriptValidator.ts          ← PENDING UPDATE (add Triple Hook + editing cue validation)
├── visualEnhancer.ts           ← KEEP AS-IS
└── productNamingRule.ts        ← KEEP AS-IS
```

### Knowledge File: `11-hook-library-2026.ts` — DONE

Converted from `public/Sparkfluence_Hook_Library_2026.md`. Exports:

```typescript
export interface HookTemplate {
  id: number;
  script: string;           // English text with [Placeholder]s
  visual_cue?: string;      // [Camera:]/[Action:]/[Visual:] prefix (Category 1 only)
}

export type HookCategory =
  | 'visual_shock' | 'negative_bias' | 'curiosity_gap'
  | 'relatability' | 'speed_value';

export const HOOK_LIBRARY: Record<HookCategory, HookTemplate[]> = { ... }  // 100 hooks (20×5)
export const HOOK_CATEGORY_META: Record<HookCategory, {
  name: string; objective: string; best_for: string; psychological_trigger: string;
}> = { ... }
```

### Module 1: `seefluencerFramework.ts` — DONE

Smart Localization Engine: select English hooks → transcreate using local slang.

| Export | Type | Description |
|--------|------|-------------|
| `getLocalizedHookStrategy(contentType, language)` | function | Imports from Hook Bank, selects ~6 hooks by content type, builds transcreation instructions from `SLANG_DATABASE`, returns Triple Hook prompt block |
| `getForeshadowStrategy(contentType, language)` | function | Returns 1 of 4 types: steps_tease, fear_urgency, quiz_question, visual_tease |
| `getBodyFramework(contentType, itemCount)` | function | Returns PAS (tutorial), Points (listicle), or Narrative (story) framework |
| `PEAK_PAYOFF_RULES` | const string | Plot twist + foreshadow payoff enforcement |
| `getCTAStrategy(contentType, language)` | function | Returns 1 of 4 types: polarize_debate, question_trigger, identity_tag, engagement_reward |
| `getPopeInPoolSuggestion(topic, language)` | function | MANDATORY for high-friction, OPTIONAL otherwise. Language-aware suggestions (ID/HI/EN/FR) |

**Internal `SLANG_DATABASE`:** Structured extract from slang knowledge files. 4 languages (Indonesian, Hindi, English, French) with: pronouns, current_terms (15 entries each with meaning), particles, outdated terms, emoji_style, transcreation_note.

### Module 2: `beastMoziLayer.ts` — DONE

MrBeast pacing + Hormozi density + A-Roll priority + Gold Standard.

| Export | Type | Description |
|--------|------|-------------|
| `PACING_RULES` | const string | Energy curve visualization, "every second earns the next", micro-cliffhanger rules |
| `VALUE_DENSITY_RULES` | const string | Hormozi: strict on HOOK/FORE/CTA (≤12 words/sentence), moderate on BODY (≤15 words/sentence), deletion test |
| `EDITING_CUES_GUIDE` | const string | Full vocabulary: Camera movements (7 types), Cuts (4), Visual effects (6), Audio (2), Physical actions (4) |
| `A_ROLL_PRIORITY_RULES` | const string | CREATOR shot priority stack (camera > action > text > audio), B-ROLL priority stack (subject > cuts > text > speed) |
| `getStakesEscalation(segmentCount)` | function | Per-segment intensity labels from "warm-up" to "mind-blown" (supports 1-7 BODY segments) |
| `GOLD_STANDARD_EXAMPLE` | const string | Complete 60s Indonesian finance/tech example: Triple Hook (3 options), Pope in Pool (coffee), Foreshadow→PEAK payoff, Stakes escalation (3 items), A-Roll + editing cues, CTA question_trigger |

### Module 3: `viralScriptKnowledge.ts` — DONE

Keep only structural/mechanical knowledge. All "viral DNA" already moved to new modules.

| Export | Status | Description |
|--------|--------|-------------|
| `PROJECT_INSTRUCTION` | **UPDATE** | Add `hook_options` to JSON output schema |
| `getStructureByDuration()` | KEEP | Segment tables with word limits (VEO/WAN variants) |
| `getMaxWordsForDuration()` | KEEP | Word limit calculator by language + duration |
| `CINEMATIC_VISUAL_GUIDE` | KEEP | Shot types, angles, lighting, composition vocabulary |
| ~~`CORE_FRAMEWORKS`~~ | **REMOVE** | → replaced by `seefluencerFramework.ts` |
| ~~`INDONESIAN_GENZ_PLAYBOOK`~~ | **REMOVE** | → hooks/CTA in `seefluencerFramework.ts`; slang in `slangValidator.ts` |
| ~~`TOP_HOOK_TEMPLATES`~~ | **REMOVE** | → replaced by `11-hook-library-2026.ts` Hook Bank |
| ~~`RETENTION_AND_PLATFORM`~~ | **REMOVE** | → pacing in `beastMoziLayer.ts`; platform info outdated |
| ~~`CASE_STUDIES`~~ | **REMOVE** | → one Gold Standard in `beastMoziLayer.ts` replaces all |
| ~~`FULL_KNOWLEDGE_BASE`~~ | **REMOVE** | → was concat of all removed exports, no longer needed |

---

## Updated `buildSystemPrompt` Flow

```
buildSystemPrompt(language, duration, contentType, itemCount, topic, dnaStyles, videoModel)
    │
    ├── 1. IDENTITY + OUTPUT RULES           ← viralScriptKnowledge.PROJECT_INSTRUCTION
    │      (includes hook_options JSON schema for Triple Hook)
    ├── 2. STRUCTURE TABLE                   ← viralScriptKnowledge.getStructureByDuration()
    ├── 3. TRIPLE HOOK STRATEGY              ← seefluencerFramework.getLocalizedHookStrategy(contentType, lang)
    │      (Smart Localization: ~6 hooks + SLANG_DATABASE transcreation + Triple Hook instructions)
    ├── 4. FORESHADOW STRATEGY               ← seefluencerFramework.getForeshadowStrategy(contentType, lang)
    │      (1 of 4 types matched to content)
    ├── 5. BODY FRAMEWORK                    ← seefluencerFramework.getBodyFramework(contentType, itemCount)
    │      (PAS vs Points vs Narrative)
    ├── 6. STAKES ESCALATION                 ← beastMoziLayer.getStakesEscalation(bodySegmentCount)
    │      (per-segment intensity: interesting → wild → mind-blown)
    ├── 7. PEAK PAYOFF RULES                 ← seefluencerFramework.PEAK_PAYOFF_RULES
    │      (plot twist + foreshadow delivery)
    ├── 8. CTA STRATEGY                      ← seefluencerFramework.getCTAStrategy(contentType, lang)
    │      (1 of 4 engagement types)
    ├── 9. POPE IN THE POOL                  ← seefluencerFramework.getPopeInPoolSuggestion(topic, lang)
    │      (MANDATORY if boring topic, OPTIONAL otherwise)
    ├── 10. A-ROLL PRIORITY                  ← beastMoziLayer.A_ROLL_PRIORITY_RULES
    │       (camera manipulation on speaker > stock footage)
    ├── 11. PACING + EDITING CUES            ← beastMoziLayer.PACING_RULES + EDITING_CUES_GUIDE
    │       (Camera/CUT TO/TEXT POP/ZOOM/SFX/MUSIC CUE/ACTION/SPEED/Visual)
    ├── 12. VALUE DENSITY                    ← beastMoziLayer.VALUE_DENSITY_RULES
    │       (Hormozi strict on HOOK/FORE/CTA, moderate on BODY)
    ├── 13. GOLD STANDARD EXAMPLE            ← beastMoziLayer.GOLD_STANDARD_EXAMPLE
    │       (one full few-shot reference: 60s Indonesian finance/tech)
    ├── 14. CINEMATIC VISUAL GUIDE           ← viralScriptKnowledge.CINEMATIC_VISUAL_GUIDE
    ├── 15. SLANG GUIDE                      ← slangValidator.getSlangKnowledge(lang)
    ├── 16. DNA STYLES                       ← (if enabled by user)
    └── 17. SELF-VERIFICATION CHECKLIST      ← (upgraded, all 5 refinements included)
```

**Changes to call site in `generate-script/index.ts`:**
```typescript
// BEFORE (current)
const baseSystemPrompt = buildSystemPrompt(selectedLanguage, selectedDuration, dnaStyles, selectedVideoModel)

// AFTER (new)
const contentTypeResult = detectContentType(sanitizedContent, selectedLanguage)
const baseSystemPrompt = buildSystemPrompt(
  selectedLanguage, selectedDuration,
  contentTypeResult.primary_type, contentTypeResult.item_count ?? null,
  sanitizedContent, dnaStyles, selectedVideoModel
)
```

---

## Updated Self-Verification Checklist

Injected at end of system prompt. LLM must verify before outputting:

```
BEFORE OUTPUTTING, VERIFY ALL:
□ HOOK OPTIONS: Generated all 3 (safe/negative/visual) in hook_options field?
□ HOOK: Uses specific psychological trigger? Clickbait-but-Honest?
□ HOOK: visual_direction has ≥2 editing cues + A-Roll camera manipulation?
□ FORE: Uses matched foreshadow strategy? Creates unfinished loop?
□ FORE: Contains urgency phrase ("sampai habis/akhir")?
□ BODY: Each segment introduces NEW information (deletion test)?
□ BODY: Stakes escalate (each segment more intense than previous)?
□ BODY: HOOK/FORE/CTA sentences ≤12 words, BODY sentences ≤15 words?
□ PEAK: Delivers EXACT promise from FORE? Has plot twist or surprise?
□ PEAK: Is the HIGHEST-ENERGY moment in entire script?
□ CTA: Uses engagement strategy (polarize/question/identity/reward)? NOT generic?
□ POPE IN POOL: Applied if topic is high-friction? (finance/law/coding/medical)
□ A-ROLL: CREATOR shots use camera manipulation on speaker, not static talking head?
□ EDITING CUES: Every visual_direction has ≥2 of [SFX/CUT TO/ZOOM/TEXT POP/ACTION/Camera/Visual]?
□ WORD COUNT: Every segment ≤ MAX WORDS?
□ LOOP-END: Mirrors HOOK visually + creates curiosity loop?
□ [Placeholder] REPLACED: ALL template placeholders replaced with actual topic content?
```

---

## Token Budget

| Component | Current Tokens (est.) | New Tokens (est.) |
|-----------|----------------------|-------------------|
| Identity + Output Rules | ~800 | ~900 (added hook_options schema) |
| Structure Table | ~400 | ~400 (unchanged) |
| Hook Guidance | ~2,000 (50 generic templates) | ~600 (~6 hooks + transcreation instructions) |
| Foreshadow | ~200 (one formula) | ~300 (matched strategy + validation) |
| Body Framework | ~300 (vague) | ~400 (PAS/Points/Narrative) |
| Stakes Escalation | 0 | ~200 (per-segment intensity labels) |
| PEAK | ~50 (almost nothing) | ~300 (payoff rules) |
| CTA | ~50 (generic) | ~250 (engagement strategy) |
| Pope in Pool | 0 | ~100 (when applicable) |
| A-Roll Priority | 0 | ~200 |
| Pacing + Editing Cues | 0 | ~350 |
| Value Density | 0 | ~250 |
| Gold Standard Example | 0 | ~500 (one full example) |
| Cinematic Visual Guide | ~1,500 | ~1,500 (unchanged) |
| Slang Guide | ~800 | ~800 (unchanged) |
| Verification Checklist | ~200 | ~300 (upgraded) |
| **TOTAL** | **~6,300** | **~6,350** |

Similar total. Signal-to-noise ratio dramatically higher — every token is targeted.

---

## Decisions Made

1. **Full rewrite** of prompt logic (not surgical patches)
2. **3-module split + knowledge file**: `11-hook-library-2026.ts` + seefluencerFramework + beastMoziLayer + slimmed viralScriptKnowledge
3. **Hook Bank from source file** `public/Sparkfluence_Hook_Library_2026.md` → converted to `.ts` knowledge file
4. **5 hook categories** (added Speed & Value Promise from source file)
5. **English templates with [Placeholder]s** — LLM transcreates to target language using SLANG_DATABASE (no 4× language duplication)
6. **Smart Localization Engine** — `SLANG_DATABASE` (4 languages: ID/HI/EN/FR) with pronouns, current slang terms, particles, outdated avoid list, transcreation notes
7. **Dynamic strategy selection** by contentType → selects ~6 most relevant hooks from 100 total
8. **Editing cues in visual_direction** field (not separate field)
9. **Moderate Hormozi density**: strict on HOOK/FORE/CTA (≤12 words/sentence), moderate on BODY (≤15 words/sentence)
10. **Triple Hook always generated**: 3 options in `hook_options`, Option A used as default in `segments`
11. **Pope in Pool mandatory** for high-friction topics, optional for others
12. **A-Roll priority** for CREATOR shots — camera manipulation on speaker over static talking head
13. **One Gold Standard** replaces all case studies — 60s Indonesian finance/tech example with coffee Pope in Pool
14. **Knowledge cleanup** — 6 dead/outdated `.md` files deleted from `_shared/knowledge/`

---

## Implementation Order

| Step | File | Action | Status |
|------|------|--------|--------|
| 1 | `_shared/knowledge/11-hook-library-2026.ts` | CREATE — Convert .md → structured .ts (100 hooks, 5 categories, typed interfaces) | **DONE** |
| 2 | `_shared/prompts/seefluencerFramework.ts` | REWRITE — Smart Localization Engine (SLANG_DATABASE + Hook Bank import + strategy functions) | **DONE** |
| 3 | `_shared/prompts/beastMoziLayer.ts` | CREATE — Pacing + density + A-Roll + Stakes escalation + Gold Standard example | **DONE** |
| 4 | `_shared/knowledge/*.md` | CLEANUP — Delete 6 dead/outdated .md files (01, 02, 04, 05, 06, 07) | **DONE** |
| 5 | `_shared/prompts/viralScriptKnowledge.ts` | REWRITE — Slimmed 976→556 lines, removed 6 exports, updated PROJECT_INSTRUCTION with hook_options schema | **DONE** |
| 6 | `generate-script/index.ts` | UPDATE — New imports (seefluencerFramework + beastMoziLayer), rewrote buildSystemPrompt (17 components) + buildUserPrompt, detectContentType moved to call site | **DONE** |
| 7 | `_shared/prompts/scriptValidator.ts` | UPDATE — Added validateTripleHook() + editing cue check (≥2 per visual_direction) | **DONE** |
| 8 | Verification | All imports verified clean, no broken dependencies, 3 new files exist | **DONE** |
