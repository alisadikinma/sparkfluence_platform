# Merge TopicSelection + ScriptLab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicate TopicSelection and PackageSelection screens, consolidate topic selection into ScriptLab, simplify onboarding from 7 to 6 steps.

**Architecture:** Delete TopicSelection + PackageSelection screens. ScriptLab becomes the single entry point for script creation. Onboarding ends at Avatar Upload → Dashboard. Content creation pipeline (Image→Video→FullVideo) renumbers from step 4-6.

**Tech Stack:** React 18 + TypeScript + React Router

---

### Task 1: Extract Rate Limiting Hook

**Files:**
- Create: `src/hooks/useRateLimit.ts`
- Modify: `src/screens/ScriptLab/components/TopicRecommendations.tsx`

**Step 1: Create `src/hooks/useRateLimit.ts`**

Extract the rate limiting logic currently in TopicRecommendations.tsx into a reusable hook:

```typescript
// src/hooks/useRateLimit.ts
import { useState, useEffect, useRef, useCallback } from 'react';

const REFRESH_RATE_LIMIT_KEY = 'sparkfluence_refresh_rate_limit';
const MAX_REFRESHES = 3;
const RATE_LIMIT_WINDOW = 60 * 1000; // 60 seconds
const COOLDOWN_PERIOD = 30 * 1000; // 30 seconds

interface RateLimitData {
  timestamps: number[];
  cooldownUntil: number | null;
}

export function useRateLimit() {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ... extract getRateLimitData, setRateLimitData, checkRateLimit,
  // recordRefresh, startCooldownTimer from TopicRecommendations.tsx

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  return {
    isRateLimited,
    cooldownRemaining,
    checkRateLimit,   // returns boolean
    recordRefresh,    // call after each refresh
  };
}
```

Copy the full implementation of `getRateLimitData()`, `setRateLimitData()`, `checkRateLimit()`, `recordRefresh()`, and `startCooldownTimer()` from `TopicRecommendations.tsx` (search for `REFRESH_RATE_LIMIT_KEY`).

**Step 2: Update TopicRecommendations.tsx to use the hook**

Replace the inline rate limit code in TopicRecommendations.tsx with:

```typescript
import { useRateLimit } from '../../../hooks/useRateLimit';

// Inside component:
const { isRateLimited, cooldownRemaining, checkRateLimit, recordRefresh } = useRateLimit();
```

Remove all inline rate limit functions and state from the component.

**Step 3: Verify ScriptLab still works**

Run: `npm run dev`
Test: Open `/script-lab`, click Refresh on topics, verify rate limiting still works after 3 rapid clicks.

**Step 4: Commit**

```bash
git add src/hooks/useRateLimit.ts src/screens/ScriptLab/components/TopicRecommendations.tsx
git commit -m "refactor: extract useRateLimit hook from TopicRecommendations"
```

---

### Task 2: Extract Fallback Topics Constants

**Files:**
- Create: `src/constants/fallbackTopics.ts`
- Modify: `src/screens/ScriptLab/components/TopicRecommendations.tsx`

**Step 1: Create `src/constants/fallbackTopics.ts`**

Move the fallback topics arrays from TopicRecommendations.tsx. Search for `FALLBACK_TOPICS` or the inline fallback arrays for id/en/hi/fr languages.

```typescript
// src/constants/fallbackTopics.ts
export interface FallbackTopic {
  title: string;
  description: string;
  hashtags: string[];
  source: string;
}

export const FALLBACK_TOPICS: Record<string, FallbackTopic[]> = {
  id: [ /* 9 Indonesian fallback topics */ ],
  en: [ /* 9 English fallback topics */ ],
  hi: [ /* 9 Hindi fallback topics */ ],
  fr: [ /* 9 French fallback topics */ ],
};
```

Copy the exact topic arrays from TopicRecommendations.tsx.

**Step 2: Update TopicRecommendations.tsx**

```typescript
import { FALLBACK_TOPICS } from '../../../constants/fallbackTopics';
```

Remove inline fallback topic definitions.

**Step 3: Verify**

Run: `npm run dev`
Test: Disconnect internet or cause API error, verify fallback topics appear correctly.

**Step 4: Commit**

```bash
git add src/constants/fallbackTopics.ts src/screens/ScriptLab/components/TopicRecommendations.tsx
git commit -m "refactor: extract fallback topics to shared constants"
```

---

### Task 3: Update Onboarding Navigation (Creative DNA → Avatar Upload)

**Files:**
- Modify: `src/screens/CreativeDNA/CreativeDNA.tsx` (line ~241)

**Step 1: Change navigation target**

Find line ~241 in CreativeDNA.tsx:
```typescript
// OLD:
navigate("/topic-selection");

// NEW:
navigate("/avatar-upload");
```

**Step 2: Update step progress bar total**

Find line ~275 in CreativeDNA.tsx where the progress bar maps `[1, 2, 3, 4, 5, 6, 7]`:
```typescript
// OLD:
{[1, 2, 3, 4, 5, 6, 7].map((step) => (
  <div key={step} className={`h-1 rounded-full flex-1 ${step <= 3 ? '...' : '...'}`} />
))}

// NEW:
{[1, 2, 3, 4, 5, 6].map((step) => (
  <div key={step} className={`h-1 rounded-full flex-1 ${step <= 3 ? '...' : '...'}`} />
))}
```

**Step 3: Verify**

Run: `npm run dev`
Test: Go through onboarding to Creative DNA, click Next → should go to `/avatar-upload`, progress bar shows 6 steps.

**Step 4: Commit**

```bash
git add src/screens/CreativeDNA/CreativeDNA.tsx
git commit -m "feat: update Creative DNA to navigate to Avatar Upload (skip topic selection)"
```

---

### Task 4: Update Avatar Upload (Last Onboarding Step → Dashboard)

**Files:**
- Modify: `src/screens/AvatarUpload/AvatarUpload.tsx`

**Step 1: Find where Avatar Upload navigates after completion**

Look for `navigate(` calls — change the post-completion navigation to `/dashboard` or `/script-lab`.

**Step 2: Update step progress bar if present**

If Avatar Upload has a step indicator, update total to 6 and set current step to 5 (was likely 6 of 7).

**Step 3: Update back button**

Ensure back button navigates to `/creative-dna` (not `/topic-selection`).

**Step 4: Verify**

Run: `npm run dev`
Test: Complete Avatar Upload → should land on Dashboard.

**Step 5: Commit**

```bash
git add src/screens/AvatarUpload/AvatarUpload.tsx
git commit -m "feat: Avatar Upload navigates to Dashboard after completion"
```

---

### Task 5: Update All Onboarding Step Progress Bars

**Files:**
- Modify: `src/screens/NicheRecommendations/NicheRecommendations.tsx` (line ~273) — `[1,...,7]` → `[1,...,6]`, threshold `step <= 2`
- Modify: `src/screens/Onboarding/Onboarding.tsx` (line ~453) — update total steps if referenced
- Modify: `src/screens/ImageGeneration/ImageGeneration.tsx` (line ~2551) — `step <= 5` becomes `step <= 4`, total 7→6, also line ~2570: "5/7" → "4/6"
- Modify: `src/screens/VideoGeneration/VideoGeneration.tsx` (line ~2073) — `step <= 6` becomes `step <= 5`, total 7→6
- Modify: `src/screens/MusicSelector/MusicSelector.tsx` (line ~115) — `step <= 6` becomes `step <= 5`, total 7→6
- Modify: `src/screens/Loading/Loading.tsx` (line ~167) — all filled, total 7→6
- Modify: `src/screens/FullVideo/FullVideo.tsx` (line ~1943) — all filled, total 7→6

**Step renumbering guide:**

| Screen | Old Step | New Step | Old Total | New Total |
|--------|----------|----------|-----------|-----------|
| Onboarding | 1-2 of 7 | 1-2 of 6 | 7 | 6 |
| NicheRecommendations | 2 of 7 | 2 of 6 | 7 | 6 |
| CreativeDNA | 3 of 7 | 3 of 6 | 7 | 6 |
| ~~TopicSelection~~ | ~~4 of 7~~ | DELETED | - | - |
| ImageGeneration | 5 of 7 | 4 of 6 | 7 | 6 |
| VideoGeneration | 6 of 7 | 5 of 6 | 7 | 6 |
| MusicSelector | 6 of 7 | 5 of 6 | 7 | 6 |
| Loading | 7 of 7 | 6 of 6 | 7 | 6 |
| FullVideo | 7 of 7 | 6 of 6 | 7 | 6 |

**Step 1: Update each file**

In each file, find `[1, 2, 3, 4, 5, 6, 7].map` and change to `[1, 2, 3, 4, 5, 6].map`. Update the `step <= N` threshold per the table above.

**Step 2: Update text labels**

In ImageGeneration.tsx (line ~2570), update the step text:
```typescript
// OLD: {uiText.step} 5/7
// NEW: {uiText.step} 4/6
```

**Step 3: Verify**

Run: `npm run dev`
Test: Walk through the full flow — each screen should show correct step number out of 6.

**Step 4: Commit**

```bash
git add src/screens/NicheRecommendations/NicheRecommendations.tsx src/screens/Onboarding/Onboarding.tsx src/screens/ImageGeneration/ImageGeneration.tsx src/screens/VideoGeneration/VideoGeneration.tsx src/screens/MusicSelector/MusicSelector.tsx src/screens/Loading/Loading.tsx src/screens/FullVideo/FullVideo.tsx
git commit -m "feat: update step progress bars from 7 to 6 steps"
```

---

### Task 6: Update Navigation References to /topic-selection

**Files:**
- Modify: `src/screens/ContentCuration/ContentCuration.tsx` (lines ~35, ~64, ~74)
- Modify: `src/screens/ImageGeneration/ImageGeneration.tsx` (lines ~1371, ~1399, ~1402, ~2319)

**Step 1: ContentCuration.tsx**

Change all `navigate("/topic-selection")` and `navigate("/topic-selection", { state: {...} })` to `navigate("/script-lab")` (or `/script-lab` with the same state).

**Step 2: ImageGeneration.tsx**

These are likely "back" or "start over" navigations. Change:
```typescript
// Lines ~1371, ~1399, ~1402:
navigate('/topic-selection') → navigate('/script-lab')

// Line ~2319:
navigate("/topic-selection", { state: { returning: true } }) → navigate("/script-lab")
```

**Step 3: Verify**

Test: In Image Generation, click back/start over → should go to `/script-lab`.

**Step 4: Commit**

```bash
git add src/screens/ContentCuration/ContentCuration.tsx src/screens/ImageGeneration/ImageGeneration.tsx
git commit -m "feat: redirect all /topic-selection references to /script-lab"
```

---

### Task 7: Update Router + Delete Screens

**Files:**
- Modify: `src/index.tsx` (lines ~81, ~88)
- Delete: `src/screens/TopicSelection/TopicSelection.tsx`
- Delete: `src/screens/TopicSelection/index.ts`
- Delete: `src/screens/PackageSelection/PackageSelection.tsx`
- Delete: `src/screens/PackageSelection/index.ts`

**Step 1: Update router in index.tsx**

Remove old route definitions:
```typescript
// DELETE these lines:
<Route path="/package-selection" element={<PackageSelection />} />
<Route path="/topic-selection" element={<TopicSelection />} />
```

Add redirect safety nets:
```typescript
import { Navigate } from 'react-router-dom';

// Add redirects for old bookmarks:
<Route path="/topic-selection" element={<Navigate to="/script-lab" replace />} />
<Route path="/package-selection" element={<Navigate to="/pricing" replace />} />
```

Remove unused imports:
```typescript
// DELETE:
import { TopicSelection } from './screens/TopicSelection';
import { PackageSelection } from './screens/PackageSelection';
```

**Step 2: Delete screen files**

Delete the following files:
- `src/screens/TopicSelection/TopicSelection.tsx`
- `src/screens/TopicSelection/index.ts`
- `src/screens/PackageSelection/PackageSelection.tsx`
- `src/screens/PackageSelection/index.ts`

**Step 3: Verify build**

Run: `npm run build`
Expected: No import errors, no broken references.

**Step 4: Verify dev**

Run: `npm run dev`
Test:
- Navigate to `/topic-selection` → should redirect to `/script-lab`
- Navigate to `/package-selection` → should redirect to `/pricing`
- ScriptLab works as before (topic search, generation, etc.)

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: remove TopicSelection and PackageSelection screens, add redirects"
```

---

### Task 8: Final Verification

**Step 1: Full onboarding flow test**

1. Sign up new user or clear onboarding state
2. Welcome → Onboarding (interest/profession) → Niche → Creative DNA → Avatar Upload → Dashboard
3. Verify: 6 total steps, progress bar correct at each step
4. Verify: No broken navigation, no 404s

**Step 2: Content creation flow test**

1. From Dashboard, go to Script Lab
2. Select a trending topic or type custom topic
3. Click Generate → should generate script
4. Image Generation screen → step should show 4/6
5. Video Generation → 5/6
6. Full Video → 6/6

**Step 3: Edge cases**

- Visit `/topic-selection` directly → redirects to `/script-lab`
- Visit `/package-selection` directly → redirects to `/pricing`
- Back button in Image Generation → goes to `/script-lab`

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during verification"
```
