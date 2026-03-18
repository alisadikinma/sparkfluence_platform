/**
 * Emotional Arc — Roller Coaster Intensity Mapping Per Slide Position
 * Ported from ai-image-carousel-prompt-gen plugin (SKILL.md emotional arc section)
 *
 * Used by: generate-carousel-images (all slide types)
 * Provides: per-slide intensity tags, visual treatment rules per beat,
 *           mini-hook placement logic, intensity→visual parameter mapping
 */

export const EMOTIONAL_ARC_KNOWLEDGE = `
## EMOTIONAL ARC VISUAL MAP (MANDATORY Pre-Generation Step)

Before generating individual slide prompts, PLOT the emotional arc for the entire carousel.
Each slide gets an emotional beat and intensity tag. This ensures the carousel feels like a
JOURNEY, not a flat sequence.

---

### THE ROLLER COASTER PATTERN

6/6  HOOK -------+
5/6              |                              +-- CLIMAX
4/6              |              +-- MINI-HOOK --+
3/6              +-- FORESHADOW-+
2/6                             +-- BUILD ------+
1/6                                                    WARM (CTA)
     ---------------------------------------------------------------
     Slide 1   Slide 2    Slide 3-4    Slide 5-7    Slide 8+   Last

---

### BEAT → VISUAL TREATMENT MAPPING

| Beat | Slides | Intensity | Visual Treatment | Camera | Lighting | Color |
|------|--------|-----------|-----------------|--------|----------|-------|
| HIGH | 1 (Hook) | 6/6 | Extreme CU, pattern interrupt scene, creator's most exaggerated expression | CU/MCU, 85mm f/1.8, slight dutch tilt | High contrast 4:1, dramatic key | Peak saturation, strong accent color on power word |
| DIP | 2 (Foreshadow) | 3/6 | Pull back to MCU/MS, tension build composition, partially hidden/blurred elements | MCU/MS, 85mm f/2, eye-level | 3:1, slightly muted key | Restrained palette - warm but held back, building anticipation |
| BUILD | 3-5 (Body) | 2-4/6 | Progressive escalation: each slide slightly more saturated, tighter framing as value increases | Varies, progressively tighter | Progressively brighter, 3:1 to 2:1 | Gradual saturation increase slide-over-slide |
| MINI-HOOK | 5-7 | 5/6 | Sudden change - split panel, extreme angle, color temperature shift, or unexpected composition. "Tapi tunggu..." energy | Extreme angle or split panel or dramatic zoom | Sudden shift - if previous slides were warm, add cool accent | Color temperature disruption - introduce unexpected contrast |
| CLIMAX | 8+ (Reveal) | 6/6 | Widest establishing shot or most intimate close-up (contrast with body), peak saturation, biggest text, most shareable insight | Widest or tightest (contrast with body slides) | Peak drama, 4:1, rim light dominant | Peak saturation, accent color dominant, full visual impact |
| WARM | Last (CTA) | 1/6 | Softest, warmest, most intimate - direct eye contact, inviting expression, connection energy | MCU, 85mm f/2, direct eye-level | Butterfly 2:1, warmest Kelvin (3500K), soft fill | Warmest tone, golden, gentle - "come closer" feeling |

---

### EMOTIONAL INTENSITY SCALE

6/6 = Maximum impact (hook, climax) - highest contrast, saturation, drama
5/6 = High impact (mini-hook) - sudden change, surprise element
4/6 = Rising energy (late body slides) - building toward reveal
3/6 = Tension build (foreshadow, early body) - restrained but anticipatory
2/6 = Foundation (early body slides) - establishing value, steady build
1/6 = Intimate warmth (CTA) - softest, connection-focused

---

### INTENSITY → VISUAL PARAMETER MAPPING

| Intensity | Lighting Ratio | Saturation | Atmosphere Density | Expression Energy | Film Grain |
|-----------|---------------|------------|-------------------|-------------------|------------|
| 1/6 (WARM) | 2:1 butterfly, soft | Natural, golden warmth | Minimal - clean, intimate | Calm smile, warm eye contact | Light, warm Portra tones |
| 2/6 (BUILD) | 2:1 to 3:1, even fill | Slightly below peak | Very light haze | Neutral confidence, engaged | Standard Portra grain |
| 3/6 (DIP) | 3:1, slightly muted | Restrained - held back | Light atmospheric haze | Tension, concern, knowing | Slightly desaturated grain |
| 4/6 (BUILD+) | 3:1 to 4:1, building | Above average | Moderate haze, visible particles | Active engagement, energy rising | Standard grain, warm tones |
| 5/6 (MINI-HOOK) | 4:1, dramatic shift | Sudden boost | Dense volumetric, visible rays | Surprise, dramatic shift | Contrasty grain, cool accent |
| 6/6 (HIGH) | 4:1 to 6:1, peak drama | Maximum saturation | Heavy volumetric, particles, bokeh | Peak exaggerated expression | Heavy dramatic grain |

---

### MINI-HOOK PLACEMENT RULE

Place a mini-hook at slides 5-7 (approximately 60-70% through the carousel) to prevent
mid-carousel drop-off. Exit rates stabilize at 12-15% per slide after slide 4. A mid-carousel
surprise re-engages committed swipers.

Mini-hook triggers (use at least ONE):
- Sudden split-panel composition (if body was single-frame)
- Extreme camera angle change (dutch tilt, bird's eye, worm's eye)
- Color temperature shift (warm to cool accent, then back to warm)
- "Tapi..." or "Plot twist:" headline prefix
- Visual contradiction or unexpected scale comparison

---

### SLIDE POSITION → BEAT ASSIGNMENT

For a 10-slide carousel:
  Slide 1:  HOOK       - HIGH (6/6)
  Slide 2:  FORESHADOW - DIP (3/6)
  Slide 3:  BODY       - BUILD (2/6)
  Slide 4:  BODY       - BUILD (3/6)
  Slide 5:  BODY       - BUILD+ (4/6)
  Slide 6:  BODY       - MINI-HOOK (5/6)
  Slide 7:  BODY       - BUILD+ (4/6)
  Slide 8:  BODY       - CLIMAX (6/6)
  Slide 9:  BODY       - BUILD+ (4/6)
  Slide 10: CTA        - WARM (1/6)

For an 8-slide carousel:
  Slide 1:  HOOK       - HIGH (6/6)
  Slide 2:  FORESHADOW - DIP (3/6)
  Slide 3:  BODY       - BUILD (2/6)
  Slide 4:  BODY       - BUILD (3/6)
  Slide 5:  BODY       - MINI-HOOK (5/6)
  Slide 6:  BODY       - BUILD+ (4/6)
  Slide 7:  BODY       - CLIMAX (6/6)
  Slide 8:  CTA        - WARM (1/6)

For a 5-slide carousel:
  Slide 1:  HOOK       - HIGH (6/6)
  Slide 2:  FORESHADOW - DIP (3/6)
  Slide 3:  BODY       - MINI-HOOK (5/6)
  Slide 4:  BODY       - CLIMAX (6/6)
  Slide 5:  CTA        - WARM (1/6)
`;
