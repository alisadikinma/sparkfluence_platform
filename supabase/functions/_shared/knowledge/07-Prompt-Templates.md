# Prompt Templates & Production Direction
## DALL-E 3 Image + VEO/Sora Video + Thumbnail

---

## 1. Segment Types & Script Format

### Segment Definitions

| Code | Segment | Duration | Creator Face? |
|------|---------|----------|---------------|
| `HOOK` | Opening grab | 0-5s | ✅ YES |
| `FORE` | Foreshadow | 5-10s | ❌ B-roll |
| `PEAK` | Authority/proof | Variable | ❌ B-roll |
| `BODY-X` | Main content | Variable | ❌ B-roll |
| `TWIST` | Value revelation | Variable | ❌ B-roll |
| `CTA` | Closing action | 5-10s | ✅ YES |
| `LOOP-END` | Seamless loop | 2-3s | ✅ YES |
| `THUMBNAIL` | Static image | — | ✅ YES |

### Per-Segment Script Format
```
*[SEGMENT_TYPE]-[VARIANT]* *ID:[UNIQUE_ID]*
⏱️ [START]—[END]s
🎥 **VISUAL**: [Scene, framing, props — ≤30 words, AI-prompt friendly]
🎙️ "[Script line in Indonesian Gen-Z]"
😲 emotional_label: [Curiosity/Awe/Shock/Intrigue/Resolution/Tension/Relief]
🎬 scene_transition: [Cut/Flash-Cut/Zoom-In/Zoom-Out/Wipe/Fade/Whip-Pan]
```

### Emotion Guide Block (End of Script)
```
**🎭 EMOTION GUIDE**
😀 Expression Intensity: [Low/Medium/High] — [Descriptor]
🌌 Atmosphere: [Mood] — [Lighting/color notes]
🗣️ Delivery Style: [Pacing] — [Tone reference]
👔 Wardrobe: [If established]
```

### Hook Segmentation Rules

| Duration | Action |
|----------|--------|
| ≤5s | **1 segment** (do NOT split) |
| 6-8s | **1 segment** (keep together) |
| >8s | Split ONLY if exceeds platform limit |

---

## 2. DALL-E 3 Image Prompts

### A. Creator Shot (Ali Sadikin)

```
[DALL-E 3 — IMAGE — SHOT X: CREATOR]

A photorealistic cinematic [shot type] of a 37-year-old Indonesian man 
with a bald head and round face shape. Warm skin undertone with natural 
texture and visible pores. Dark brown almond-shaped eyes behind rectangular 
gunmetal semi-rimless glasses. Clean-shaven.

Expression: [from emotion table]
Pose/Action: [description]
Wardrobe: [navy blazer, white open-collar / or specified]

Camera: [CU/MCU/MS], [85/50mm] f/[1.8/2.8], [eye-level/slight low]
Composition: [rule of thirds / centered]

Lighting: [Rembrandt/Loop/Butterfly] lighting, [4:1/2:1] ratio, [3200K/5600K]
Key from [camera left/right], [soft/hard] quality.

Color: [Vision3 500T / Portra 400], [teal-orange / natural] grade
Atmosphere: [light haze / clean]

Environment: [setting description]
Background: [deep bokeh / moderate blur], [elements]

Style: Cinematic photorealistic, natural skin texture, Hollywood production.
Technical: Portrait 1024×1792, HD quality.
Clean frame, no text overlays, no watermarks.
```

### B. B-Roll Shot (No Face)

```
[DALL-E 3 — IMAGE — SHOT X: B-ROLL]

A photorealistic cinematic [shot type] of [subject/scene].
[NO human face — focus on tech, data, environment, product]

Camera: [shot size], [lens]mm f/[aperture], [angle]
Composition: [rule]

Lighting: [pattern/setup], [Kelvin]K
Atmosphere: [type]

Color: [film stock], [grade]
Environment: [full description]

Style: Cinematic, Hollywood production.
Technical: Portrait 1024×1792, HD quality.
Clean frame, no text, no watermarks.
```

### C. Compact Format (Iteration)

```
[SHOT X — IMAGE]
[Shot type] of [subject] [action]. [Expression].
[Lens]mm f/[ap], [angle]. [Lighting] [ratio], [Kelvin]K.
[Film stock], [grade]. [Atmosphere]. Portrait 1024×1792 HD.
```

---

## 3. VEO 3.1 Video Prompts

### A. Full Template

```
[VEO 3.1 — VIDEO — SHOT X]

Duration: ~[N]s (max 8s)
Resolution: 1080p
Aspect: 9:16 vertical

CAMERA MOTION
Movement: [VEO-verified term]
Speed: [slow/medium/fast]

SUBJECT MOTION
[Micro-movements: blinks, breathing, gestures]
[Expression shift if any]

AMBIENT MOTION
[Particles, environmental, light shifts]

AUDIO
Ambient: [specific sound]
Music: [style or "no music"]
Dialogue: [Character] says: "[max 15 words]"
Exclude: no subtitles, no audience sounds, no text overlays

CONTINUITY
Maintain exact lighting, environment, appearance from reference.

TRANSITION
[End instruction]

NEGATIVE
No blurry elements, no distortion, no artifacts.
```

### B. By Shot Type

**Hook:**
```
Duration: ~4-5s, 1080p, 9:16
Camera: Medium-speed dolly push-in toward face, ending CU.
Subject: Direct eye contact. Expression shifts from neutral to intrigue.
Ambient: Single dust particle crossing light beam.
Audio: Brief attention-catching tone. No music, no subtitles.
Transition: End on close-up hold.
```

**Explanation:**
```
Duration: ~8s, 1080p, 9:16
Camera: Static or very gentle drift.
Subject: Natural teaching gestures, hands visible. Regular eye contact.
Ambient: Minimal distraction. Subtle screen shift if visible.
Audio: Clear speaking space. "[Subject] says: '[12-15 words]'" No subtitles.
Transition: Hold final frame.
```

**CTA:**
```
Duration: ~4-6s, 1080p, 9:16
Camera: Static or gentle push-in ending at CU.
Subject: Direct warm eye contact. Genuine smile developing.
Ambient: Clean, warm atmosphere.
Audio: Warm delivery. "[Subject] says: '[8-12 words]'" No subtitles.
Transition: Gentle hold or fade-ready.
```

**B-Roll Product:**
```
Duration: ~4-6s, 1080p, 9:16
Camera: Slow orbit or gentle dolly. Premium speed.
Subject: Product hero, no human. Specular highlights shifting.
Ambient: Floating dust catching light.
Audio: Soft ambient tone. No music, no voice.
Transition: Smooth movement continuing off-frame.
```

### C. Compact Format

```
[SHOT X — VEO]
~[N]s, 1080p, 9:16.
Camera: [movement], [speed].
Subject: [micro-motions].
Ambient: [particles/environmental].
Audio: [ambient], [music], [dialogue if any], no subtitles.
Transition: [end instruction].
```

---

## 4. Sora 2 Video Prompts

### A. Full Template

```
[SORA 2 — VIDEO — SHOT X]

Duration: ~[N]s
Resolution: 1080p
Aspect: 9:16

SCENE ACTION
[What happens from starting image — MOTION only, not appearance]

CINEMATOGRAPHY
Camera: [framing + single movement]
Lens: [focal length + DOF]
Lighting: [key source, fill, temp]
Mood: [emotional tone]

ACTIONS (beat-based)
- [Beat 1]: [action] (0-2s)
- [Beat 2]: [action] (2-4s)
- [Beat 3]: [action] (4-6s)

AUDIO
Ambient: [environmental sound]
Dialogue: "[Character]: [1-2 short lines max]"

EXCLUSIONS
No text on screen, no morphing, no artifacts.
```

### B. Key Rules

- **ONE camera move + ONE action** per shot
- **4s clips > 8s** for quality (stitch in editing)
- Reference image = **first frame anchor**
- Describe **MOTION only** (appearance in image)
- Always use **beat-based timing**

---

## 5. Thumbnail Prompt

```
[DALL-E 3 — THUMBNAIL]

PRIMARY SUBJECT (50-60% of frame):
A 37-year-old Indonesian man with a bald head and round face shape.
Dark brown eyes behind rectangular gunmetal semi-rimless glasses.

Expression: [EXAGGERATED emotion] — wide eyes, raised brows, curiosity gap.
Position: Face positioned [left/right/center].

SECONDARY ELEMENT:
[TOPIC VISUAL] — [description in background/side]

Camera: Tight close-up, 85mm f/1.8, slight dutch tilt (5-10°)
Lighting: High-contrast (Rembrandt/Split), 4:1-6:1 ratio
Color: HIGH SATURATION, teal-orange, Vision3 500T

TEXT ZONES: Reserve [area] for title — keep clear
Technical: Portrait 1024×1792, HD quality, vivid style.
Clean, no text rendered, no watermarks.
```

### Thumbnail Expression × Topic

| Topic | Expression | Visual |
|-------|------------|--------|
| AI jobs | Shock + concern | Robot, code |
| Breakthrough | Awe + excitement | Glowing tech |
| Warning | Serious + urgent | Warning symbols |
| Revelation | Knowing smirk | Hidden element |

---

## 6. Reference System

| Track | Content | Action |
|-------|---------|--------|
| **A (BLOCK)** | Named persons, specific products | Need description/reference |
| **B (PROCEED)** | UIs, logos, charts, abstract | Web search + describe |

**Creator (Ali):** Always available via Character Bible.

---

## 7. Checklists

### DALL-E 3 Image
- [ ] Size: 1024×1792 (portrait)
- [ ] Quality: HD, Style: vivid/natural
- [ ] Character Bible verbatim (creator shots)
- [ ] No negative prompts — positive framing
- [ ] Camera/lens + Film stock + Lighting specs
- [ ] Clean frame, no text overlays

### VEO 3.1 Video
- [ ] Duration ≤8s, 1080p, 9:16
- [ ] Camera movement: VEO-verified term
- [ ] Subject micro-motion (blinks, breathing)
- [ ] Ambient motion (particles, environmental)
- [ ] Audio: Ambient + Music + Dialogue ≤15 words
- [ ] "no subtitles, no audience sounds"
- [ ] Transition instruction
- [ ] NO visual details repeated from image

### Sora 2 Video
- [ ] Duration: prefer 4s, max 20s
- [ ] 1080p, 9:16
- [ ] ONE camera move + ONE action only
- [ ] Beat-based timing included
- [ ] Physics described if needed

### Global Pre-Generation
- [ ] Creator face ONLY in: Hook, CTA, Loop-End, Thumbnail
- [ ] B-roll segments: NO creator face
- [ ] Hook = ONE segment if ≤8s
- [ ] All segments ≤8s (VEO) or ≤20s (Sora)
- [ ] Audio specified for every video prompt
- [ ] Platform selected with rationale

---

## 8. Output Structure

```
1. PRE-GENERATION VERIFICATION
   ├─ Entity scan (Track A/B) → Status
   └─ Platform selection + rationale

2. SEGMENT SUMMARY TABLE
   └─ All segments: timing, duration, type, emotion, platform

3. PER-SEGMENT BLOCKS
   ├─ Shot Breakdown (Creator Face? Platform?)
   ├─ [DALL-E 3 — IMAGE — SHOT X]
   └─ [VEO/SORA — VIDEO — SHOT X]

4. THUMBNAIL PROMPT

5. VISUAL CONTINUITY BIBLE
```

---

*End of Prompt Templates & Production Direction*
