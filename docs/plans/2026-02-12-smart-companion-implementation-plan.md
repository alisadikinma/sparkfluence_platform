> **For Claude:** REQUIRED SKILL: Use gaspol-execute to implement this plan.
> **CRITICAL:** This plan specifies real integrations. During execution,
> NEVER substitute placeholders for real data sources without explicit
> user approval. If a data source doesn't exist yet, STOP and ask.

## Goal

Close the gap between script generation and script scoring by (A) injecting scoring engine weights into the LLM prompt so generated scripts target 85-95% out of the box, and (B) replacing the confusing 3-column workspace layout with a 2-column layout featuring a unified "Smart Companion" right panel with 3 tabs (Overview, Issues, Style).

**Design spec:** `docs/plans/2026-02-12-smart-companion-scoring-integration.md`
**Visual mockup:** `docs/mockups/smart-companion-mockup.html`

## Architecture Context (from CLAUDE.md)

- **Workspace:** `src/screens/Workspace/Workspace.tsx` (611 lines) — 3-column layout: left=AIScriptCoach, center=ScriptStep, right=Intelligence+DNA
- **WorkspaceContext:** `src/contexts/WorkspaceContext.tsx` — useReducer, 25+ actions, `sliderValues`, `focusedSegmentId`, `selectedHook`
- **Scoring engine:** `src/lib/knowledge/12-scoring-engine.ts` (server copy: `supabase/functions/_shared/knowledge/12-scoring-engine.ts`)
- **Emotion lexicon:** `src/lib/knowledge/13-emotion-lexicon.ts`
- **Script generation:** `supabase/functions/generate-script/index.ts` — `buildSystemPrompt()` assembles 17 components
- **Prompt builders:** `supabase/functions/_shared/prompts/` (11 files)
- **Design system:** `#0B0E14` bg, `#10B981` emerald accent, Tailwind, Framer Motion, lucide-react icons

## Tech Stack

- React 18 + TypeScript + Tailwind + Framer Motion (existing)
- Scoring from `12-scoring-engine.ts` + `13-emotion-lexicon.ts` (existing, client-side)
- Edge Function Deno runtime for prompt builder (existing)
- No new dependencies required

## Data Integration Map

| Feature | Data Source | Hook/API | Exists? | Action |
|---------|-----------|----------|---------|--------|
| Score ring | `scoreSegment()` → weighted avg | `12-scoring-engine.ts` | Yes | Import in OverviewTab |
| Score breakdown pills | `scoreSegment()` per category | `12-scoring-engine.ts` | Yes | Import in OverviewTab |
| Retention bars | `calculateRetentionCurve()` | `12-scoring-engine.ts` | Yes | Import in OverviewTab |
| Emotion arc line | `analyzeEmotion()` + `detectEmotionPattern()` | `13-emotion-lexicon.ts` | Yes | Import in OverviewTab |
| Issue detection | `scoreSegment()` → `breakdown` for 0-score features | `12-scoring-engine.ts` | Yes | Extract from AIScriptCoach |
| Quick fix generation | `generateQuickFixes()` (21 types) | `AIScriptCoach.tsx:336` | Yes | Extract to shared util |
| Hook variant data | `state.hookOptions` | `WorkspaceContext` | Yes | Read in StyleTab |
| Hook switching | `dispatch({ type: 'SELECT_HOOK' })` | `WorkspaceContext` | Yes | Call from StyleTab |
| Segment editing | `dispatch({ type: 'EDIT_SEGMENT' })` | `WorkspaceContext` | Yes | Call from IssuesTab |
| Focused segment | `state.focusedSegmentId` | `WorkspaceContext` | Yes | Use for segment focus mode |
| Predicted score per style | `scoreSegment()` run on each hook variant | `12-scoring-engine.ts` | Partial | Compute in StyleTab |
| Scoring prompt rules | `SCORING_RULES` from `12-scoring-engine.ts` | server-side copy | Yes | New prompt builder reads it |

---

## Phase 1: Backend — Scoring Optimization Prompt (Component 18)

**Estimated time:** 15 minutes

**Files:**
- Create: `supabase/functions/_shared/prompts/scoringOptimizer.ts`
- Modify: `supabase/functions/generate-script/index.ts`

### Steps:

1. Create `supabase/functions/_shared/prompts/scoringOptimizer.ts`:
   - Import `SCORING_RULES` from `../knowledge/12-scoring-engine.ts`
   - Export `getScoringOptimizationRules(language: string): string`
   - Function reads SCORING_RULES programmatically and generates language-aware prompt text
   - For each segment type (HOOK, FORE, BODY, PEAK, CTA, LOOP-END):
     - List every feature with its weight
     - Add language-specific examples (ID: "Lo gak tau...?", EN: "Did you know...?", HI: "Kya tumhe pata hai...?")
     - Include concrete pass criteria (e.g., "MUST contain at least one question mark")
   - Add overall instruction: "Your script will be scored automatically. Target 90+ per segment."

2. Modify `supabase/functions/generate-script/index.ts` → `buildSystemPrompt()`:
   - Import `getScoringOptimizationRules` from `../_shared/prompts/scoringOptimizer.ts`
   - Insert Component 18 block between Component 16 (Creator DNA) and Component 17 (Self-Verification)
   - Inject: `${getScoringOptimizationRules(language)}`

3. Update the Self-Verification Checklist (Component 17) to reference scoring:
   - Add: `□ SCORING: Every HOOK option has question + number + power word + negative frame?`
   - Add: `□ SCORING: Every BODY has pattern interrupt + specific detail + transition word?`
   - Add: `□ SCORING: PEAK is highest-intensity segment with unexpected twist?`
   - Add: `□ SCORING: CTA has single focus + clear action verb + urgency?`

**Verification:**
- [ ] `scoringOptimizer.ts` compiles without errors (Deno import paths)
- [ ] `getScoringOptimizationRules('indonesian')` returns a string containing all HOOK features with weights
- [ ] `buildSystemPrompt()` includes Component 18 in output
- [ ] Component 17 checklist has scoring items
- [ ] No hardcoded weights — all read from `SCORING_RULES` programmatically

---

## Phase 2: Extract Shared Utilities from AIScriptCoach

**Estimated time:** 15 minutes

**Files:**
- Create: `src/screens/Workspace/utils/scriptAnalysis.ts`
- Modify: `src/screens/Workspace/components/AIScriptCoach.tsx` (to import from new util)

### Steps:

1. Create `src/screens/Workspace/utils/scriptAnalysis.ts`:
   - Extract from `AIScriptCoach.tsx`:
     - `interface CoachAnalysis` (lines 35-44)
     - `FEATURE_LABELS` record (line 57+)
     - `analyzeSegment()` function (the feature extraction logic)
     - `interface QuickFix` (lines 328-334)
     - `generateQuickFixes()` function (lines 336-550+)
   - All imports from `12-scoring-engine.ts` and `13-emotion-lexicon.ts` move here
   - Export everything

2. Update `AIScriptCoach.tsx`:
   - Replace extracted code with imports from `../utils/scriptAnalysis`
   - Verify AIScriptCoach still works identically (no behavior change)

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] `scriptAnalysis.ts` exports: `CoachAnalysis`, `QuickFix`, `FEATURE_LABELS`, `analyzeSegment`, `generateQuickFixes`
- [ ] `AIScriptCoach.tsx` imports from `../utils/scriptAnalysis` and renders identically
- [ ] No duplicate code between the two files

---

## Phase 3: Create SmartCompanion Container + OverviewTab

**Estimated time:** 20 minutes

**Files:**
- Create: `src/screens/Workspace/components/SmartCompanion/SmartCompanion.tsx`
- Create: `src/screens/Workspace/components/SmartCompanion/OverviewTab.tsx`

### Steps:

1. Create `SmartCompanion.tsx`:
   - Container component with 3 tabs: Overview, Issues, Style
   - Tab state: `activeTab: 'overview' | 'issues' | 'style'`
   - Tab bar: sticky header with emerald underline on active tab
   - Issues tab badge: red dot with count (from parent prop `issueCount`)
   - Props:
     ```typescript
     interface SmartCompanionProps {
       segments: WorkspaceSegment[];
       language: string;
       hookOptions: HookOptions | null;
       selectedHook: string;
       scoreBreakdown: ScoreBreakdown | null;
       viralityScore: number;
       focusedSegmentId: string | null;
       scriptConfirmed: boolean;
       onSelectHook: (key: string) => void;
       onEditSegment: (id: string, field: string, value: string) => void;
       onFocusSegment: (id: string | null) => void;
     }
     ```
   - Tab switching with Framer Motion `AnimatePresence` (fade + slide, 200ms)
   - Expose `switchToIssues(segmentId?: string)` via ref or callback prop

2. Create `OverviewTab.tsx`:
   - Reuse existing components (ViralityScore, RetentionCurve, EmotionArc) — NOT rewrite
   - Import `ViralityScore` from `../ViralityScore` and render in expanded mode
   - Import `RetentionCurve` from `../RetentionCurve` and render with `onSegmentClick` → calls `switchToIssues(segmentId)`
   - Import `EmotionArc` from `../EmotionArc` and render
   - Add "Issues banner" at bottom:
     - Count issues from `analyzeSegment()` across all segments
     - Show: "N issues found — Fix to boost score to ~X%"
     - Click → switch to Issues tab
   - Add "Show me how to fix →" button under retention alert
     - Click → `switchToIssues(segmentWithBiggestDrop)`

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] SmartCompanion renders 3 tab buttons with correct labels
- [ ] OverviewTab renders ViralityScore, RetentionCurve, EmotionArc using real data from WorkspaceContext
- [ ] Clicking retention bar triggers `switchToIssues` callback
- [ ] Issues banner shows correct issue count computed from `analyzeSegment()`
- [ ] No placeholder/TODO comments

---

## Phase 4: Create IssuesTab

**Estimated time:** 25 minutes

**Files:**
- Create: `src/screens/Workspace/components/SmartCompanion/IssuesTab.tsx`

### Steps:

1. Create `IssuesTab.tsx`:
   - Props:
     ```typescript
     interface IssuesTabProps {
       segments: WorkspaceSegment[];
       language: string;
       focusedSegmentId: string | null;
       onApplyFix: (segmentId: string, field: 'script' | 'visualDirection', value: string) => void;
       onFocusSegment: (id: string | null) => void;
     }
     ```

2. Issue detection:
   - For each enabled segment, call `analyzeSegment()` from `utils/scriptAnalysis`
   - Collect all weaknesses across all segments
   - Sort by weight (highest first) — this is the "impact" sort
   - Each issue gets a severity: HIGH (weight ≥ 12), MEDIUM (weight ≥ 8), LOW (weight < 8)

3. Issue card component (inline, not separate file):
   - Severity badge (HIGH=red, MEDIUM=amber, LOW=blue)
   - Segment badge (HOOK=emerald, FORE/BODY=amber, PEAK=emerald, CTA=blue)
   - Issue name + description (from FEATURE_LABELS + scoring rule source text)
   - Expected improvement: `"↗ Expected: Hook X → Y (+Z points)"` (computed from weight)
   - "Preview fix" toggle → expand/collapse before/after diff
   - Before/after diff: use `generateQuickFixes()` from `utils/scriptAnalysis`
   - "Apply Fix" button → calls `onApplyFix(segmentId, 'script', fixPreview)`
   - "Skip" button → marks issue as skipped (local state)

4. Progress bar:
   - Track `fixedCount` / `totalIssues` in local state
   - Green fill with percentage
   - Text: "N/M fixed"

5. Segment focus mode:
   - When `focusedSegmentId` is set, show "← Back to all issues" breadcrumb
   - Filter issue list to only show issues for that segment
   - Show segment identity card at top (type, score, script preview)

6. "Fix All" button (sticky at bottom):
   - Sequential apply: iterate issues, apply each fix with 400ms delay
   - Animate progress bar filling

7. "All clear" celebration state:
   - When all issues resolved: show checkmark + "Score improved: X% → Y%"
   - "Back to Overview" button

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] Issues sorted by weight descending (highest impact first)
- [ ] Each issue card shows correct segment badge, severity, description, expected improvement
- [ ] "Preview fix" expands inline diff using `generateQuickFixes()` from real analysis
- [ ] "Apply Fix" dispatches `EDIT_SEGMENT` and updates progress bar
- [ ] Segment focus mode filters correctly when `focusedSegmentId` is set
- [ ] "Fix All" applies all fixes sequentially
- [ ] No placeholder/TODO comments

---

## Phase 5: Create StyleTab

**Estimated time:** 15 minutes

**Files:**
- Create: `src/screens/Workspace/components/SmartCompanion/StyleTab.tsx`

### Steps:

1. Create `StyleTab.tsx`:
   - Props:
     ```typescript
     interface StyleTabProps {
       hookOptions: HookOptions | null;
       selectedHook: string;
       segments: WorkspaceSegment[];
       language: string;
       scriptConfirmed: boolean;
       onSelectHook: (key: string) => void;
     }
     ```

2. Three style preset cards:
   - **Safe** (🛡️): `option_a_safe` — emerald border when active
   - **Bold** (🔥): `option_b_negative` — red border when active
   - **Visual** (👁️): `option_c_visual` — cyan border when active
   - Each card shows:
     - Icon + name + "Active" badge when selected
     - Description text (hardcoded per style — from hook_type characteristics)
     - Preview: `hookOptions[key].script_text` (real text from LLM output)
     - Predicted score: compute by temporarily swapping HOOK segment text with this variant's `script_text`, then running `scoreSegment('HOOK', features)` → display result
     - Audience hint: "Best for: Education, How-to" (mapped from hook_type)
   - If a non-active style has score < 70, show amber warning: "Lower score: missing X. Fixable in Issues tab."

3. Click to switch:
   - Calls `onSelectHook(key)` which dispatches `SELECT_HOOK`
   - Disabled when `scriptConfirmed === true`

4. Bottom hint:
   - "Each style generates a different HOOK segment. Other segments stay the same."
   - If selected style has issues: "Check the Issues tab for style-specific fixes."

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] 3 style cards render with real hook preview text from `hookOptions`
- [ ] Predicted score per style is computed using real `scoreSegment()`, NOT hardcoded
- [ ] Clicking a card dispatches `SELECT_HOOK` and updates active state
- [ ] Active card has colored border (emerald/red/cyan)
- [ ] Cards disabled when `scriptConfirmed === true`
- [ ] Warning shown for styles with score < 70

---

## Phase 6: Wire SmartCompanion into Workspace + Remove Old Components

**Estimated time:** 20 minutes

**Files:**
- Modify: `src/screens/Workspace/Workspace.tsx`
- Modify: `src/screens/Workspace/steps/ScriptStep.tsx`
- Modify: `src/contexts/WorkspaceContext.tsx`

### Steps:

1. Modify `Workspace.tsx`:
   - Remove left wing `<aside>` (lines 465-486) containing `<AIScriptCoach>`
   - Remove `import { AIScriptCoach }`
   - Remove `import { TuningSliders, DEFAULT_SLIDER_VALUES }`
   - Remove `ScriptDNAPanel` component and its render (lines 229-269, 585-605)
   - Replace right wing `<aside>` (lines 524-607) with `<SmartCompanion>`:
     ```tsx
     {isScriptStep && (
       <aside className="hidden xl:flex flex-col w-[320px] flex-shrink-0 border-l border-[#262626] bg-[#0B0E14]">
         <SmartCompanion
           segments={state.segments}
           language={state.settings?.language || 'id'}
           hookOptions={state.hookOptions}
           selectedHook={state.selectedHook}
           scoreBreakdown={effectiveBreakdown}
           viralityScore={effectiveScore}
           focusedSegmentId={state.focusedSegmentId ?? null}
           scriptConfirmed={state.scriptConfirmed}
           onSelectHook={(key) => dispatch({ type: 'SELECT_HOOK', key })}
           onEditSegment={(id, field, value) => dispatch({ type: 'EDIT_SEGMENT', segmentId: id, field, value })}
           onFocusSegment={(id) => dispatch({ type: 'SET_FOCUSED_SEGMENT', segmentId: id })}
         />
       </aside>
     )}
     ```
   - Right panel width: `w-[320px]` (was 280px)

2. Modify `ScriptStep.tsx`:
   - Remove `HookSelector` import and render (hook tabs in header)
   - Remove props: `hookOptions`, `selectedHook`, `onSelectHook` (moved to SmartCompanion)
   - Keep: mini score pill in header (compact virality badge)
   - Keep: all segment card logic (edit, merge, split, duration, toggle)
   - Keep: Confirm & Continue button

3. Modify `WorkspaceContext.tsx`:
   - Remove `sliderValues` from state interface
   - Remove `SET_SLIDER_VALUES` action
   - Remove `sliderValues` from initial state
   - Remove `SET_SLIDER_VALUES` case from reducer
   - Keep `focusedSegmentId` and `SET_FOCUSED_SEGMENT` (still used by SmartCompanion)

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] Workspace renders 2-column layout (center + right SmartCompanion)
- [ ] No left panel visible
- [ ] SmartCompanion receives all necessary props from Workspace
- [ ] ScriptStep no longer renders hook tabs
- [ ] ScriptStep still renders all segment cards with full edit functionality
- [ ] WorkspaceContext no longer has `sliderValues` in state
- [ ] No imports of deleted components (AIScriptCoach, TuningSliders, HookSelector)

---

## Phase 7: Clean Up + Polish

**Estimated time:** 10 minutes

**Files:**
- Delete: `src/screens/Workspace/components/TuningSliders.tsx` (149 lines)
- Delete: `src/screens/Workspace/components/HookSelector.tsx` (164 lines)
- Modify: `src/screens/Workspace/components/AIScriptCoach.tsx` — keep as-is until IssuesTab is verified, then delete

### Steps:

1. Delete `TuningSliders.tsx` — fully replaced by StyleTab
2. Delete `HookSelector.tsx` — fully replaced by StyleTab
3. Verify `AIScriptCoach.tsx` is no longer imported anywhere:
   - If not imported → delete
   - If still imported (shouldn't be after Phase 6) → fix imports
4. Verify no dead imports in any modified file
5. Run `tsc --noEmit` to confirm clean build

**Verification:**
- [ ] `tsc --noEmit` passes with zero errors
- [ ] `TuningSliders.tsx` deleted
- [ ] `HookSelector.tsx` deleted
- [ ] `AIScriptCoach.tsx` deleted (or marked for deletion if cautious)
- [ ] No file imports deleted components
- [ ] Workspace renders correctly with SmartCompanion

---

## Phase 8: Update CLAUDE.md

**Estimated time:** 5 minutes

**Files:**
- Modify: `CLAUDE.md`

### Steps:

1. Update "v3.0 Chat-Based UI" section:
   - Replace "3-column layout" references with "2-column layout"
   - Remove "Left Wing (AI Script Coach)" from workspace layout
   - Update Right Wing description to "Smart Companion (320px) with 3 tabs: Overview, Issues, Style"
   - Remove "TuningSliders (Script DNA)" from component list
   - Remove "HookSelector" from component list
   - Add "SmartCompanion" to component list with sub-components

2. Update "Workspace Components" table:
   - Remove: `TuningSliders`, `HookSelector`, `AIScriptCoach`
   - Add: `SmartCompanion`, `OverviewTab`, `IssuesTab`, `StyleTab`

3. Update "Key Directories" section:
   - Add: `SmartCompanion/` directory under Workspace components

4. Add to "Knowledge & Data Files Index" → Prompt Builders:
   - Add: `scoringOptimizer.ts` — Scoring engine rules for LLM prompt | `generate-script`

5. Update "Generation Flow" section:
   - Add note: "Script generation uses scoring engine weights (Component 18) to target 85-95% scores"

**Verification:**
- [ ] CLAUDE.md accurately reflects new 2-column layout
- [ ] All deleted components removed from CLAUDE.md
- [ ] All new components added to CLAUDE.md
- [ ] `scoringOptimizer.ts` listed in prompt builders table

---

## Execution Order & Dependencies

```
Phase 1 (Backend: scoringOptimizer.ts)     ← independent, can run first
    │
Phase 2 (Extract utils from AIScriptCoach) ← independent of Phase 1
    │
    ├── Phase 3 (SmartCompanion + OverviewTab)  ← depends on Phase 2
    │
    ├── Phase 4 (IssuesTab)                     ← depends on Phase 2
    │
    └── Phase 5 (StyleTab)                      ← depends on Phase 2
         │
         Phase 6 (Wire into Workspace)          ← depends on 3, 4, 5
              │
              Phase 7 (Clean up)                ← depends on 6
                   │
                   Phase 8 (CLAUDE.md)          ← depends on 7
```

**Parallelizable:** Phase 1 + Phase 2 can run in parallel. Phase 3 + Phase 4 + Phase 5 can run in parallel after Phase 2.
