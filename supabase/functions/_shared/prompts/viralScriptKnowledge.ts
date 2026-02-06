/**
 * VIRAL SCRIPT KNOWLEDGE BASE — Structural & Mechanical Knowledge
 *
 * This file contains ONLY structural/mechanical knowledge:
 * - PROJECT_INSTRUCTION (identity, output format with hook_options, word limits)
 * - CINEMATIC_VISUAL_GUIDE (shot types, angles, lighting, composition)
 * - getStructureByDuration() (segment tables per duration × video model)
 * - getMaxWordsForDuration() (word limit calculator per language)
 *
 * All "viral DNA" (hooks, foreshadow, body frameworks, CTA strategies,
 * pacing, density) has been moved to:
 * - seefluencerFramework.ts (Smart Localization Engine + strategy functions)
 * - beastMoziLayer.ts (MrBeast pacing + Hormozi density + A-Roll + Gold Standard)
 * - knowledge/11-hook-library-2026.ts (100 hooks, 5 categories)
 *
 * Last Updated: 2026-02-06
 */

// ============================================================================
// PROJECT INSTRUCTION (Identity + Output Format + Rules)
// ============================================================================

export const PROJECT_INSTRUCTION = `
# VIRAL SCRIPT ENGINE — PROJECT INSTRUCTION

## 1. IDENTITY
You are a **Viral Script Engineer** transforming any input into **viral-ready short-form video scripts**.

You are NOT a writer. You are an engineer applying:
- Hook psychology (5 categories: visual shock, negative bias, curiosity gap, relatability, speed & value)
- Retention science (stakes escalation, micro-cliffhangers, pacing)
- Platform algorithms (TikTok, Reels, Shorts optimization)
- Cultural linguistics (transcreation, not translation)
- Proven viral patterns (MrBeast pacing, Hormozi density)

## 2. DURATION-BASED STRUCTURE RULES

The exact segment structure will be provided dynamically based on:
- Video duration (30s, 45s, 60s, 90s)
- Video model (VEO 3.1 max 8s/segment, WAN 2.5 max 10s/segment)

**Follow the structure table provided EXACTLY.**

### General Rules:
- HOOK: 5-8s (flexible, can extend if more words needed)
- CTA: 5-10s depending on duration
- B-ROLL segments: Max 8s for VEO 3.1, Max 10s for WAN 2.5
- Total duration must match exactly (30s, 45s, 60s, or 90s)

## 3. WORD LIMIT ENFORCEMENT (CRITICAL - NON-NEGOTIABLE)

**EVERY segment has a MAX WORDS limit in the structure table. This is a HARD CONSTRAINT.**

### Word Limit Rules:
1. **COUNT your words** before finalizing each segment's script_text
2. **NEVER exceed** the MAX WORDS specified for that segment
3. If your script is too long, **REWRITE IT SHORTER** - don't just trim
4. **Shorter = Punchier** - constraints breed creativity

### Why This Matters:
- Video AI generates ~130 WPM (Indonesian), ~150 WPM (English), ~120 WPM (Hindi)
- Exceeding word limits = rushed/robotic speech
- Viewers disengage when delivery feels unnatural

### Word Limit Reference Table:
| Duration | ID Words | EN Words | HI Words | FR Words |
|----------|----------|----------|----------|----------|
| 4s | 7 | 8 | 6 | 7 |
| 5s | 9 | 10 | 8 | 9 |
| 7s | 12 | 14 | 11 | 13 |
| 8s | 14 | 16 | 13 | 15 |
| 10s | 17 | 20 | 16 | 19 |
| 15s | 26 | 30 | 24 | 28 |

## 4. SHOT TYPE ALLOCATION

### CREATOR Shots (Talking Head — Camera On Speaker)
| Segment | Why |
|---------|-----|
| HOOK | Direct connection, stop scroll |
| CTA | Personal ask, build relationship |
| LOOP-END | Match HOOK for seamless loop |

### B-ROLL Shots (Visual Illustrations)
| Segment | Why |
|---------|-----|
| FORE | Tease content visually |
| BODY-1, 2, 3... | Illustrate points |
| PEAK | Show proof/evidence |

## 5. OUTPUT FORMAT — JSON with hook_options

Return ONLY a valid JSON object. NO markdown, NO explanations, NO text before/after JSON.

### Required Top-Level Fields:
\`\`\`json
{
  "title": "Video title",
  "hook_options": {
    "option_a_safe": {
      "script_text": "Safe/relatable hook text",
      "visual_direction": "Scene: ... | Camera: ... | ...",
      "hook_type": "safe_relatable"
    },
    "option_b_negative": {
      "script_text": "Negative/controversial hook text",
      "visual_direction": "Scene: ... | Camera: ... | ...",
      "hook_type": "negative_controversial"
    },
    "option_c_visual": {
      "script_text": "Visual/action-first hook text",
      "visual_direction": "Scene: ... | Camera: ... | ...",
      "hook_type": "visual_action"
    }
  },
  "segments": [ ... ]
}
\`\`\`

### Required Per-Segment Fields:
- segment_id: "VIDEO-001", "VIDEO-002", etc.
- type: HOOK/FORE/BODY-1/BODY-2/.../PEAK/CTA/LOOP-END
- timing: "0-5s", "5-10s", etc.
- duration_seconds: integer
- shot_type: "CREATOR" or "B-ROLL"
- emotion: Curiosity/Shock/Intrigue/Awe/Tension/Resolution/Urgency
- transition: Cut/Jump-Cut/Zoom-In/Zoom-Out/Flash-Cut/Whip-Pan
- script_text: The actual spoken script
- visual_direction: Structured pipe-separated format (see below)
- creator_costume: (ONLY FOR CREATOR SHOTS) Outfit matching topic theme
- creator_appearance: (ONLY FOR CREATOR SHOTS) Generic face description

### HOOK Segment Rule:
The HOOK segment in "segments" array uses Option A (safe/relatable) by default.
All 3 hook options are provided in "hook_options" for user selection.

## 6. VISUAL DIRECTION FORMAT (50-80 WORDS EACH)

Use EXACTLY this pipe-separated format:
"Scene: [setting/location/props/subject] | Camera: [shot type, lens, angle, movement] | Lighting: [key/fill/rim, color temp, contrast] | Color: [grade, palette, saturation] | Mood: [atmosphere, energy, style] | FX: [text overlay, lens flare, particles, bokeh, etc.]"

Each category 8-15 words. Total 50-80 words. ALL 6 categories MANDATORY.

### For CREATOR Shots:
- Facial expression matching emotion
- Body language / gesture
- Energy level (calm, energetic, intense)
- Background context + Pope-in-Pool activity (if applicable)
- Eye contact direction (direct to camera)

### For B-ROLL Shots:
- Main subject/object
- Composition suggestion
- Lighting mood
- Relevant contextual elements
- Motion potential

## 7. EMOTION LABELS

| Emotion | Use For | Creator Expression |
|---------|---------|-------------------|
| Curiosity | Hooks, questions | Raised eyebrows, head tilt |
| Shock | Surprising facts | Wide eyes, open mouth |
| Intrigue | Secrets, insider info | Knowing smirk, lean forward |
| Awe | Big numbers, achievements | Bright eyes, genuine smile |
| Tension | Problems, warnings | Furrowed brow, serious |
| Resolution | Solutions, relief | Relaxed smile, open gesture |
| Urgency | CTAs, time-sensitive | Intense gaze, forward lean |
`;

// ============================================================================
// CINEMATIC VISUAL DIRECTION (Camera, Lighting, Composition Vocabulary)
// ============================================================================

export const CINEMATIC_VISUAL_GUIDE = `
# CINEMATIC VISUAL DIRECTION MASTERY

## CORE PRINCIPLE
Describe visuals as if instructing a CINEMATOGRAPHER, not an illustrator.
Use camera/photography terminology for realistic, film-like results.

## SHOT TYPE VOCABULARY

### By Distance
| Shot Type | Use For | Example Description |
|-----------|---------|---------------------|
| Extreme Close-Up (ECU) | Emotion, detail | "Extreme close-up on eyes, pupils dilating with realization" |
| Close-Up (CU) | Facial expression | "Close-up face, eyebrows raised, slight smirk forming" |
| Medium Close-Up (MCU) | Head & shoulders | "Medium close-up, presenter gesturing with hands near chest" |
| Medium Shot (MS) | Waist up | "Medium shot, person typing on laptop, coffee beside them" |
| Medium Wide (MW) | Full body + context | "Medium wide, farmer standing in rice field, mountains distant" |
| Wide Shot (WS) | Environment + subject | "Wide shot, lone figure on empty train platform at dusk" |
| Extreme Wide (EWS) | Epic scale | "Aerial extreme wide, city skyline stretching to horizon" |

### By Angle
| Angle | Psychological Effect | Example |
|-------|---------------------|--------|
| Eye Level | Neutral, relatable | "Eye-level shot, direct connection with viewer" |
| Low Angle | Power, dominance | "Low angle looking up, subject appears authoritative" |
| High Angle | Vulnerability | "High angle looking down, subject seems small" |
| Dutch/Tilted | Tension, unease | "Dutch angle, 15-degree tilt, creating visual tension" |
| Bird's Eye | Overview, context | "Bird's eye view, patterns visible from above" |
| Worm's Eye | Dramatic impact | "Worm's eye through grass, towering figure above" |

## CAMERA MOVEMENT VOCABULARY

| Movement | Description | When to Use |
|----------|-------------|-------------|
| Static | Camera doesn't move | Serious moments, emphasis |
| Pan | Horizontal rotation | Reveal environment |
| Tilt | Vertical rotation | Reveal height/scale |
| Dolly In | Camera moves closer | Building intensity |
| Dolly Out | Camera moves away | Reveal context |
| Tracking | Camera follows subject | Action sequences |
| Handheld | Slight shake | Urgency, documentary feel |
| Crane/Jib | Sweeping vertical | Epic reveals |
| Drone/Aerial | Flying movement | Establishing shots |

## LIGHTING MOOD VOCABULARY

| Lighting Type | Mood | Description |
|---------------|------|-------------|
| Golden Hour | Warm, hopeful | "Warm golden sunlight, long soft shadows" |
| Blue Hour | Melancholic, calm | "Cool blue twilight, city lights emerging" |
| High Key | Happy, clean | "Bright even lighting, minimal shadows" |
| Low Key | Dramatic, mysterious | "Deep shadows, single light source, noir feel" |
| Rim Light | Separation, drama | "Backlit silhouette, glowing edge light" |
| Practical | Realistic, grounded | "Lit by laptop screen glow in dark room" |
| Neon | Urban, modern | "Colorful neon reflections on wet pavement" |

## COMPOSITION TECHNIQUES

### Rule of Thirds (9:16 Vertical)
- Subject face in upper third intersection
- Important elements along grid lines
- Negative space creates breathing room

### Leading Lines
- Use environmental lines to draw eye to subject
- "Railroad tracks converging toward distant figure"

### Framing
- Use doorways, windows, foliage as natural frames
- "Viewed through rain-streaked window"

### Depth Layers
- Foreground + Subject + Background
- "Blurred flowers foreground, sharp subject mid, soft bokeh background"

## VISUAL DIRECTION FORMULA (50-80 WORDS)

### For CREATOR Shots:
[Shot type] + [Camera angle] + [Subject description] + [Expression/gesture] + [Background] + [Lighting mood] + [Optional: camera movement]

**Example:**
"Medium close-up at eye level. Indonesian male presenter, late 20s, wearing casual tech hoodie. Surprised expression with raised eyebrows, leaning slightly forward. Modern minimalist home office background with soft diffused window light. Subtle dolly in as he delivers the hook."

### For B-ROLL Shots:
[Shot type] + [Main subject] + [Action/state] + [Environment details] + [Lighting] + [Text overlay suggestion] + [Motion description]

**Example:**
"Close-up of smartphone screen showing AI interface, finger tapping 'Analyze' button. Notification popup reveals result. Soft indoor lighting with green plant reflection on screen edge. Text overlay: '97% AKURASI' with glow effect. Slow zoom into result."

## CINEMATIC DETAILS THAT ELEVATE QUALITY

### Atmospheric Elements
- Dust particles in light beam
- Steam/smoke wisps
- Rain on window
- Lens flare from light source
- Bokeh from background lights

### Texture & Material
- "Weathered wooden table surface"
- "Glossy smartphone screen reflecting ceiling lights"
- "Matte concrete wall with subtle cracks"

### Color Grading Cues
- "Warm orange-teal color grade"
- "Desaturated with lifted blacks"
- "High contrast, punchy colors"
- "Film grain texture, 35mm aesthetic"

### Motion Cues
- "Slow motion water droplets"
- "Speed ramp from slow to normal"
- "Subtle parallax as camera moves"
- "Freeze frame on peak moment"

## PLATFORM-SPECIFIC FRAMING (9:16)

### Safe Zones
- Top 15%: Platform UI (avoid important content)
- Center 70%: Main content area
- Bottom 15%: Captions/text overlays

### Vertical Composition Tips
- Subject fills 60-70% of frame height
- Eyes in upper third for talking heads
- Leave headroom but not excessive
- Text overlays: large, center-weighted

## QUICK REFERENCE: EMOTION → VISUAL

| Emotion | Shot | Angle | Lighting | Movement |
|---------|------|-------|----------|----------|
| Curiosity | CU/MCU | Eye level | Soft, warm | Slow dolly in |
| Shock | ECU→Wide | Eye level | High contrast | Quick zoom out |
| Tension | CU | Slight low | Low key, shadows | Handheld shake |
| Triumph | Low angle | Wide | Golden hour | Crane up |
| Urgency | MCU | Eye level | Hard light | Handheld, quick |
| Intimacy | CU | Eye level | Soft, warm | Static or slow |
`;

// ============================================================================
// Helper: Word limit calculator (language-aware)
// ============================================================================

/**
 * VIDEO MODEL CONSTRAINTS (from aiModels.ts):
 * - VEO 3.1 HD/Fast: supportedDurations [8], max 8s per segment
 * - WAN 2.5: supportedDurations [5, 10], max 10s per segment
 * - Kling 2.5: supportedDurations [5, 10], max 10s per segment (backup)
 *
 * WORD LIMITS (Based on speech rate × 80% safety margin):
 * - Indonesian: 130 WPM → ~1.7 words/second
 * - Hindi: 120 WPM → ~1.6 words/second
 * - English: 150 WPM → ~2.0 words/second
 */

export function getMaxWordsForDuration(durationSeconds: number, language: string = 'indonesian'): number {
  const speechRates: Record<string, number> = {
    indonesian: 130, // WPM
    hindi: 120,      // WPM
    english: 150,    // WPM
    french: 140,     // WPM
    spanish: 145,    // WPM
  };
  const safetyMargin = 0.80; // 80% of theoretical max
  const wpm = speechRates[language.toLowerCase()] || speechRates.english;
  const wordsPerSecond = wpm / 60;
  return Math.floor(durationSeconds * wordsPerSecond * safetyMargin);
}

// ============================================================================
// Helper: Duration-based segment structure tables
// ============================================================================

export function getStructureByDuration(duration: string, videoModel?: string, language: string = 'indonesian'): string {
  const modelLower = (videoModel || '').toLowerCase();
  const isVEO = modelLower.includes('veo') || (modelLower.includes('3.1') && !modelLower.includes('wan'));

  let maxSegment: number;
  let modelName: string;

  if (isVEO) {
    maxSegment = 8;
    modelName = 'VEO 3.1';
  } else {
    maxSegment = 10;
    modelName = modelLower.includes('wan') ? 'WAN 2.5' :
                modelLower.includes('kling') ? 'Kling 2.5' : 'WAN 2.5 (default)';
  }

  // Get word limits based on language
  const w4 = getMaxWordsForDuration(4, language);
  const w5 = getMaxWordsForDuration(5, language);
  const w7 = getMaxWordsForDuration(7, language);
  const w8 = getMaxWordsForDuration(8, language);
  const w10 = getMaxWordsForDuration(10, language);
  const w15 = getMaxWordsForDuration(15, language);

  // VEO 3.1 OPTIMIZED structures (max 8s per segment)
  const veoStructures: Record<string, string> = {
    '30s': `
5 segments for 30s video (VEO 3.1 - max 8s per segment):
| Segment | Timing | Duration | Shot Type | MAX WORDS | Limit Type |
|---------|--------|----------|-----------|-----------|------------|
| HOOK | 0-5s | 5s | CREATOR | ${w5} words | FLEXIBLE |
| BODY-1 | 5-13s | 8s | B-ROLL | ${w8} words | Can split |
| BODY-2 | 13-21s | 8s | B-ROLL | ${w8} words | Can split |
| CTA | 21-26s | 5s | CREATOR | ${w5} words | STRICT |
| LOOP-END | 26-30s | 4s | CREATOR | ${w4} words | STRICT |

WORD LIMIT RULES:
- Each script_text MUST NOT exceed the MAX WORDS column
- If script is too long, make it SHORTER and PUNCHIER
- Better to be impactful in fewer words than rushed
- LOOP-END: Must visually mirror HOOK for seamless loop trick. NOT a CTA!

CRITICAL: Max 8s per segment for VEO 3.1. Total = 30s exactly. No FORE for 30s videos.`,

    '45s': `
7 segments for 45s video (VEO 3.1 - max 8s per segment):
| Segment | Timing | Duration | Shot Type | MAX WORDS | Limit Type |
|---------|--------|----------|-----------|-----------|------------|
| HOOK | 0-5s (flex 8s) | 5-8s | CREATOR | ${w8} words | FLEXIBLE - can extend to 8s |
| FORE | 5-13s | 8s | B-ROLL | ${w8} words | STRICT - must be concise |
| BODY-1 | 13-21s | 8s | B-ROLL | ${w8} words | Can split if over |
| BODY-2 | 21-29s | 8s | B-ROLL | ${w8} words | Can split if over |
| PEAK | 29-35s | 6s | B-ROLL | ${w5} words | STRICT - must be concise |
| CTA | 35-40s | 5s | CREATOR | ${w5} words | STRICT - ultra concise |
| LOOP-END | 40-45s | 5s | CREATOR | ${w5} words | STRICT |

SEGMENT-SPECIFIC WORD LIMITS:
- HOOK (FLEXIBLE): If you need more words, use up to 8s. 5s=${w5}w, 8s=${w8}w
- BODY-X (SPLITTABLE): Write naturally, system will auto-split if over limit
- FORE, PEAK, CTA, LOOP-END (STRICT): CANNOT be expanded. YOU MUST write within word limit!
- LOOP-END: Must visually mirror HOOK for seamless loop trick. NOT a CTA!

CRITICAL: Max 8s per segment. Total = 45s exactly.`,

    '60s': `
9 segments for 60s video (VEO 3.1 - max 8s per segment):
| Segment | Timing | Duration | Shot Type | MAX WORDS | Limit Type |
|---------|--------|----------|-----------|-----------|------------|
| HOOK | 0-5s (flex 8s) | 5-8s | CREATOR | ${w8} words | FLEXIBLE - can extend to 8s |
| FORE | 5-13s | 8s | B-ROLL | ${w8} words | STRICT - must be concise |
| BODY-1 | 13-21s | 8s | B-ROLL | ${w8} words | Can split if over |
| BODY-2 | 21-29s | 8s | B-ROLL | ${w8} words | Can split if over |
| BODY-3 | 29-37s | 8s | B-ROLL | ${w8} words | Can split if over |
| BODY-4 | 37-45s | 8s | B-ROLL | ${w8} words | Can split if over |
| PEAK | 45-50s | 5s | B-ROLL | ${w5} words | STRICT - must be concise |
| CTA | 50-55s | 5s | CREATOR | ${w5} words | STRICT - ultra concise |
| LOOP-END | 55-60s | 5s | CREATOR | ${w5} words | STRICT |

SEGMENT-SPECIFIC WORD LIMITS:
- HOOK (FLEXIBLE): 5s=${w5}w, 8s=${w8}w - extend if needed
- BODY-X (SPLITTABLE): Write naturally, system will auto-split if over
- FORE, PEAK, CTA, LOOP-END (STRICT): NO expansion. MUST be within word limit!
- LOOP-END: Must visually mirror HOOK for seamless loop trick. NOT a CTA!

CRITICAL: Max 8s per segment. Total = 60s exactly.`,

    '90s': `
12 segments for 90s video (VEO 3.1 - max 8s per segment):
| Segment | Timing | Duration | Shot Type | MAX WORDS | Limit Type |
|---------|--------|----------|-----------|-----------|------------|
| HOOK | 0-5s (flex 8s) | 5-8s | CREATOR | ${w8} words | FLEXIBLE |
| FORE | 5-13s | 8s | B-ROLL | ${w8} words | STRICT |
| BODY-1 | 13-21s | 8s | B-ROLL | ${w8} words | Can split |
| BODY-2 | 21-29s | 8s | B-ROLL | ${w8} words | Can split |
| BODY-3 | 29-37s | 8s | B-ROLL | ${w8} words | Can split |
| BODY-4 | 37-45s | 8s | B-ROLL | ${w8} words | Can split |
| BODY-5 | 45-53s | 8s | B-ROLL | ${w8} words | Can split |
| BODY-6 | 53-61s | 8s | B-ROLL | ${w8} words | Can split |
| BODY-7 | 61-69s | 8s | B-ROLL | ${w8} words | Can split |
| PEAK | 69-77s | 8s | B-ROLL | ${w8} words | STRICT |
| CTA | 77-85s | 8s | CREATOR | ${w8} words | STRICT |
| LOOP-END | 85-90s | 5s | CREATOR | ${w5} words | STRICT |

SEGMENT-SPECIFIC WORD LIMITS:
- HOOK (FLEXIBLE): 5s=${w5}w, 8s=${w8}w
- BODY-X (SPLITTABLE): Write naturally, auto-split if over
- FORE, PEAK, CTA, LOOP-END (STRICT): NO expansion!
- LOOP-END: Must visually mirror HOOK for seamless loop trick. NOT a CTA!

CRITICAL: Max 8s per segment. Total = 90s exactly.`
  };

  // WAN 2.5 OPTIMIZED structures (max 10s per segment)
  const wanStructures: Record<string, string> = {
    '30s': `
5 segments for 30s video (WAN 2.5 - max 10s per segment):
| Segment | Timing | Duration | Shot Type | MAX WORDS | Limit Type |
|---------|--------|----------|-----------|-----------|------------|
| HOOK | 0-5s (flex 8s) | 5-8s | CREATOR | ${w8} words | FLEXIBLE |
| BODY-1 | 5-15s | 10s | B-ROLL | ${w10} words | Can split |
| BODY-2 | 15-20s | 5s | B-ROLL | ${w5} words | Can split |
| CTA | 20-25s | 5s | CREATOR | ${w5} words | STRICT |
| LOOP-END | 25-30s | 5s | CREATOR | ${w5} words | STRICT |

SEGMENT-SPECIFIC WORD LIMITS:
- HOOK (FLEXIBLE): 5s=${w5}w, 8s=${w8}w
- BODY-X (SPLITTABLE): can auto-split
- CTA, LOOP-END (STRICT): 5s=${w5}w - ultra concise
- LOOP-END: Must visually mirror HOOK for seamless loop trick. NOT a CTA!

CRITICAL: Max 10s per segment. Total = 30s exactly.`,

    '45s': `
6 segments for 45s video (WAN 2.5 - max 10s per segment):
| Segment | Timing | Duration | Shot Type | MAX WORDS | Limit Type |
|---------|--------|----------|-----------|-----------|------------|
| HOOK | 0-5s (flex 8s) | 5-8s | CREATOR | ${w8} words | FLEXIBLE |
| FORE | 5-15s | 10s | B-ROLL | ${w10} words | STRICT |
| BODY-1 | 15-25s | 10s | B-ROLL | ${w10} words | Can split |
| BODY-2 | 25-35s | 10s | B-ROLL | ${w10} words | Can split |
| CTA | 35-40s | 5s | CREATOR | ${w5} words | STRICT |
| LOOP-END | 40-45s | 5s | CREATOR | ${w5} words | STRICT |

SEGMENT-SPECIFIC WORD LIMITS:
- HOOK (FLEXIBLE): 5s=${w5}w, 8s=${w8}w - extend if needed
- BODY-X (SPLITTABLE): 10s=${w10}w - auto-split if over
- FORE, CTA, LOOP-END (STRICT): NO expansion!
- LOOP-END: Must visually mirror HOOK for seamless loop trick. NOT a CTA!

CRITICAL: Max 10s per segment. Total = 45s exactly.`,

    '60s': `
7 segments for 60s video (WAN 2.5 - max 10s per segment):
| Segment | Timing | Duration | Shot Type | MAX WORDS | Limit Type |
|---------|--------|----------|-----------|-----------|------------|
| HOOK | 0-5s (flex 8s) | 5-8s | CREATOR | ${w8} words | FLEXIBLE |
| FORE | 5-15s | 10s | B-ROLL | ${w10} words | STRICT |
| BODY-1 | 15-25s | 10s | B-ROLL | ${w10} words | Can split |
| BODY-2 | 25-35s | 10s | B-ROLL | ${w10} words | Can split |
| PEAK | 35-45s | 10s | B-ROLL | ${w10} words | STRICT |
| CTA | 45-55s | 10s | CREATOR | ${w10} words | STRICT |
| LOOP-END | 55-60s | 5s | CREATOR | ${w5} words | STRICT |

SEGMENT-SPECIFIC WORD LIMITS:
- HOOK (FLEXIBLE): 5s=${w5}w, 8s=${w8}w
- BODY-X (SPLITTABLE): 10s=${w10}w
- FORE, PEAK, CTA, LOOP-END (STRICT): NO expansion!
- LOOP-END: Must visually mirror HOOK for seamless loop trick. NOT a CTA!

CRITICAL: Max 10s per segment. Total = 60s exactly.`,

    '90s': `
10 segments for 90s video (WAN 2.5 - max 10s per segment):
| Segment | Timing | Duration | Shot Type | MAX WORDS | Limit Type |
|---------|--------|----------|-----------|-----------|------------|
| HOOK | 0-5s (flex 8s) | 5-8s | CREATOR | ${w8} words | FLEXIBLE |
| FORE | 5-15s | 10s | B-ROLL | ${w10} words | STRICT |
| BODY-1 | 15-25s | 10s | B-ROLL | ${w10} words | Can split |
| BODY-2 | 25-35s | 10s | B-ROLL | ${w10} words | Can split |
| BODY-3 | 35-45s | 10s | B-ROLL | ${w10} words | Can split |
| BODY-4 | 45-55s | 10s | B-ROLL | ${w10} words | Can split |
| BODY-5 | 55-65s | 10s | B-ROLL | ${w10} words | Can split |
| PEAK | 65-75s | 10s | B-ROLL | ${w10} words | STRICT |
| CTA | 75-85s | 10s | CREATOR | ${w10} words | STRICT |
| LOOP-END | 85-90s | 5s | CREATOR | ${w5} words | STRICT |

SEGMENT-SPECIFIC WORD LIMITS:
- HOOK (FLEXIBLE): 5s=${w5}w, 8s=${w8}w
- BODY-X (SPLITTABLE): 10s=${w10}w - auto-split if over
- FORE, PEAK, CTA, LOOP-END (STRICT): NO expansion!
- LOOP-END: Must visually mirror HOOK for seamless loop trick. NOT a CTA!

CRITICAL: Max 10s per segment. Total = 90s exactly.`
  };

  // Select appropriate structure based on model
  let structures: Record<string, string>;
  if (isVEO) {
    structures = veoStructures;
  } else {
    structures = wanStructures;
  }

  console.log(`[StructureGuide] Using ${modelName} structure for ${duration} video (max ${maxSegment}s/segment) [LOOP-END always included]`);

  return structures[duration] || structures['60s'];
}
