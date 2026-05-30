> **For Claude:** REQUIRED SKILL: Use gaspol-execute to implement this plan.
> **CRITICAL:** This plan specifies real integrations. During execution,
> NEVER substitute placeholders for real data sources without explicit
> user approval. If a data source doesn't exist yet, STOP and ask.

## Goal

Fix 3 bugs in the SmartCompanion IssuesTab: (1) Quick fixes produce garbage text by naively truncating words — replace with smart sentence-aware condensing that preserves meaning, (2) Applied fixes are lost on browser refresh due to a React closure race condition — fix `saveNow()` to save the updated state, (3) Add undo capability so users can revert applied fixes.

## Architecture Context

- **WorkspaceContext** (`src/contexts/WorkspaceContext.tsx`): useReducer with `EDIT_SEGMENT` action (line 321). Sets `isDirty: true` on segment edits.
- **useSessionPersistence** (`src/hooks/useSessionPersistence.ts`): Auto-save with 5s debounce. `saveNow()` calls `performSave()` which compares `lastStateRef.current` against current state to skip no-op saves (line 213). **Bug**: `saveNow()` called immediately after dispatch uses stale closure — state hasn't updated yet.
- **SmartCompanion** (`src/screens/Workspace/components/SmartCompanion/SmartCompanion.tsx`): Holds `appliedFixes: Set<string>` and `skippedIssues: Set<string>` as lifted state (line 75-76). Passes to IssuesTab.
- **IssuesTab** (`src/screens/Workspace/components/SmartCompanion/IssuesTab.tsx`): Calls `onApplyFix()` (dispatches EDIT_SEGMENT) then `onSaveNow()` immediately (lines 121-125). Race condition here.
- **scriptAnalysis.ts** (`src/screens/Workspace/utils/scriptAnalysis.ts`): `buildFixPreview()` (line 402-426) does dumb first-N-words truncation. `generateQuickFixes()` (line 432-796) generates all fix previews using `buildFixPreview()`.
- **Scoring engine** (`src/lib/knowledge/12-scoring-engine.ts`): `hasNumber()`, `detectPowerWords()`, `hasQuestion()` — reusable for impact scoring in smart condense.

## Tech Stack

- React 18 + TypeScript + Vite
- State: useReducer (WorkspaceContext)
- Persistence: useSessionPersistence (Supabase `chat_sessions` table)
- Analysis: `12-scoring-engine.ts` + `13-emotion-lexicon.ts`
- UI: Tailwind + lucide-react + Framer Motion
- Design system: emerald (#10B981) + charcoal (#0B0E14)

## Data Integration Map

| Feature | Data Source | Hook/API | Exists? | Action |
|---------|-----------|----------|---------|--------|
| Filler words list | New constant | `FILLER_WORDS` in scriptAnalysis.ts | No | Create (language-keyed object) |
| Sentence impact scoring | 12-scoring-engine.ts | `hasNumber()`, `detectPowerWords()` | Yes | Import existing |
| Smart condense function | New function | `smartCondense()` in scriptAnalysis.ts | No | Create (replaces `buildFixPreview` usage) |
| Fix previews | generateQuickFixes() | scriptAnalysis.ts | Yes | Modify to use `smartCondense()` |
| Immediate save trigger | useSessionPersistence | `needsImmediateSave` ref | No | Add ref + useEffect |
| Applied fixes with original text | SmartCompanion state | `appliedFixes: Map<string, {originalText}>` | Partial | Change Set→Map |
| Undo handler | IssuesTab | `handleUndoFix()` | No | Create |
| Undo UI button | IssuesTab | Applied fix card | No | Create |

---

## Phase 1: Smart Condense — Replace Dumb Truncation

**Estimated time:** 10 minutes

**Files:**
- Modify: `src/screens/Workspace/utils/scriptAnalysis.ts`

**Steps:**

### Step 1.1: Add filler words constant

Add `FILLER_WORDS` constant after the `CROSS_SEGMENT_FEATURES` set (after line 42):

```typescript
/** Language-specific filler/hedge words safe to strip when condensing */
const FILLER_WORDS: Record<string, Set<string>> = {
  id: new Set(['ini', 'itu', 'tuh', 'sih', 'gitu', 'dong', 'deh', 'lho', 'kan', 'nih', 'ya', 'literally']),
  en: new Set(['literally', 'basically', 'actually', 'really', 'just', 'very', 'quite']),
  hi: new Set(['literally', 'basically', 'actually', 'matlab', 'bilkul']),
};
```

### Step 1.2: Add `scoreSentenceImpact` helper

Add a helper that scores a sentence for "hookiness" — used to pick the best sentence when condensing. Place after `FILLER_WORDS`:

```typescript
/** Score a sentence's impact for smart condensing. Higher = more impactful. */
function scoreSentenceImpact(sentence: string, language: string): number {
  let score = 0;
  // +2 per number/stat found
  const numbers = sentence.match(/\d+/g);
  if (numbers) score += numbers.length * 2;
  // +1 per power word
  score += detectPowerWords(sentence, language).length;
  // +1 for curiosity/teaser patterns
  if (/\b(yang\s+ketiga|rahasia|bahaya|terakhir|secret|dangerous|last|third|final)\b/i.test(sentence)) score += 1;
  // +1 for negative frame (stop-scroll)
  if (hasNegativeFrame(sentence)) score += 1;
  // +0.5 for question (engagement)
  if (hasQuestion(sentence)) score += 0.5;
  return score;
}
```

Uses existing imports: `detectPowerWords`, `hasNegativeFrame`, `hasQuestion` (already imported lines 11-16).

### Step 1.3: Add `smartCondense` function

Replace the role of `buildFixPreview` with a smarter function. Place it right after `scoreSentenceImpact`:

```typescript
/**
 * Smart condense: produces a fix preview that respects maxWords while
 * preserving the most impactful content. Unlike buildFixPreview (which
 * blindly truncates from the end), this function:
 * 1. Strips filler words
 * 2. Splits into sentences and picks the most impactful one(s)
 * 3. Falls back to dumb truncation only as last resort
 */
function smartCondense(
  prefix: string,
  originalText: string,
  suffix: string,
  maxWords: number,
  language: string,
): string {
  const prefixWords = prefix.trim() ? prefix.trim().split(/\s+/) : [];
  const suffixWords = suffix.trim() ? suffix.trim().split(/\s+/) : [];
  const overhead = prefixWords.length + suffixWords.length;
  const budget = Math.max(1, maxWords - overhead);

  // Step 1: Try original text as-is (no trimming needed)
  const origWords = originalText.trim().split(/\s+/).filter(Boolean);
  if (origWords.length <= budget) {
    return [prefix.trim(), originalText.trim(), suffix.trim()].filter(Boolean).join(' ');
  }

  // Step 2: Strip filler words
  const fillers = FILLER_WORDS[language] ?? FILLER_WORDS.en;
  const stripped = origWords.filter(w => !fillers.has(w.toLowerCase()));
  if (stripped.length <= budget) {
    return [prefix.trim(), stripped.join(' '), suffix.trim()].filter(Boolean).join(' ');
  }

  // Step 3: Split into sentences, pick best combination
  const sentences = originalText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  if (sentences.length > 1) {
    // Score each sentence
    const scored = sentences.map(s => ({
      text: s.trim().replace(/[.!?]+$/, ''),
      words: s.trim().replace(/[.!?]+$/, '').split(/\s+/).filter(Boolean),
      impact: scoreSentenceImpact(s, language),
    }));
    // Sort by impact descending
    scored.sort((a, b) => b.impact - a.impact);

    // Try best sentence alone (strip fillers from it too)
    const bestStripped = scored[0].words.filter(w => !fillers.has(w.toLowerCase()));
    if (bestStripped.length <= budget) {
      return [prefix.trim(), bestStripped.join(' '), suffix.trim()].filter(Boolean).join(' ');
    }

    // Try best sentence raw (without filler stripping)
    if (scored[0].words.length <= budget) {
      return [prefix.trim(), scored[0].words.join(' '), suffix.trim()].filter(Boolean).join(' ');
    }

    // Best sentence is still too long — try combining key phrases
    // Take first half from best sentence, last portion from second-best
    if (scored.length >= 2) {
      const halfBudget = Math.floor(budget / 2);
      const startWords = scored[0].words.slice(0, halfBudget);
      const endWords = scored[1].words.slice(-Math.max(1, budget - halfBudget));
      const combined = [...startWords, '—', ...endWords];
      if (combined.length <= budget + 1) { // +1 for the dash
        return [prefix.trim(), combined.join(' '), suffix.trim()].filter(Boolean).join(' ');
      }
    }
  }

  // Step 4: Fallback — strip fillers from full text and truncate
  if (stripped.length > budget) {
    const truncated = stripped.slice(0, budget).join(' ').replace(/[,;]$/, '') + '...';
    return [prefix.trim(), truncated, suffix.trim()].filter(Boolean).join(' ');
  }

  // Final fallback: raw truncation (same as old buildFixPreview)
  const truncated = origWords.slice(0, budget).join(' ').replace(/[,;]$/, '') + '...';
  return [prefix.trim(), truncated, suffix.trim()].filter(Boolean).join(' ');
}
```

### Step 1.4: Replace `buildFixPreview` calls with `smartCondense`

In `generateQuickFixes()`, replace every call to `buildFixPreview(prefix, core, suffix, maxW)` with `smartCondense(prefix, core, suffix, maxW, language)`.

There are **14 call sites** in `generateQuickFixes` (lines 471, 488, 506, 522, 539, 555, 571, 591, 626, 643, 659, 681, 697, 748, 768, 785). Each one needs `language` added as the 5th parameter.

**Also update** the `has_question` fix (line 470): instead of `words.slice(0, Math.min(words.length, 6)).join(' ')` for core, pass the FULL original text as core — let `smartCondense` decide what to keep:

Before:
```typescript
const core = words.slice(0, Math.min(words.length, 6)).join(' ').replace(/[.!?]$/, '');
const qPreview = buildFixPreview(prefix, core.toLowerCase(), suffix, maxW);
```

After:
```typescript
const core = text.replace(/[.!?]+$/, '');
const qPreview = smartCondense(prefix, core.toLowerCase(), suffix, maxW, language);
```

Apply same pattern to ALL fix generators: pass full text as core instead of pre-slicing.

### Step 1.5: Keep `buildFixPreview` as deprecated fallback

Don't delete `buildFixPreview` — keep it but add a `@deprecated` JSDoc tag. No external consumers, but it serves as fallback documentation.

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] Smart condense preserves meaning for multi-sentence text (HOOK example: "3 AI tools... Yang ketiga paling bahaya" → keeps "Yang ketiga paling bahaya" or "50 orang quit")
- [ ] Single-sentence text falls back gracefully to filler strip → truncate
- [ ] Fix previews stay within maxWords budget
- [ ] No placeholder/TODO comments in new code

---

## Phase 2: Fix Persistence Race Condition

**Estimated time:** 5 minutes

**Files:**
- Modify: `src/hooks/useSessionPersistence.ts`

**Steps:**

### Step 2.1: Add `needsImmediateSave` ref

In `useSessionPersistence`, add a ref after the existing refs (after line 175):

```typescript
const needsImmediateSave = useRef(false);
```

### Step 2.2: Add immediate save effect

Add a new `useEffect` after the auto-save effect (after line 258):

```typescript
// ── Immediate save after state update (for saveNow calls) ──
// When saveNow() is called, the state may not have updated yet (React batching).
// This effect runs AFTER the state update, ensuring we save the correct data.
useEffect(() => {
  if (needsImmediateSave.current && state.isDirty) {
    needsImmediateSave.current = false;
    // Clear any pending debounce timer to avoid double-save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    performSave();
  }
}, [state, performSave]);
```

### Step 2.3: Update `saveNow` to set the ref

Replace the current `saveNow` (lines 315-320):

Before:
```typescript
const saveNow = useCallback(async () => {
  if (saveTimerRef.current) {
    clearTimeout(saveTimerRef.current);
  }
  await performSave();
}, [performSave]);
```

After:
```typescript
const saveNow = useCallback(async () => {
  if (saveTimerRef.current) {
    clearTimeout(saveTimerRef.current);
  }
  // Set flag — the useEffect above will trigger save after state updates
  needsImmediateSave.current = true;
  // Also try saving now in case state already includes the change
  await performSave();
}, [performSave]);
```

**Why both?** Setting the ref ensures the save happens after state updates (catches the race). Calling `performSave()` too handles the case where state already updated (e.g., non-batched updates). The JSON comparison in `performSave` prevents actual double-saves — if the first save succeeded, the second is a no-op.

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] Apply fix → immediate F5 refresh → fix text is preserved (not reverted)
- [ ] Normal auto-save (5s debounce) still works for regular edits
- [ ] No double-save when state updates synchronously

---

## Phase 3: Undo for Applied Fixes

**Estimated time:** 10 minutes

**Files:**
- Modify: `src/screens/Workspace/components/SmartCompanion/SmartCompanion.tsx`
- Modify: `src/screens/Workspace/components/SmartCompanion/IssuesTab.tsx`

**Steps:**

### Step 3.1: Change `appliedFixes` type in SmartCompanion

In `SmartCompanion.tsx`, change the `appliedFixes` state from `Set<string>` to `Map<string, { originalText: string }>` (line 75):

Before:
```typescript
const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());
```

After:
```typescript
const [appliedFixes, setAppliedFixes] = useState<Map<string, { originalText: string }>>(new Map());
```

### Step 3.2: Update SmartCompanion's issueCount to use Map

In `SmartCompanion.tsx`, the `issueCount` and `displayIssueCount` memos don't need changes — they don't access `appliedFixes`. Good.

### Step 3.3: Update IssuesTab props types

In `IssuesTab.tsx`, update the props interface (lines 15-18):

Before:
```typescript
appliedFixes: Set<string>;
...
onSetAppliedFixes: React.Dispatch<React.SetStateAction<Set<string>>>;
```

After:
```typescript
appliedFixes: Map<string, { originalText: string }>;
...
onSetAppliedFixes: React.Dispatch<React.SetStateAction<Map<string, { originalText: string }>>>;
```

### Step 3.4: Update IssuesTab `appliedFixes.has()` calls

Every `appliedFixes.has(key)` call stays the same — `Map.has()` has the same API as `Set.has()`. No changes needed at lines 114, 136, 174.

### Step 3.5: Update `handleApplyFix` to store original text

In `IssuesTab.tsx`, update `handleApplyFix` (lines 118-128):

Before:
```typescript
onApplyFix(issue.segmentId, issue.fix.field, issue.fix.preview);
onSetAppliedFixes((prev) => new Set(prev).add(`${issue.segmentId}-${issue.weaknessKey}`));
```

After:
```typescript
// Store original text before applying fix (for undo)
const originalSegment = segments.find(s => s.id === issue.segmentId);
const originalText = originalSegment ? originalSegment[issue.fix.field === 'script' ? 'script' : 'script'] : '';
onApplyFix(issue.segmentId, issue.fix.field, issue.fix.preview);
const fixKey = `${issue.segmentId}-${issue.weaknessKey}`;
onSetAppliedFixes((prev) => {
  const next = new Map(prev);
  next.set(fixKey, { originalText });
  return next;
});
```

Wait — `issue.fix.field` can be `'script'` or `'visualDirection'`. Fix the originalText lookup:

```typescript
const originalSegment = segments.find(s => s.id === issue.segmentId);
const originalText = originalSegment
  ? (issue.fix.field === 'script' ? originalSegment.script : '')
  : '';
```

### Step 3.6: Update `handleFixAll` to store original texts

In `IssuesTab.tsx`, update `handleFixAll` (lines 134-166). For each applied fix, store original text:

```typescript
for (const [, issues] of grouped) {
  const sorted = [...issues].sort((a, b) => b.weight - a.weight);
  const best = sorted[0];
  if (best.fix) {
    onApplyFix(best.segmentId, best.fix.field, best.fix.preview);
  }
  for (const issue of issues) {
    const fixKey = `${issue.segmentId}-${issue.weaknessKey}`;
    const seg = segments.find(s => s.id === issue.segmentId);
    const origText = seg?.script || '';
    onSetAppliedFixes((prev) => {
      const next = new Map(prev);
      next.set(fixKey, { originalText: origText });
      return next;
    });
  }
}
```

### Step 3.7: Add `handleUndoFix` handler

Add a new handler in IssuesTab after `handleSkip` (after line 132):

```typescript
const handleUndoFix = useCallback(
  (issue: IssueItem) => {
    const fixKey = `${issue.segmentId}-${issue.weaknessKey}`;
    const fixData = appliedFixes.get(fixKey);
    if (!fixData) return;

    // Restore original text
    const field = issue.fix?.field || 'script';
    onApplyFix(issue.segmentId, field as 'script' | 'visualDirection', fixData.originalText);

    // Remove from applied fixes
    onSetAppliedFixes((prev) => {
      const next = new Map(prev);
      next.delete(fixKey);
      return next;
    });

    // Persist the undo immediately
    onSaveNow?.();
  },
  [appliedFixes, onApplyFix, onSetAppliedFixes, onSaveNow],
);
```

### Step 3.8: Add undo UI for applied fixes

Currently, applied fixes are filtered OUT of `activeIssues` (line 173-175) and not shown. We need to show them separately with an "Undo" button.

After the `activeIssues` list rendering and before the "Fix All" button, add an "Applied fixes" section:

```tsx
{/* Applied fixes with undo option */}
{visibleIssues.filter(i => appliedFixes.has(`${i.segmentId}-${i.weaknessKey}`)).length > 0 && (
  <div className="space-y-2 pt-2 border-t border-[#262626]">
    <span className="text-xs text-[#78716C] font-medium">Applied fixes</span>
    {visibleIssues
      .filter(i => appliedFixes.has(`${i.segmentId}-${i.weaknessKey}`))
      .map(issue => {
        const issueKey = `${issue.segmentId}-${issue.weaknessKey}`;
        return (
          <div key={issueKey} className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <div className="flex items-center gap-2 min-w-0">
              <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-xs text-[#A8A29E] truncate">{issue.label}</span>
              {!focusedSegmentId && (
                <span className={`text-xs px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${segmentBadgeColor(issue.segmentType)}`}>
                  {issue.segmentType}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleUndoFix(issue)}
              className="text-xs px-2 py-1 rounded text-[#78716C] hover:text-amber-400 hover:bg-amber-500/10 transition-colors flex-shrink-0"
            >
              Undo
            </button>
          </div>
        );
      })}
  </div>
)}
```

**Verification:**
- [ ] `tsc --noEmit` passes
- [ ] Apply fix → "Undo" button appears in applied fixes section
- [ ] Click "Undo" → original text restored in segment card
- [ ] Undo triggers immediate save (persists through refresh)
- [ ] Fix All → all applied fixes show "Undo" buttons
- [ ] Undo + re-apply cycles work correctly (no stale original text)
- [ ] `appliedFixes` Map survives tab switches (state lifted to SmartCompanion)
- [ ] No placeholder/TODO comments in new code

---

## Execution Options

**Option 1: Execute in this session**
> Ready to start Phase 1? I'll use gaspol-execute to implement with per-phase checkpoints.

**Option 2: Parallel execution**
> Phases 1, 2, and 3 are independent — they can run in parallel via gaspol-parallel.

**Option 3: Separate session**
> Save plan for a new session? The plan file at `docs/plans/2026-02-12-smart-fix-system.md` has everything needed.
