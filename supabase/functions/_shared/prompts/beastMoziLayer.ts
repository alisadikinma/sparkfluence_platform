/**
 * BEAST-MOZI LAYER — MrBeast Pacing + Alex Hormozi Density
 *
 * Exports:
 * - PACING_RULES: Stakes escalation, "every segment faster than previous"
 * - VALUE_DENSITY_RULES: Hormozi sentence limits (strict HOOK/FORE/CTA, moderate BODY)
 * - EDITING_CUES_GUIDE: [SFX:], [CUT TO], [ZOOM], [TEXT POP:], [MUSIC CUE:], [ACTION:], [Camera:], [Visual:]
 * - A_ROLL_PRIORITY_RULES: Camera manipulation on speaker for CREATOR shots
 * - getStakesEscalation(segmentCount): Per-segment intensity labels
 * - GOLD_STANDARD_EXAMPLE: One complete 60s Indonesian finance/tech example
 *
 * Created: 2026-02-06
 */

// ============================================================================
// PACING RULES — MrBeast "Every Second Earns The Next"
// ============================================================================

export const PACING_RULES = `
## PACING — MrBeast Principle: "Every Second Earns The Next"

The viewer can leave at ANY moment. Every segment must justify the next second of their attention.

**Energy Curve (NEVER go backwards):**
HOOK ████████████ (100% — stop scroll)
FORE ██████       (60% — create curiosity, dip is OK)
BODY-1 ███████    (70% — build interest)
BODY-2 ████████   (80% — raise stakes)
BODY-3 █████████  (90% — "no way...")
PEAK ████████████ (100% — highest energy, payoff)
CTA █████████     (90% — ride PEAK momentum)
LOOP-END ████████████ (100% — mirror HOOK)

**Rules:**
1. NO "dead air" — if a segment exists, it MUST deliver new value or raise stakes
2. Every BODY segment must be MORE interesting than the previous one
3. If you can't make a segment more intense, DELETE it (shorter > boring)
4. PEAK must be the single highest-energy moment in the entire script
5. Micro-cliffhanger at end of each BODY segment forces viewer to stay`;

// ============================================================================
// VALUE DENSITY RULES — Alex Hormozi "Lead Magnets On Steroids"
// ============================================================================

export const VALUE_DENSITY_RULES = `
## VALUE DENSITY — Hormozi Principle: "Deliver So Much Value They Feel Guilty"

Every sentence must EARN its place. Filler = viewer leaves.

**Word Density Limits:**
| Segment Type | Max Words/Sentence | Enforcement |
|---|---|---|
| HOOK | ≤12 words | STRICT — over = rewrite |
| FORE | ≤12 words | STRICT — over = rewrite |
| BODY | ≤15 words | MODERATE — aim for ≤12, allow ≤15 |
| PEAK | ≤12 words | STRICT — over = rewrite |
| CTA | ≤12 words | STRICT — over = rewrite |
| LOOP-END | ≤10 words | STRICT — shortest possible |

**The Deletion Test:**
For EVERY sentence in the script, ask: "If I delete this sentence, does the script lose something SPECIFIC?"
- If YES → keep it
- If NO → delete it (it's filler)

**Hormozi's 3 Rules:**
1. Specificity beats generality: "Save 47 minutes/day" > "Save time"
2. Numbers = credibility: Use specific numbers, percentages, timeframes
3. One idea per sentence: Never combine two concepts. Split them.`;

// ============================================================================
// EDITING CUES GUIDE — Visual Direction Language
// ============================================================================

export const EDITING_CUES_GUIDE = `
## EDITING CUES — Visual Direction Vocabulary

Every visual_direction field MUST contain ≥2 editing cues from this vocabulary.
These tell the video editor EXACTLY what to do — no ambiguity.

**Camera Movement:**
- [Camera: Push-in / Zoom to Face] — Slow zoom into speaker
- [Camera: Whip-pan Left/Right] — Fast horizontal sweep
- [Camera: Pull-back Reveal] — Start tight, reveal wide
- [Camera: Dutch Angle → Level] — Tilted → straighten for emphasis
- [Camera: Handheld Shake → Steady] — Energy shift on beat
- [Camera: 360-spin Around Subject] — Dynamic movement
- [Camera: POV Shot] — First-person perspective

**Cuts & Transitions:**
- [CUT TO: Screen Recording] — Switch to screen capture
- [CUT TO: B-Roll] — Cut to illustrative footage
- [CUT TO: Split Screen] — Side-by-side comparison
- [CUT TO: Reaction] — Cut to creator's reaction

**Visual Effects:**
- [TEXT POP: "keyword"] — Text appears on screen
- [ZOOM: Digital Punch-in] — Post-production zoom emphasis
- [Visual: Green Screen / Background Change] — Background swap
- [Visual: Blur → Sharp Focus] — Attention director
- [SPEED: 2x Fast Forward] — Speed ramp
- [SPEED: 0.5x Slow Motion] — Dramatic slow-mo

**Audio:**
- [SFX: Whoosh / Ding / Record Scratch] — Sound effect
- [MUSIC CUE: Build / Drop / Tension] — BGM direction

**Physical Actions:**
- [ACTION: Snap Fingers → Scene Change] — Physical trigger
- [ACTION: Slam Desk / Throw Paper] — Emphasis through action
- [ACTION: Point at Camera] — Direct engagement
- [ACTION: Hold Product / Show Screen] — Product showcase

**Rules:**
1. MINIMUM cues per visual_direction based on segment duration:
   - ≤5s segments: ≥2 cues
   - 6-8s segments: ≥3 cues
   - 9-10s segments: ≥4 cues (visual change every ~2.5s = MrBeast pacing)
2. Combine types: e.g., "[Camera: Push-in] | [TEXT POP: \\"3 cara\\"] | [SFX: Whoosh] | [ACTION: Point at camera]"
3. CREATOR shots favor Camera + Action cues
4. B-ROLL shots favor CUT TO + Visual + Speed cues
5. NEVER let a segment go >3 seconds without a visual change`;

// ============================================================================
// A-ROLL PRIORITY RULES — Camera On Speaker
// ============================================================================

export const A_ROLL_PRIORITY_RULES = `
## A-ROLL PRIORITY — Camera Manipulation On The Speaker

For CREATOR shots (HOOK, CTA, LOOP-END), visual_direction MUST prioritize
CAMERA MOVEMENT on the SPEAKER over generic stock footage descriptions.

**CREATOR Shot Priority Stack:**
1. Camera manipulation: zoom, whip-pan, dutch angle, handheld
2. Physical action: speaker throws/slams/points/snaps
3. Text interaction: text appears around/behind speaker
4. Audio cue: SFX on speaker's beat

**Required Pattern for CREATOR visual_direction:**
"Scene: [Creator setting + activity] | Camera: [Movement on speaker] | Action: [Physical emphasis] | [Additional cue]"

**Examples:**
- GOOD: "Scene: Creator di meja, bikin kopi | Camera: Push-in ke wajah | Action: Angkat gelas | [TEXT POP: \\"3 cara\\"]"
- GOOD: "Scene: Creator jalan di cafe | Camera: Tracking shot follow | Action: Tiba-tiba stop, point camera | [SFX: Record scratch]"
- BAD: "Scene: Stock footage of money" — This is B-ROLL, not A-Roll!
- BAD: "Scene: Creator talking to camera" — TOO GENERIC, no camera/action direction!

**B-ROLL Shot (BODY, PEAK, FORE) Priority Stack:**
1. Subject-first visuals: the content being discussed
2. CUT TO + transition cues
3. TEXT POP / infographic overlays
4. SPEED ramps for montage sections

**B-ROLL shots do NOT need speaker camera direction** (no one is on camera).`;

// ============================================================================
// STAKES ESCALATION — Per-Segment Intensity
// ============================================================================

/**
 * Returns per-segment intensity labels for BODY segments.
 * Used by buildSystemPrompt to guide the LLM on energy progression.
 */
export function getStakesEscalation(segmentCount: number): string {
  if (segmentCount <= 0) return '';

  const labels: Record<number, string[]> = {
    1: ['Mind-blown (deliver everything in one shot)'],
    2: ['Interesting → "oh cool"', 'Wild → "wait, REALLY?"'],
    3: ['Interesting → "oh cool"', 'Surprising → "wait what?"', 'Wild → "NO WAY"'],
    4: ['Interesting → "huh, cool"', 'Surprising → "wait what?"', 'Wild → "no way..."', 'Mind-blown → "THIS IS INSANE"'],
    5: ['Warm-up → "okay, tell me more"', 'Interesting → "oh that\'s good"', 'Surprising → "wait what?"', 'Wild → "no way..."', 'Mind-blown → "HOLY—"'],
    6: ['Warm-up → "okay"', 'Interesting → "huh, nice"', 'Surprising → "wait..."', 'Wild → "no way"', 'Crazy → "ARE YOU SERIOUS?"', 'Mind-blown → "I NEED TO SHARE THIS"'],
    7: ['Warm-up → "okay"', 'Interesting → "huh"', 'Good → "that\'s smart"', 'Surprising → "wait..."', 'Wild → "no way"', 'Crazy → "HOW?!"', 'Mind-blown → "THIS CHANGES EVERYTHING"'],
  };

  const escalation = labels[Math.min(segmentCount, 7)] || labels[7];

  let result = `
## STAKES ESCALATION — ${segmentCount} BODY Segment${segmentCount > 1 ? 's' : ''}

Each BODY segment MUST be MORE interesting than the previous one.
The viewer is always ONE boring second away from scrolling.

| BODY Segment | Viewer Reaction Target |
|---|---|`;

  escalation.forEach((label, i) => {
    result += `\n| BODY-${i + 1} | ${label} |`;
  });

  result += `
| PEAK | The PAYOFF — highest energy moment in the entire script |

**If you cannot make BODY-${segmentCount} more interesting than BODY-${Math.max(1, segmentCount - 1)}, DELETE it.**
Shorter > boring. A 45s video that's fire beats a 60s video that sags in the middle.`;

  return result;
}

// ============================================================================
// GOLD STANDARD EXAMPLE — Complete 60s Indonesian Finance/Tech
// ============================================================================

export const GOLD_STANDARD_EXAMPLE = `
## GOLD STANDARD — Reference Example (60s Indonesian, Finance/Tech, WAN 2.5)

Study this example. It demonstrates EVERY rule: Triple Hook, Pope in Pool,
Foreshadow→PEAK payoff, Stakes Escalation, A-Roll Priority, Editing Cues.

Topic: "3 Cara AI Bikin Lo Kaya di 2026"
Content Type: listicle | Pope in Pool: MANDATORY (finance) | Hook: Curiosity Gap

\`\`\`json
{
  "title": "3 Cara AI Bikin Lo Kaya di 2026",
  "hook_options": {
    "option_a_safe": {
      "script_text": "Gue baru nemuin 3 cara AI yang literally bikin passive income.",
      "visual_direction": "Scene: Creator di coffee shop, tuang kopi | Camera: Medium → Push-in ke wajah | [TEXT POP: \\"3 CARA AI\\"] | [SFX: Ding]",
      "hook_type": "safe_relatable"
    },
    "option_b_negative": {
      "script_text": "Lo masih kerja manual di 2026? Ketinggalan parah.",
      "visual_direction": "Scene: Creator slam laptop tutup | Camera: Close-up slam → Whip-pan ke wajah | [SFX: Boom] | [TEXT POP: \\"KETINGGALAN\\"]",
      "hook_type": "negative_controversial"
    },
    "option_c_visual": {
      "script_text": "Liat dashboard ini. Semua dari AI.",
      "visual_direction": "[Camera: Blur → Sharp focus on screen] | Creator tunjuk laptop | [CUT TO: Screen recording dashboard] | [SFX: Cash register]",
      "hook_type": "visual_action"
    }
  },
  "segments": [
    {
      "segment_number": 1,
      "segment_type": "HOOK",
      "shot_type": "CREATOR",
      "duration": 8,
      "script_text": "Gue baru nemuin 3 cara AI yang literally bikin passive income.",
      "visual_direction": "Scene: Creator di coffee shop, tuang kopi | Camera: Medium → Push-in ke wajah | [TEXT POP: \\"3 CARA AI\\"] | [SFX: Ding]",
      "max_words": 14
    },
    {
      "segment_number": 2,
      "segment_type": "FORE",
      "shot_type": "B-ROLL",
      "duration": 10,
      "script_text": "Yang ketiga literally bikin gue quit 9-to-5. Stay sampai akhir.",
      "visual_direction": "[CUT TO: AI tools dashboard montage] | [SPEED: 2x scroll results] | [TEXT POP: \\"#3 = GAME CHANGER\\"] | [MUSIC CUE: Build tension]",
      "max_words": 17
    },
    {
      "segment_number": 3,
      "segment_type": "BODY-1",
      "shot_type": "B-ROLL",
      "duration": 10,
      "script_text": "Pertama: AI copywriting. Jasper bikin 50 artikel sehari. Passive income dari SEO.",
      "visual_direction": "[CUT TO: Screen recording Jasper generating] | [TEXT POP: \\"#1 AI COPYWRITING\\"] | [Camera: Pan across articles] | [SFX: Rapid typing]",
      "max_words": 17
    },
    {
      "segment_number": 4,
      "segment_type": "BODY-2",
      "shot_type": "B-ROLL",
      "duration": 10,
      "script_text": "Kedua: AI video. Satu TikTok 10 menit bikin. Hasilnya? 50 juta views.",
      "visual_direction": "[CUT TO: AI video generation screen] | [CUT TO: TikTok analytics 50M views] | [ZOOM: Punch-in on view count] | [TEXT POP: \\"#2 AI VIDEO\\"]",
      "max_words": 17
    },
    {
      "segment_number": 5,
      "segment_type": "PEAK",
      "shot_type": "B-ROLL",
      "duration": 10,
      "script_text": "Ketiga: AI trading bot. Gue pake sendiri. Profit 40% dalam 3 bulan.",
      "visual_direction": "[CUT TO: Trading dashboard green profit chart] | [ZOOM: Punch-in on +40%] | [SFX: Cash register + Crowd cheer] | [MUSIC CUE: Drop]",
      "max_words": 17
    },
    {
      "segment_number": 6,
      "segment_type": "CTA",
      "shot_type": "CREATOR",
      "duration": 10,
      "script_text": "Mau mulai yang mana? Comment 1, 2, atau 3. Gue bikinin tutorialnya!",
      "visual_direction": "Scene: Creator sip kopi, relaxed smile | Camera: Medium shot steady | [ACTION: Hold up 3 fingers] | [TEXT POP: \\"1? 2? 3?\\"] | [SFX: Notification ding]",
      "max_words": 17
    },
    {
      "segment_number": 7,
      "segment_type": "LOOP-END",
      "shot_type": "CREATOR",
      "duration": 5,
      "script_text": "Oh iya, gue lupa satu cara lagi...",
      "visual_direction": "Scene: Creator tuang kopi lagi (mirror HOOK) | Camera: Same angle as HOOK → Push-in | [SFX: Rewind] | Seamless loop to HOOK",
      "max_words": 9
    }
  ]
}
\`\`\`

**Why this example works:**
1. Triple Hook: 3 DISTINCT options (curiosity / warning / screen reveal)
2. Pope in Pool: Creator makes coffee throughout (finance = mandatory)
3. Foreshadow: "yang ketiga" tease + "stay sampai akhir" urgency
4. Stakes: copywriting (cool) → video (surprising) → trading bot (mind-blown)
5. PEAK delivers FORE: "cara ketiga" IS the trading bot reveal
6. Editing cues: Every visual_direction has 3-4 cues minimum
7. A-Roll: HOOK + CTA + LOOP-END use camera manipulation on speaker
8. CTA: question_trigger — "comment 1, 2, atau 3"
9. LOOP-END: mirrors HOOK setting + curiosity loop ("satu cara lagi")
10. Density: all sentences ≤12 words (strict) / ≤15 words (BODY)`;
