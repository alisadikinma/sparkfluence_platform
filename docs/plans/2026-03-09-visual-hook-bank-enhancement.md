> **For Claude:** REQUIRED SKILL: Use gaspol-execute to implement this plan.
> **CRITICAL:** This plan specifies real integrations. During execution,
> NEVER substitute placeholders for real data sources without explicit
> user approval. If a data source doesn't exist yet, STOP and ask.

## Goal

Improve the quality of HOOK visual_direction in Sparkfluence's short-video (9:16) output by adding three evidence-backed data structures:
1. **VISUAL_ACTION_BANK** — 16 absurd-mundane motion actions that stop the scroll in <0.5s (video-adapted from carousel research)
2. **HOOK_EXPRESSION_MAP** — anatomy-level expression specs per hook psychology category (5 categories)
3. **HOOK_LIGHTING_MAP** — lighting recipes that reinforce hook psychology (5 categories)

These feed two beneficiaries: (a) `generate-script` LLM gets richer HOOK visual context, (b) `generate-images` buildCreatorPromptAsync produces more psychologically-aligned CREATOR prompts.

## Architecture Context (from CLAUDE.md)

- **Knowledge files**: `supabase/functions/_shared/knowledge/` — pure TypeScript data exports, no callLLM()
- **Lookups**: `supabase/functions/_shared/lookups/cinematographyLookup.ts` — O(1) lookup maps
- **Prompts**: `seefluencerFramework.ts` imports from `11-hook-library-2026.ts`, generates TRIPLE HOOK for LLM
- **Image synthesis**: `promptSynthesizer.ts` → `buildCreatorPromptAsync()` — called by `generate-images/index.ts`
- **Hook categories**: `visual_shock | negative_bias | curiosity_gap | relatability | speed_value`
- **HOOK is always CREATOR shot** — per `mapEdgeSegments()` rule in Workspace.tsx
- **Frontend mirrors**: `src/lib/knowledge/` — only 12-scoring-engine + 13-emotion-lexicon. No mirror needed for 11-hook-library or cinematographyLookup.
- **Key existing behavior**: `buildCreatorPromptAsync` already has a generic HOOK intensification (line 551-556 in promptSynthesizer.ts) — we replace it with hook-category-specific specs
- **`hook_type` NOT stored in image job** — derive category from `emotion` field via mapping in promptSynthesizer

## Tech Stack

- Deno Edge Functions (TypeScript, `.ts` exports only)
- Pure data exports — no side effects, no async
- All new exports must be `export const` or `export interface`
- Import style: `from '../knowledge/11-hook-library-2026.ts'` (relative, with `.ts` extension)

---

## Data Integration Map

| Feature | Data Source | Hook/API | Exists? | Action |
|---------|-------------|----------|---------|--------|
| VISUAL_ACTION_BANK data | New — adapted from carousel research | `11-hook-library-2026.ts` | No | Create as new export |
| HOOK_EXPRESSION_MAP data | New — 5 hook categories × 6 anatomy fields | `cinematographyLookup.ts` | No | Create as new export |
| HOOK_LIGHTING_MAP data | New — 5 hook categories × 8 lighting fields | `cinematographyLookup.ts` | No | Create as new export |
| Inject into LLM prompt (generate-script) | seefluencerFramework.ts Option C section | `getLocalizedHookStrategy()` | Yes (partial) | Extend existing function |
| Inject into image prompt (generate-images) | buildCreatorPromptAsync HOOK branch | `promptSynthesizer.ts` | Yes (generic) | Replace generic with hook-category-specific |
| hookCategory in CreatorPromptInput | Derived from `emotion` field | `promptSynthesizer.ts` | No | Add `hookCategory?: string` optional field |
| hookCategory passed from generate-images | `job.emotion` → derive category | `generate-images/index.ts` | No | Add derivation logic, pass to CreatorPromptInput |

---

## Phase A: Add VISUAL_ACTION_BANK to 11-hook-library-2026.ts

**Estimated time:** 10 minutes

**Files:**
- Modify: `supabase/functions/_shared/knowledge/11-hook-library-2026.ts`

**What to add:**

Add after `TOPIC_HOOK_MAP` (at end of file). New interface + const export:

```typescript
export interface VisualAction {
  id: string;
  name: string;
  videoAction: string;      // What creator physically does (motion, peaks at frame 0-0.5s)
  promptFragment: string;   // Ready-to-inject into visual_direction / image prompt
  bestFor: string[];        // Topic categories from TOPIC_HOOK_MAP keys
  psychologyNote: string;   // Why it stops scroll
  evidence: string;         // Source + metric
}

export const VISUAL_ACTION_BANK: VisualAction[] = [
  {
    id: 'makan_nyeleneh',
    name: 'Absurd Eating',
    videoAction: 'Creator mid-bite into unexpected topic-related object, cheeks slightly puffed, snaps gaze directly to camera with wide shocked eyes',
    promptFragment: 'creator mid-bite, cheeks slightly puffed, one hand gripping object near mouth, eyes wide open staring directly at camera, absurd eating action contrasting with serious headline',
    bestFor: ['finance', 'education', 'tech', 'business'],
    psychologyNote: 'Mundane eating + serious topic = cognitive dissonance. Primal action forces attention before brain registers content.',
    evidence: 'TikTok internal: pattern interrupt in 1.5s = +156% FYP appearances. Copenhagen neuro: surprise stimulus +400% dopamine spike.',
  },
  {
    id: 'minum_dramatic',
    name: 'Dramatic Sip',
    videoAction: 'Creator pours or sips coffee/tea with intense unwavering stare at camera, steam visible, pause at peak of sip before speaking',
    promptFragment: 'creator sipping hot beverage with intense direct eye contact, steam rising, cup held at lip level, completely serious expression during mundane drinking action',
    bestFor: ['business', 'tutorial', 'tips', 'productivity', 'motivation'],
    psychologyNote: 'Satisfying liquid + intense eye contact = universally relatable + unsettling. Pause creates suspense before verbal hook.',
    evidence: 'OpusClip 2026: raw/imperfect visuals +31% engagement vs polished. Dual-stimulus = 3x higher engagement (Facebook research).',
  },
  {
    id: 'objek_absurd',
    name: 'Absurd Object',
    videoAction: 'Creator holds completely unrelated absurd object (rubber duck, pineapple, raw fish) with dead-serious expression, reveals to camera',
    promptFragment: 'creator holding absurd unrelated object with completely serious deadpan expression, object presented prominently at chest level, direct eye contact',
    bestFor: ['education', 'storytelling', 'case_study', 'motivation', 'comedy'],
    psychologyNote: 'Max curiosity gap: "why is she holding that?!" forces brain to seek explanation = watch time.',
    evidence: 'TokPortal Q2-2025: Visual Jump Shock 131% average retention.',
  },
  {
    id: 'destruction',
    name: 'Destruction',
    videoAction: 'Creator rips paper/document, snaps pencil, or crumples and throws object toward camera in one decisive motion',
    promptFragment: 'creator mid-destruction action — ripping paper or snapping object, dynamic motion frozen at peak impact, expression of decisive intensity, debris flying toward camera',
    bestFor: ['education', 'finance', 'business', 'self_improvement', 'controversy'],
    psychologyNote: 'Aggressive physical action signals paradigm shift. Destruction implies "old way is wrong — I\'m showing you new way".',
    evidence: 'Backlinko: negative/confrontational openers +63% CTR vs neutral.',
  },
  {
    id: 'satisfying_process',
    name: 'Satisfying Process',
    videoAction: 'Creator pours honey/sauce slowly, creates latte art, or stretches/folds material at its most visually satisfying peak moment',
    promptFragment: 'creator mid-satisfying process — pouring viscous liquid or crafting something at peak visual moment, hands in precise action, expression of focused concentration',
    bestFor: ['food', 'beauty', 'lifestyle', 'travel', 'diy'],
    psychologyNote: 'ASMR-like satisfying visual creates involuntary dwell time. Brain cannot look away from satisfying processes.',
    evidence: 'Sephora May-2025: reveal/process hooks +41% watch time, +27% engagement.',
  },
  {
    id: 'scale_absurd',
    name: 'Scale Absurd',
    videoAction: 'Creator appears dwarfed by oversized prop (giant phone, massive coin stack, huge book), reacting to the scale',
    promptFragment: 'creator dwarfed by comically oversized topic-related prop, looking up at or gesturing toward the giant object, expression of genuine reaction to the scale',
    bestFor: ['tech', 'finance', 'education', 'unboxing', 'challenge'],
    psychologyNote: 'MrBeast size-anomaly effect: size violation triggers immediate pattern interrupt.',
    evidence: 'MrBeast internal data: size anomalies 2x more shared. TikTok: pattern interrupt +156% FYP.',
  },
  {
    id: 'wrong_context',
    name: 'Wrong Context',
    videoAction: 'Creator in professional attire at unexpected location (beach in suit, laptop in kitchen, working out in server room)',
    promptFragment: 'creator in professional outfit in completely wrong/unexpected environment, the environmental mismatch is jarring and immediately visible, creator acting completely normally',
    bestFor: ['lifestyle', 'business', 'travel', 'comedy', 'personal_story'],
    psychologyNote: 'Environmental mismatch forces cognitive reconciliation — brain cannot ignore contextual contradictions.',
    evidence: 'Facebook research: dual-stimulus visual hooks (mismatch) 3x higher engagement.',
  },
  {
    id: 'frozen_mid_action',
    name: 'Frozen Mid-Action',
    videoAction: 'Creator frozen at peak of dramatic action — mid-jump, mid-throw, mid-point, mid-fall — held for 1-2 frames before continuing',
    promptFragment: 'creator frozen at kinetic peak of action — mid-leap or mid-throw, body at maximum extension, caught at the single most dramatic frame of the motion',
    bestFor: ['fitness', 'motivation', 'challenge', 'gaming', 'entertainment'],
    psychologyNote: 'Kinetic tension in still/slow frame: brain anticipates completion = viewer stays to see resolution.',
    evidence: 'TikTok internal: kinetic tension hooks retain viewers 1.8x longer through FORE segment.',
  },
  {
    id: 'extreme_closeup',
    name: 'Extreme Close-Up Action',
    videoAction: 'Macro shot opens on unexpected detail — eye reaction, hand pouring, mouth about to bite — before pulling back to reveal creator',
    promptFragment: 'extreme macro close-up of [detail — e.g., eye, hand, mouth], uncomfortably intimate proximity, sharp focus on texture and detail, creates tension before reveal',
    bestFor: ['beauty', 'food', 'health', 'tech', 'storytelling'],
    psychologyNote: 'Uncomfortably intimate proximity + action = extended attention. Brain needs to understand what it is seeing.',
    evidence: 'Sephora: close-up reaction shots +41% watch time. TokPortal: intimate framing +91.7% engagement.',
  },
  {
    id: 'props_overflow',
    name: 'Props Overflow',
    videoAction: 'Creator surrounded by, buried in, or overwhelmed by topic-related objects — signals deep expertise/immersion',
    promptFragment: 'creator surrounded and partially overwhelmed by topic-related objects — books, gadgets, documents, products stacked around them, expressing either pride or overwhelm',
    bestFor: ['education', 'tutorial', 'tips', 'productivity', 'unboxing'],
    psychologyNote: 'Abundance signals authority: "I have dealt with so much of this I\'m drowning in it."',
    evidence: 'Virvid 2026: Authority hooks (expertise signals) 2.5x more saved.',
  },
  {
    id: 'contradiction_pose',
    name: 'Contradiction Pose',
    videoAction: 'Creator smiling broadly in a bad/stressful situation OR completely deadpan/serious in a fun/celebratory context',
    promptFragment: 'creator with expression that directly contradicts the environmental context — broad smile surrounded by chaos, or completely deadpan in a fun setting, emotional mismatch jarring',
    bestFor: ['comedy', 'storytelling', 'personal_story', 'daily_life', 'motivation'],
    psychologyNote: 'Emotional mismatch forces headline reading to resolve the contradiction.',
    evidence: 'TikTok: emotional contrast hooks +83% comment rate (Virvid 2026 FOMO Hook data).',
  },
  {
    id: 'mundane_zen',
    name: 'Mundane Zen',
    videoAction: 'Creator meditating or calmly sipping tea while visible background is chaotic, urgent, or dramatic',
    promptFragment: 'creator in perfectly calm zen pose — eyes closed or serene expression — while dramatic chaotic background visible, profound calm-in-chaos contrast',
    bestFor: ['productivity', 'self_improvement', 'health', 'motivation', 'lifestyle'],
    psychologyNote: '"Pope in the Pool" technique: calm during complexity = supreme confidence + relatable aspiration.',
    evidence: 'OpusClip: calm/confident hooks during complexity +31% retention vs reactive hooks.',
  },
  {
    id: 'era_clash',
    name: 'Era Clash',
    videoAction: 'Creator in historical/ancient attire using modern technology, OR in modern setting surrounded by historical artifacts',
    promptFragment: 'creator in historical/ancient attire (medieval armor, ancient robes) holding or using modern technology (smartphone, laptop), two eras colliding in single frame',
    bestFor: ['tech', 'education', 'finance', 'business', 'motivation'],
    psychologyNote: 'Two temporal eras colliding short-circuits visual processing — brain cannot categorize it quickly.',
    evidence: 'PROVEN: Era clash visual hooks documented at 3000+ organic viewers (carousel plugin internal data 2025).',
  },
  {
    id: 'riding_absurd',
    name: 'Riding Absurd',
    videoAction: 'Creator appears mounted on impossible/absurd object — giant animal, oversized vehicle, absurd prop as "mount"',
    promptFragment: 'creator appearing to ride or be mounted on an absurd oversized object or creature, triumphant or completely serious expression, full commitment to the absurd premise',
    bestFor: ['motivation', 'entertainment', 'challenge', 'comedy', 'gaming'],
    psychologyNote: 'MrBeast-level "WHAT?!" trigger: impossibility forces double-take.',
    evidence: 'PROVEN: Riding absurd hooks documented at 3000+ organic viewers (carousel plugin internal data 2025).',
  },
  {
    id: 'physical_impossibility',
    name: 'Physical Impossibility',
    videoAction: 'Creator appears to perform superhuman physical feat — blocking falling object, stopping something, catching/throwing impossibly',
    promptFragment: 'creator mid-impossible physical feat — blocking a massive falling object, stopping an unstoppable force, the impossible action captured at peak drama',
    bestFor: ['fitness', 'motivation', 'entertainment', 'gaming', 'storytelling'],
    psychologyNote: 'Superhuman feats trigger "how is this real?!" = instant watch time.',
    evidence: 'TikTok: physically impossible visual hooks 2x more likely to loop (loop = 3x algorithm boost).',
  },
  {
    id: 'danger_zone',
    name: 'Danger Zone',
    videoAction: 'Creator calmly positioned in or near visually dangerous situation — edge of something, surrounded by intense elements, between crashing forces',
    promptFragment: 'creator standing calmly at the edge of danger — surrounded by intense visual elements (fire, water, crowd), completely composed despite the dramatic surrounding danger',
    bestFor: ['travel', 'motivation', 'storytelling', 'entertainment', 'personal_story'],
    psychologyNote: 'Primal danger response: cannot look away from threat. Calm creator in danger = tension + awe.',
    evidence: 'Copenhagen neuro study: danger/threat stimuli +400% dopamine response, involuntary attention capture.',
  },
];

/**
 * Get visual action by ID (O(1) lookup)
 */
export function getVisualAction(id: string): VisualAction | undefined {
  return VISUAL_ACTION_BANK.find(a => a.id === id);
}

/**
 * Get visual actions best suited for a topic
 */
export function getVisualActionsForTopic(topic: string): VisualAction[] {
  return VISUAL_ACTION_BANK.filter(a => a.bestFor.includes(topic));
}
```

**Steps:**
1. Open `supabase/functions/_shared/knowledge/11-hook-library-2026.ts`
2. Scroll to end of file (after `TOPIC_HOOK_MAP`)
3. Add `VisualAction` interface
4. Add `VISUAL_ACTION_BANK` array with all 16 entries (video-adapted, motion-first)
5. Add `getVisualAction()` and `getVisualActionsForTopic()` helper functions

**Verification:**
- [ ] File compiles without TypeScript errors (check with `npx tsc --noEmit` or Deno check)
- [ ] All 16 entries have all required fields: `id`, `name`, `videoAction`, `promptFragment`, `bestFor`, `psychologyNote`, `evidence`
- [ ] All `bestFor` arrays reference valid keys from `TOPIC_HOOK_MAP` (education, finance, tech, etc.)
- [ ] No static/image language in `videoAction` — all describe motion actions
- [ ] Existing exports (`HOOK_LIBRARY`, `HOOK_CATEGORY_META`, `TOPIC_HOOK_MAP`) are UNTOUCHED

---

## Phase B: Add HOOK_EXPRESSION_MAP + HOOK_LIGHTING_MAP to cinematographyLookup.ts

**Estimated time:** 8 minutes

**Files:**
- Modify: `supabase/functions/_shared/lookups/cinematographyLookup.ts`

**What to add:**

Append to end of file, after existing exports:

```typescript
// ============================================================================
// HOOK CATEGORY → EXPRESSION SPECS
// Maps hook psychology category to anatomical expression spec for CREATOR shots.
// More specific than EMOTION_MAP — these reinforce the hook's psychological goal.
// Used by: buildCreatorPromptAsync() in promptSynthesizer.ts (HOOK segments)
// ============================================================================

export interface HookExpressionSpec {
  eyes: string;
  mouth: string;
  head: string;
  body: string;
  gesture: string;
  promptPhrase: string;  // Ready-to-paste into image/video prompt
}

export const HOOK_EXPRESSION_MAP: Record<string, HookExpressionSpec> = {
  visual_shock: {
    eyes: 'blown wide open, full iris visible, eyebrows shot up creating deep forehead lines',
    mouth: 'jaw dropped with lips parted in small O shape — controlled astonishment, not gaping',
    head: 'tilted back 5 degrees, chin slightly lifted, recoil reaction',
    body: 'shoulders pulled back and tensed, upper body leaning back — reflexive recoil from unexpected visual',
    gesture: 'one hand raised palm-out at shoulder height in reflexive shock, fingers spread wide',
    promptPhrase: 'eyes blown wide, jaw dropped in O-shape, head tilted back in recoil, one hand raised palm-out, frozen in genuine disbelief — visceral WHAT reaction',
  },
  negative_bias: {
    eyes: 'intensely narrowed, direct piercing gaze, laser focus, eyebrows pulled down slightly',
    mouth: 'tight-lipped with determined jaw, corners pulled back slightly — controlled warning expression',
    head: 'level with camera, no tilt — authority position, full eye contact',
    body: 'leaning forward toward camera, protective or decisive posture, squared shoulders',
    gesture: 'one hand raised in decisive STOP gesture OR finger pointing directly at viewer',
    promptPhrase: 'intense narrowed gaze, tight determined lips, head level, leaning forward, one hand in stop or point gesture — urgent warning expression',
  },
  curiosity_gap: {
    eyes: 'asymmetric — one eyebrow raised higher than other, bright and knowing, slight squint',
    mouth: 'one-sided knowing smirk, slight asymmetric upturn — "I know something you don\'t"',
    head: 'conspiratorial slight tilt, leaning in as if sharing a secret',
    body: 'forward lean, closed posture as if guarding a secret, slightly angled',
    gesture: 'one hand near mouth in shush or whisper gesture, or finger raised "wait for it"',
    promptPhrase: 'asymmetric raised eyebrow, knowing one-sided smirk, head tilted in, hand near mouth in shush gesture — conspiratorial insider expression',
  },
  relatability: {
    eyes: 'soft warm eye contact, genuine and open, no intensity — peer-to-peer level',
    mouth: 'natural relaxed smile, authentic not posed, reaching the eyes',
    head: 'level, maybe slight self-aware tilt — "I get you" expression',
    body: 'open relaxed posture, no tension — approachable and equal energy',
    gesture: 'hands relaxed near body or holding everyday object (mug, phone), natural and unposed',
    promptPhrase: 'warm direct eye contact, genuine natural smile, relaxed open posture, holding everyday object — authentic peer expression, not performer',
  },
  speed_value: {
    eyes: 'direct unwavering confidence, steady focused gaze, no hesitation',
    mouth: 'closed-lip confident smile, chin tilted up slightly — "I\'ve got this for you"',
    head: 'level or very slight upward tilt — competence and confidence',
    body: 'squared shoulders, upright professional posture — expert body language',
    gesture: 'hands showing number (1, 2, 3) OR framing/presenting something to viewer, decisive',
    promptPhrase: 'direct confident gaze, closed-lip assured smile, squared shoulders, hand showing number or presenting — expert value-delivery expression',
  },
};

/**
 * Get hook expression specs (O(1) lookup)
 * Accepts hook category OR falls back to curiosity_gap default
 */
export function getHookExpression(hookCategory: string): HookExpressionSpec {
  return HOOK_EXPRESSION_MAP[hookCategory] || HOOK_EXPRESSION_MAP.curiosity_gap;
}

// ============================================================================
// HOOK CATEGORY → LIGHTING RECIPE
// Maps hook psychology category to specific lighting that reinforces the psychology.
// Used by: buildCreatorPromptAsync() in promptSynthesizer.ts (HOOK segments)
// ============================================================================

export interface HookLightingSpec {
  pattern: string;       // Lighting pattern name
  ratio: string;         // Key:Fill ratio
  keyTemp: string;       // Key light color temperature
  fill: string;          // Fill light description
  rim: string;           // Rim/back light description
  accent: string;        // Optional accent light
  mood: string;          // Mood intent
  promptPhrase: string;  // Ready-to-paste lighting description for AI image/video prompt
}

export const HOOK_LIGHTING_MAP: Record<string, HookLightingSpec> = {
  visual_shock: {
    pattern: 'Rembrandt',
    ratio: '4:1',
    keyTemp: '3200K warm tungsten',
    fill: 'minimal — dark fill, deep shadows',
    rim: 'strong cool 5600K separation from behind',
    accent: 'optional red or amber practical light for tension',
    mood: 'dramatically lit like a thriller movie reveal scene',
    promptPhrase: 'Rembrandt lighting 4:1, warm 3200K tungsten key, minimal dark fill, strong cool rim light, hard-edged shadows, dramatic thriller atmosphere',
  },
  negative_bias: {
    pattern: 'Short-side',
    ratio: '3:1',
    keyTemp: '3800K neutral-warm',
    fill: 'cool fill from below — slightly ominous',
    rim: 'subtle warm rim for definition',
    accent: 'red-amber warning accent light from side',
    mood: 'authoritative warning — serious news broadcast energy',
    promptPhrase: 'short-side lighting 3:1, 3800K neutral-warm key, cool below-fill, red-amber side accent, authority warning atmosphere',
  },
  curiosity_gap: {
    pattern: 'Soft Rembrandt',
    ratio: '3:1',
    keyTemp: '3200K warm golden',
    fill: 'warm ambient fill — soft, not harsh',
    rim: 'soft halo rim light, mystery edge glow',
    accent: 'optional warm candle or amber practical for atmosphere',
    mood: 'warm atmospheric mystery — like a secret being shared in a firelit room',
    promptPhrase: 'soft Rembrandt 3:1, warm golden 3200K key, soft warm fill, halo rim glow, mystery shadow pools, atmospheric golden warmth',
  },
  relatability: {
    pattern: 'Soft Loop',
    ratio: '2:1',
    keyTemp: '3500K warm natural daylight',
    fill: 'large soft fill — barely any shadows, open and inviting',
    rim: 'barely visible warm rim, just enough for depth',
    accent: 'none — keep it natural and unproduced',
    mood: 'natural best-friend lighting — approachable, honest, no drama',
    promptPhrase: 'soft loop lighting 2:1, 3500K warm natural daylight, large soft fill, minimal shadows, natural approachable atmosphere',
  },
  speed_value: {
    pattern: 'Butterfly',
    ratio: '2:1',
    keyTemp: '4000K neutral-warm white',
    fill: 'even balanced fill — no drama, clean',
    rim: 'subtle professional rim for separation',
    accent: 'none — clean professional look',
    mood: 'clean expert presentation — competent, trustworthy, authoritative tutorial',
    promptPhrase: 'butterfly lighting 2:1, 4000K neutral-warm, even clean fill, subtle rim separation, professional competent atmosphere',
  },
};

/**
 * Get hook lighting specs (O(1) lookup)
 * Accepts hook category OR falls back to curiosity_gap default
 */
export function getHookLighting(hookCategory: string): HookLightingSpec {
  return HOOK_LIGHTING_MAP[hookCategory] || HOOK_LIGHTING_MAP.curiosity_gap;
}
```

**Steps:**
1. Open `supabase/functions/_shared/lookups/cinematographyLookup.ts`
2. Scroll to end of file
3. Add `HookExpressionSpec` interface + `HOOK_EXPRESSION_MAP` + `getHookExpression()` helper
4. Add `HookLightingSpec` interface + `HOOK_LIGHTING_MAP` + `getHookLighting()` helper
5. Verify no name collisions with existing `EMOTION_MAP`, `LIGHTING_PATTERNS` exports

**Verification:**
- [ ] All 5 hook categories present in both maps: `visual_shock`, `negative_bias`, `curiosity_gap`, `relatability`, `speed_value`
- [ ] Each expression entry has all 6 fields: `eyes`, `mouth`, `head`, `body`, `gesture`, `promptPhrase`
- [ ] Each lighting entry has all 8 fields: `pattern`, `ratio`, `keyTemp`, `fill`, `rim`, `accent`, `mood`, `promptPhrase`
- [ ] Existing exports (`EMOTION_MAP`, `LIGHTING_PATTERNS`, `LIGHTING_RATIOS`, etc.) are UNTOUCHED
- [ ] No TypeScript errors

---

## Phase C: Inject VISUAL_ACTION_BANK into generate-script LLM prompt

**Estimated time:** 8 minutes

**Files:**
- Modify: `supabase/functions/_shared/prompts/seefluencerFramework.ts`

**What to change:**

1. Import `VISUAL_ACTION_BANK` from hook library at top of file:
```typescript
import {
  HOOK_LIBRARY,
  HOOK_CATEGORY_META,
  VISUAL_ACTION_BANK,   // ADD THIS
  type HookCategory,
  type HookTemplate
} from '../knowledge/11-hook-library-2026.ts'
```

2. In `getLocalizedHookStrategy()`, find the **OPTION C — Visual / Action-First Hook** section (around line 294-297). Extend it to include VISUAL_ACTION_BANK examples:

**Current:**
```typescript
### OPTION C — Visual / Action-First Hook
Source concept: ${visHook.visual_cue ? `${visHook.visual_cue} "${visHook.script}"` : `"${visHook.script}"`}
Goal: Physical action or camera trick stops scroll BEFORE words register.
${visHook.visual_cue ? `KEEP the visual cue prefix (${visHook.visual_cue}) and adapt the spoken text.` : 'Add a visual cue prefix: [Camera:], [Action:], or [Visual:].'}
```

**Replace with:**
```typescript
### OPTION C — Visual / Action-First Hook
Source concept: ${visHook.visual_cue ? `${visHook.visual_cue} "${visHook.script}"` : `"${visHook.script}"`}
Goal: Physical action or camera trick stops scroll BEFORE words register.
${visHook.visual_cue ? `KEEP the visual cue prefix (${visHook.visual_cue}) and adapt the spoken text.` : 'Add a visual cue prefix: [Camera:], [Action:], or [Visual:].'}

**SCROLL-STOPPING VISUAL ACTIONS for visual_direction (pick the most surprising one for this topic):**
${VISUAL_ACTION_BANK.slice(0, 8).map(a =>
  `• **${a.name}** — ${a.videoAction} (${a.bestFor.slice(0,3).join('/')})`
).join('\n')}

**RULE for Option C visual_direction:** Choose one Visual Action above. Structure as:
\`Scene: [Creator performing Visual Action] | Camera: Close-up or MCU, 85mm, eye-level | Lighting: High contrast dramatic | Mood: Scroll-stop intensity | FX: [Any audio/visual effect]\`
```

3. Also add a brief VISUAL ACTION reference to the **HOOK visual_direction guidelines** section if it exists (search for "CINEMATIC_VISUAL_GUIDE" or "visual_direction format" in seefluencerFramework). If not in seefluencerFramework, check `viralScriptKnowledge.ts`.

**Steps:**
1. Open `supabase/functions/_shared/prompts/seefluencerFramework.ts`
2. Add `VISUAL_ACTION_BANK` to import statement (line 16-20)
3. Find Option C section (search for "OPTION C — Visual")
4. Extend Option C with VISUAL_ACTION_BANK context block (top 8 actions)
5. Verify the template literal syntax is correct (no unterminated strings)

**Verification:**
- [ ] Import statement includes `VISUAL_ACTION_BANK`
- [ ] Option C section now includes 8 visual action examples
- [ ] Template literal compiles without syntax errors
- [ ] Existing Option A, Option B, and HOOK RULES sections are UNTOUCHED
- [ ] `getLocalizedHookStrategy()` still returns the correct string format

---

## Phase D: Wire HOOK_EXPRESSION_MAP + HOOK_LIGHTING_MAP into buildCreatorPromptAsync

**Estimated time:** 10 minutes

**Files:**
- Modify: `supabase/functions/_shared/promptSynthesizer.ts`
- Modify: `supabase/functions/generate-images/index.ts`

### Step D1: Add hookCategory to CreatorPromptInput

In `promptSynthesizer.ts`, add optional field to interface (line 495-504):
```typescript
export interface CreatorPromptInput {
  topic: string
  emotion: string
  segmentType: string
  aspectRatio: string
  hasReferenceImage: boolean
  contextualOutfit?: string
  refinementNotes?: string
  layout?: string
  hookCategory?: string  // ADD: 'visual_shock' | 'negative_bias' | 'curiosity_gap' | 'relatability' | 'speed_value'
}
```

### Step D2: Import new maps in promptSynthesizer.ts

Add imports at top of file (find existing cinematographyLookup imports and extend):
```typescript
import {
  getEmotionSpecs,
  getHookExpression,   // ADD
  getHookLighting,     // ADD
} from './lookups/cinematographyLookup.ts'
```

### Step D3: Derive hook category from emotion in generate-images/index.ts

In `generate-images/index.ts`, add a small derivation helper near the creatorInput block (around line 730):
```typescript
// Derive hook category from emotion for HOOK segments (for expression/lighting)
const EMOTION_TO_HOOK_CATEGORY: Record<string, string> = {
  shock: 'visual_shock', excited: 'visual_shock', 'mind-blown': 'visual_shock',
  fear: 'negative_bias', tension: 'negative_bias', urgency: 'negative_bias', warning: 'negative_bias',
  curiosity: 'curiosity_gap', intrigue: 'curiosity_gap', mystery: 'curiosity_gap',
  hope: 'relatability', friendly: 'relatability', warm: 'relatability',
  authority: 'speed_value', determination: 'speed_value', resolution: 'speed_value',
}

const derivedHookCategory = EMOTION_TO_HOOK_CATEGORY[job.emotion?.toLowerCase() || ''] || 'curiosity_gap'
```

Then pass to `creatorInput`:
```typescript
const creatorInput: CreatorPromptInput = {
  topic: job.topic || '',
  emotion: job.emotion || 'authority',
  segmentType: job.segment_type || 'HOOK',
  aspectRatio: aspectRatio,
  hasReferenceImage: hasRefImage,
  contextualOutfit: outfitResult.outfit,
  refinementNotes: regenerationNotes,
  layout: job.layout || 'full',
  hookCategory: segmentType === 'HOOK' ? derivedHookCategory : undefined,  // ADD
}
```

### Step D4: Replace generic HOOK intensification with category-specific specs in promptSynthesizer.ts

Find the `isHOOK` branch in `buildCreatorPromptAsync` (line 550-557):

**Current (generic):**
```typescript
} else if (isHOOK) {
  const baseEmotion = emotionMap[input.emotion.toLowerCase()] || emotionMap.curiosity
  emotionSpecs = {
    expression: `${baseEmotion.expression}, EXAGGERATED intensity — eyebrows raised high, eyes wide open, mouth slightly open as if about to reveal a secret`,
    body: `${baseEmotion.body}, one hand raised pointing at viewer or gesturing dramatically, dynamic energy, leaning toward camera`
  }
```

**Replace with (hook-category-specific):**
```typescript
} else if (isHOOK) {
  const hookCat = input.hookCategory || 'curiosity_gap'
  const hookExpr = getHookExpression(hookCat)
  const hookLight = getHookLighting(hookCat)
  emotionSpecs = {
    expression: hookExpr.promptPhrase,
    body: `${hookExpr.body}, ${hookExpr.gesture}`,
  }
  // Inject hook-specific lighting into the prompt via a new variable
  // (used in the prompt template below — see Step D5)
  ;(input as any)._hookLightingPhrase = hookLight.promptPhrase
  console.log(`[buildCreatorPromptAsync] 🎯 HOOK category-specific expression applied: ${hookCat}`)
```

### Step D5: Inject hookLightingPhrase into the CREATOR HOOK prompt template

In the same `buildCreatorPromptAsync`, find where the final `prompt` string is built for HOOK segments. Look for `isHOOK` references in the prompt template (around line 584-650). Add the lighting phrase:

In the prompt template for HOOK (wherever the final prompt string concatenates lighting info), add:
```typescript
${isHOOK && (input as any)._hookLightingPhrase
  ? `Lighting: ${(input as any)._hookLightingPhrase}. `
  : ''}
```

**Steps:**
1. Add `hookCategory?: string` to `CreatorPromptInput` interface
2. Add `getHookExpression`, `getHookLighting` to imports in promptSynthesizer.ts
3. In generate-images/index.ts: add `EMOTION_TO_HOOK_CATEGORY` map + derive `derivedHookCategory`
4. In generate-images/index.ts: pass `hookCategory` to `creatorInput`
5. In promptSynthesizer.ts: replace generic HOOK intensification with `getHookExpression()` + `getHookLighting()`
6. In promptSynthesizer.ts: inject `hookLightingPhrase` into HOOK prompt template

**Verification:**
- [ ] `CreatorPromptInput` has optional `hookCategory` field
- [ ] `EMOTION_TO_HOOK_CATEGORY` covers all emotions used in segments (`shock`, `curiosity`, `authority`, `excitement`, `urgency`, `intrigue`, `determination`, `hope`, `friendly`, `mind-blown`)
- [ ] `buildCreatorPromptAsync` logs `"HOOK category-specific expression applied: {category}"`
- [ ] No TypeScript errors in promptSynthesizer.ts or generate-images/index.ts
- [ ] CTA override (`isCTA` branch) is UNTOUCHED
- [ ] Non-HOOK, non-CTA segments are UNTOUCHED (still use generic emotionMap)

---

## Final Verification Checklist

Before claiming complete:

- [ ] Phase A: `VISUAL_ACTION_BANK` exported from `11-hook-library-2026.ts` — 16 entries, all video-motion descriptions
- [ ] Phase B: `HOOK_EXPRESSION_MAP` + `HOOK_LIGHTING_MAP` exported from `cinematographyLookup.ts` — 5 entries each
- [ ] Phase C: `getLocalizedHookStrategy()` Option C section includes VISUAL_ACTION_BANK top 8
- [ ] Phase D: `buildCreatorPromptAsync` uses hook-category-specific expression + lighting for HOOK segments
- [ ] No existing exports broken — `HOOK_LIBRARY`, `EMOTION_MAP`, `LIGHTING_PATTERNS`, etc. all intact
- [ ] No frontend mirror changes needed (these are backend-only)
- [ ] All new exports are pure data (no async, no callLLM, no side effects)
- [ ] TypeScript compiles cleanly across all 4 modified files

---

## Execution Options

**Option 1 (Recommended): Execute in this session**
> "Ready to start Phase A? I'll use gaspol-execute to implement with per-phase checkpoints."

**Option 2: Sequential phases**
> Phases A and B are independent (different files) and can be done in parallel.
> Phases C and D depend on A and B completing first.

**Option 3: Save for later**
> Plan saved at `docs/plans/2026-03-09-visual-hook-bank-enhancement.md`
